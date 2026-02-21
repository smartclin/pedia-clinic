import crypto from 'node:crypto'

import { Client as MinioClient } from 'minio'
import { v4 as uuidv4 } from 'uuid'

import { prisma } from '../server/db'

// MinIO client singleton
let minioClient: MinioClient | null = null

export function getMinioClient(): MinioClient {
	if (minioClient) {
		return minioClient
	}

	const endpoint = process.env.STORAGE_ENDPOINT || 'localhost'
	const port = Number.parseInt(process.env.STORAGE_PORT || '9000', 10)
	const useSSL = process.env.STORAGE_USE_SSL === 'true'
	const accessKey = process.env.STORAGE_ACCESS_KEY || ''
	const secretKey = process.env.STORAGE_SECRET_KEY || ''
	const bucketName = process.env.STORAGE_BUCKET || 'ims-files'

	if (!accessKey || !secretKey) {
		throw new Error('STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY must be set')
	}

	minioClient = new MinioClient({
		accessKey: accessKey,
		endPoint: endpoint,
		port: port,
		secretKey: secretKey,
		useSSL: useSSL,
	})

	// Ensure bucket exists (async, non-blocking)
	ensureBucketExists(bucketName).catch(err => {
		console.error('Failed to ensure bucket exists:', err)
	})

	return minioClient
}

async function ensureBucketExists(bucketName: string) {
	try {
		const client = getMinioClient()
		const exists = await client.bucketExists(bucketName)
		if (!exists) {
			await client.makeBucket(bucketName, 'us-east-1')
			console.log(`✅ MinIO bucket '${bucketName}' created successfully`)
		} else {
			console.log(`✅ MinIO bucket '${bucketName}' already exists`)
		}
	} catch (error) {
		console.error(
			`❌ Error ensuring MinIO bucket '${bucketName}' exists:`,
			error
		)
		throw error
	}
}

export function getBucketName(): string {
	return process.env.STORAGE_BUCKET || 'ims-files'
}

export function getStorageUrl(): string {
	// Use STORAGE_URL if provided, otherwise construct from endpoint/port
	if (process.env.STORAGE_URL) {
		return process.env.STORAGE_URL
	}

	const endpoint = process.env.STORAGE_ENDPOINT || 'localhost'
	const port = process.env.STORAGE_PORT || '9000'
	const useSSL = process.env.STORAGE_USE_SSL === 'true'
	const protocol = useSSL ? 'https' : 'http'
	return `${protocol}://${endpoint}:${port}`
}

export interface UploadFileOptions {
	file: Buffer
	fileName: string
	mimeType?: string
	patientId?: string
	clinicId?: string
	userId?: string
	isSecure?: boolean
	tokenExpiryHours?: number
}

export interface UploadResult {
	fileStorageId: string
	filePath: string
	fileUrl: string
	accessToken?: string
	tokenExpiry?: Date
}

/**
 * Upload a file to MinIO and store metadata in database
 */
export async function uploadFile(
	options: UploadFileOptions
): Promise<UploadResult> {
	const client = getMinioClient()
	const bucketName = getBucketName()

	// Generate unique file path
	const fileExtension = options.fileName.split('.').pop() || ''
	const uniqueFileName = `${uuidv4()}.${fileExtension}`
	const filePath = options.clinicId
		? `clinics/${options.clinicId}/${uniqueFileName}`
		: options.userId
			? `users/${options.userId}/${uniqueFileName}`
			: `public/${uniqueFileName}`

	// Upload to MinIO
	await client.putObject(
		bucketName,
		filePath,
		options.file,
		options.file.length,
		{
			'Content-Type': options.mimeType || 'application/octet-stream',
		}
	)

	// Generate access token if secure
	let accessToken: string | undefined
	let tokenExpiry: Date | undefined

	if (options.isSecure) {
		accessToken = crypto.randomBytes(32).toString('hex')
		tokenExpiry = new Date(
			Date.now() + (options.tokenExpiryHours || 24) * 60 * 60 * 1000
		)
	}

	// Store metadata in database
	const fileStorage = await prisma.fileStorage.create({
		data: {
			accessToken: accessToken,
			clinicId: options.clinicId,
			fileName: options.fileName,
			filePath: filePath,
			patientId: options.userId,
			fileSize: options.file.length,
			fileType: fileExtension,
			isSecure: options.isSecure || false,
			mimeType: options.mimeType,
			tokenExpiry: tokenExpiry,
			userId: options.userId,
		},
	})

	// Construct file URL
	// For secure files, use the app URL (not storage URL) since they're served through API
	// For public files, use the storage URL directly
	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: 'http://localhost:3000'
	const storageUrl = getStorageUrl()
	const fileUrl = options.isSecure
		? `${appUrl}/api/files/${fileStorage.id}?token=${accessToken}`
		: `${storageUrl}/${bucketName}/${filePath}`

	return {
		accessToken: accessToken,
		filePath: fileStorage.filePath,
		fileStorageId: fileStorage.id,
		fileUrl: fileUrl,
		tokenExpiry: tokenExpiry,
	}
}

/**
 * Get file from MinIO with token validation if secure
 */
export async function getFile(
	fileStorageId: string,
	token?: string
): Promise<{ file: Buffer; mimeType: string; fileName: string }> {
	const fileStorage = await prisma.fileStorage.findUnique({
		where: { id: fileStorageId },
	})

	if (!fileStorage) {
		throw new Error('File not found')
	}

	// Check if file is secure and validate token
	if (fileStorage.isSecure) {
		if (!token || token !== fileStorage.accessToken) {
			throw new Error('Invalid or missing access token')
		}

		// Check token expiry
		if (fileStorage.tokenExpiry && fileStorage.tokenExpiry < new Date()) {
			throw new Error('Access token has expired')
		}
	}

	const client = getMinioClient()
	const bucketName = getBucketName()

	// Get file from MinIO
	const fileStream = await client.getObject(bucketName, fileStorage.filePath)
	const chunks: Buffer[] = []

	for await (const chunk of fileStream) {
		chunks.push(chunk)
	}

	const file = Buffer.concat(chunks)

	return {
		file: file,
		fileName: fileStorage.fileName,
		mimeType: fileStorage.mimeType || 'application/octet-stream',
	}
}

/**
 * Delete file from MinIO and database
 */
export async function deleteFile(fileStorageId: string): Promise<void> {
	const fileStorage = await prisma.fileStorage.findUnique({
		where: { id: fileStorageId },
	})

	if (!fileStorage) {
		throw new Error('File not found')
	}

	const client = getMinioClient()
	const bucketName = getBucketName()

	// Delete from MinIO
	await client.removeObject(bucketName, fileStorage.filePath)

	// Delete from database
	await prisma.fileStorage.delete({
		where: { id: fileStorageId },
	})
}
