// server/services/storage.service.ts

import crypto from 'node:crypto'
import type { Readable } from 'node:stream'

import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { cacheLife, cacheTag } from 'next/cache'

import { S3_BUCKET, s3 } from '@/lib/s3'
import { prisma } from '@/server/db'
import { createLogger } from '@/server/utils/logger'

import { cacheService } from './cache.service'

const logger = createLogger('storage')

export interface UploadOptions {
	fileName: string
	file: Buffer | Uint8Array | Blob | string
	mimeType?: string
	patientId?: string
	clinicId?: string
	userId?: string
	isPublic?: boolean
	expiresIn?: number // seconds for presigned URL
}

export interface FileMetadata {
	id: string
	key: string
	url: string
	fileName: string
	fileSize: number
	mimeType: string
	uploadedAt: Date
}

export const storageService = {
	/**
	 * Upload file to S3/MinIO
	 */
	async upload(options: UploadOptions): Promise<FileMetadata> {
		// Generate unique file key
		const fileExtension = options.fileName.split('.').pop() || ''
		const uniqueId = crypto.randomBytes(16).toString('hex')
		const key = options.clinicId
			? `clinics/${options.clinicId}/${uniqueId}.${fileExtension}`
			: options.patientId
				? `patients/${options.patientId}/${uniqueId}.${fileExtension}`
				: `uploads/${uniqueId}.${fileExtension}`

		// Determine content type
		const contentType = options.mimeType || 'application/octet-stream'

		// Upload to S3
		const command = new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: options.file,
			ContentType: contentType,
			Metadata: {
				originalName: options.fileName,
				uploadedBy: options.userId || 'system',
				uploadedAt: new Date().toISOString(),
			},
		})

		await s3.send(command)

		// Generate URL
		const url = options.isPublic
			? `${process.env.STORAGE_PUBLIC_URL}/${S3_BUCKET}/${key}`
			: await this.getPresignedUrl(key, options.expiresIn)

		// Store metadata in database
		const fileStorage = await prisma.fileStorage.create({
			data: {
				filePath: key,
				fileName: options.fileName,
				fileSize:
					options.file instanceof Buffer
						? options.file.length
						: typeof options.file === 'string'
							? Buffer.from(options.file).length
							: options.file instanceof Blob
								? options.file.size
								: (options.file as Uint8Array).length,
				mimeType: contentType,
				patientId: options.patientId,
				clinicId: options.clinicId,
				userId: options.userId,
				isSecure: !options.isPublic,
			},
		})

		// Invalidate cache
		if (options.patientId) {
			await cacheService.invalidateTags([`patient-${options.patientId}-files`])
		}

		logger.info('File uploaded', { key, patientId: options.patientId })

		return {
			id: fileStorage.id,
			key,
			url,
			fileName: options.fileName,
			fileSize: fileStorage.fileSize ?? 0,
			mimeType: contentType,
			uploadedAt: new Date(),
		}
	},

	/**
	 * Generate presigned URL for secure access
	 */
	async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		})

		return getSignedUrl(s3, command, { expiresIn })
	},

	/**
	 * Download file
	 */
	async download(key: string): Promise<{
		stream: Readable | ReadableStream | Blob | undefined
		metadata: {
			contentType?: string
			contentLength?: number
			metadata?: Record<string, string>
		}
	}> {
		const command = new GetObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		})

		const response = await s3.send(command)

		return {
			stream: response.Body,
			metadata: {
				contentType: response.ContentType,
				contentLength: response.ContentLength,
				metadata: response.Metadata,
			},
		}
	},

	/**
	 * Delete file
	 */
	async delete(key: string, patientId?: string): Promise<void> {
		const command = new DeleteObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		})

		await s3.send(command)

		await prisma.fileStorage.deleteMany({
			where: { filePath: key },
		})

		if (patientId) {
			await cacheService.invalidateTags([`patient-${patientId}-files`])
		}

		logger.info('File deleted', { key })
	},

	/**
	 * Get file metadata
	 */
	async getMetadata(key: string): Promise<FileMetadata | null> {
		const fileStorage = await prisma.fileStorage.findFirst({
			where: { filePath: key },
		})

		if (!fileStorage) return null

		return {
			id: fileStorage.id,
			key: fileStorage.filePath,
			url: fileStorage.url || '',
			fileName: fileStorage.fileName,
			fileSize: fileStorage.fileSize ?? 0,
			mimeType: fileStorage.mimeType ?? '',
			uploadedAt: fileStorage.createdAt,
		}
	},

	/**
	 * List files for patient
	 */
	async listPatientFiles(patientId: string): Promise<FileMetadata[]> {
		'use cache'
		cacheLife('minutes')
		cacheTag(`patient-${patientId}-files`)

		const files = await prisma.fileStorage.findMany({
			where: { patientId },
			orderBy: { createdAt: 'desc' },
		})

		return files.map(file => ({
			id: file.id,
			key: file.filePath,
			url: file.url || '',
			fileName: file.fileName,
			fileSize: file.fileSize ?? 0,
			mimeType: file.mimeType ?? '',
			uploadedAt: file.createdAt,
		}))
	},
}
