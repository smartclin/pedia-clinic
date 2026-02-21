import crypto from 'node:crypto'
import path from 'node:path'

import { TRPCError } from '@trpc/server'
import { logger } from 'better-auth'

import { prisma } from '../../db'

// Allowed file extensions for different buckets
export const ALLOWED_EXTENSIONS: Record<string, string[]> = {
	avatars: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
	documents: ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.md'],
	images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
	medical: ['.pdf', '.jpg', '.jpeg', '.png', '.dcm'], // DICOM for medical images
	lab_results: ['.pdf', '.csv', '.xml'],
	prescriptions: ['.pdf'],
	vaccine_records: ['.pdf', '.jpg', '.png'],
}

// Max file sizes per bucket (in bytes)
export const MAX_FILE_SIZES: Record<string, number> = {
	avatars: 5 * 1024 * 1024, // 5MB
	documents: 10 * 1024 * 1024, // 10MB
	images: 10 * 1024 * 1024, // 10MB
	medical: 50 * 1024 * 1024, // 50MB (medical images can be larger)
	lab_results: 5 * 1024 * 1024, // 5MB
	prescriptions: 2 * 1024 * 1024, // 2MB
	vaccine_records: 10 * 1024 * 1024, // 10MB
}

// Validate and sanitize file path
export function validateFilePath(filePath: string, bucket: string): void {
	// Prevent path traversal attacks
	const normalizedPath = path.normalize(filePath)
	if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Invalid file path',
		})
	}

	// Check file extension if bucket has restrictions
	if (ALLOWED_EXTENSIONS[bucket]) {
		const ext = path.extname(normalizedPath).toLowerCase()
		if (!ALLOWED_EXTENSIONS[bucket].includes(ext)) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `File type ${ext} not allowed for ${bucket} bucket`,
			})
		}
	}

	// Validate filename characters (alphanumeric, dash, underscore, dot)
	const filename = path.basename(normalizedPath)
	if (!/^[a-zA-Z0-9\-_.]+$/.test(filename)) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message:
				'Invalid filename characters. Use only letters, numbers, dashes, underscores, and dots.',
		})
	}
}

// Generate a unique file path
export function generateFilePath(
	bucket: string,
	originalFileName: string,
	userId: string,
	clinicId?: string | null
): string {
	const fileExtension = path.extname(originalFileName)
	const timestamp = Date.now()
	const randomId = crypto.randomBytes(8).toString('hex')
	const safeFileName = `${timestamp}-${randomId}${fileExtension}`

	// Organize by bucket, then by clinic/user for better clinic
	if (clinicId) {
		return `${bucket}/clinic/${clinicId}/${safeFileName}`
	}

	return `${bucket}/user/${userId}/${safeFileName}`
}

// Helper to create audit log
export async function createFileAuditLog(
	action: string,
	fileStorageId: string,
	userId: string,
	clinicId?: string | null,
	metadata?: Record<string, unknown>
) {
	try {
		await prisma.auditLog.create({
			data: {
				action,
				clinicId,
				level: 'info',
				resourceId: fileStorageId,
				model: 'FileStorage',
				metadata: metadata || {},
				userId,
			},
		})
	} catch (error) {
		logger.error('Failed to create audit log for file operation', error)
	}
}
