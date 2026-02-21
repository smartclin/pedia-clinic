import crypto from 'node:crypto'

import { TRPCError } from '@trpc/server'
import { logger } from 'better-auth'
import { z } from 'zod'

import type { Prisma } from '@/prisma/browser'

import {
	deleteFile,
	getBucketName,
	getMinioClient,
	getStorageUrl,
	uploadFile,
} from '../../../lib/storage'
import { prisma } from '../../db'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import {
	createFileAuditLog,
	generateFilePath,
	MAX_FILE_SIZES,
	validateFilePath,
} from '../utils/storage'

export const storageRouter = createTRPCRouter({
	// Direct upload (for small files, typically < 5MB)
	uploadFile: protectedProcedure
		.input(
			z.object({
				bucket: z.string().regex(/^[a-z0-9-]+$/), // Sanitize bucket name
				fileName: z.string().max(255),
				fileContent: z.string(), // Base64 encoded file
				mimeType: z.string().optional(),
				isSecure: z.boolean().default(false),
				tokenExpiryHours: z.number().min(1).max(168).optional(), // 1 hour to 7 days
				clinicId: z.string().optional().nullable(),
				patientId: z.string().optional().nullable(),
				description: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { user, clinic } = ctx

			if (!user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Validate bucket access
			const clinicId = input.clinicId || clinic?.id

			// Check if user has access to this clinic
			if (clinicId && clinicId !== clinic?.id && user.role !== 'SUPER_ADMIN') {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have access to this clinic',
				})
			}

			// Validate file path and extension
			validateFilePath(input.fileName, input.bucket)

			// Check file size from base64
			const fileBuffer = Buffer.from(input.fileContent, 'base64')
			if (
				MAX_FILE_SIZES[input.bucket] &&
				fileBuffer.length > MAX_FILE_SIZES[input.bucket]
			) {
				throw new TRPCError({
					code: 'PAYLOAD_TOO_LARGE',
					message: `File size exceeds maximum allowed (${MAX_FILE_SIZES[input.bucket] / 1024 / 1024}MB)`,
				})
			}

			// Generate unique file path
			const _filePath = generateFilePath(
				input.bucket,
				input.fileName,
				user.id,
				clinicId
			)

			// Upload to MinIO
			const result = await uploadFile({
				file: fileBuffer,
				fileName: input.fileName,
				mimeType: input.mimeType,
				clinicId: clinicId,
				userId: user.id,
				patientId: input.patientId ?? '',
				isSecure: input.isSecure,
				tokenExpiryHours: input.tokenExpiryHours,
			})

			// Create audit log
			await createFileAuditLog(
				'FILE_UPLOAD',
				result.fileStorageId,
				user.id,
				clinicId,
				{
					bucket: input.bucket,
					fileName: input.fileName,
					fileSize: fileBuffer.length,
					isSecure: input.isSecure,
				}
			)

			logger.info('File uploaded successfully', {
				userId: user.id,
				clinicId,
				bucket: input.bucket,
				fileStorageId: result.fileStorageId,
				fileSize: fileBuffer.length,
			})

			return result
		}),

	// Get presigned upload URL (for large files, direct to MinIO)
	getUploadUrl: protectedProcedure
		.input(
			z.object({
				bucket: z.string().regex(/^[a-z0-9-]+$/),
				fileName: z.string().max(255),
				contentType: z.string().optional(),
				fileSize: z.number().optional(),
				clinicId: z.string().optional().nullable(),
				patientId: z.string().optional().nullable(),
				isSecure: z.boolean().default(false),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { user, clinic } = ctx

			if (!user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			// Validate bucket access
			const clinicId = input.clinicId || clinic?.id

			if (clinicId && clinicId !== clinic?.id && user.role !== 'SUPER_ADMIN') {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			// Validate file path and extension
			validateFilePath(input.fileName, input.bucket)

			// Check file size if provided
			if (input.fileSize && MAX_FILE_SIZES[input.bucket]) {
				if (input.fileSize > MAX_FILE_SIZES[input.bucket]) {
					throw new TRPCError({
						code: 'PAYLOAD_TOO_LARGE',
						message: `File size exceeds maximum allowed (${MAX_FILE_SIZES[input.bucket] / 1024 / 1024}MB)`,
					})
				}
			}

			// Generate unique file path
			const filePath = generateFilePath(
				input.bucket,
				input.fileName,
				user.id,
				clinicId
			)

			// Generate presigned URL
			const client = getMinioClient()
			const bucketName = getBucketName()

			const presignedUrl = await client.presignedPutObject(
				bucketName,
				filePath,
				60 * 60 // 1 hour expiry
			)

			// Store metadata in database before upload
			const fileStorage = await prisma.fileStorage.create({
				data: {
					clinicId: clinicId,
					fileName: input.fileName,
					filePath: filePath,
					fileSize: input.fileSize || 0, // Will be updated after upload
					mimeType: input.contentType,
					isSecure: input.isSecure,
					patientId: input.patientId,
					userId: user.id,
					status: 'PENDING',
					uploadExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
				},
			})

			logger.info('Presigned upload URL generated', {
				userId: user.id,
				clinicId,
				bucket: input.bucket,
				fileStorageId: fileStorage.id,
			})

			return {
				presignedUrl,
				fileStorageId: fileStorage.id,
				filePath,
			}
		}),

	// Confirm upload completion (called after successful presigned upload)
	confirmUpload: protectedProcedure
		.input(
			z.object({
				fileStorageId: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { user } = ctx

			const fileStorage = await prisma.fileStorage.findUnique({
				where: { id: input.fileStorageId },
			})

			if (!fileStorage) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'File record not found',
				})
			}

			if (fileStorage.userId !== user.id && user.role !== 'SUPER_ADMIN') {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			// Get actual file size from MinIO
			const client = getMinioClient()
			const bucketName = getBucketName()

			const stat = await client.statObject(bucketName, fileStorage.filePath)

			// Update file record
			const updated = await prisma.fileStorage.update({
				where: { id: input.fileStorageId },
				data: {
					fileSize: stat.size,
					status: 'ACTIVE',
					uploadExpiresAt: null,
				},
			})

			// Create audit log
			await createFileAuditLog(
				'FILE_UPLOAD_COMPLETE',
				fileStorage.id,
				user.id,
				fileStorage.clinicId
			)

			return updated
		}),

	// Get public URL (for non-secure files)
	getPublicUrl: protectedProcedure
		.input(
			z.object({
				fileStorageId: z.string(),
			})
		)
		.query(async ({ ctx, input }) => {
			const { user } = ctx

			if (!user) {
				throw new TRPCError({ code: 'UNAUTHORIZED' })
			}

			const fileStorage = await prisma.fileStorage.findUnique({
				where: { id: input.fileStorageId },
			})

			if (!fileStorage) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' })
			}

			// Check access permissions
			if (fileStorage.isSecure) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Secure files require token-based access',
				})
			}

			if (
				fileStorage.clinicId &&
				fileStorage.clinicId !== ctx.clinic?.id &&
				user.role !== 'SUPER_ADMIN'
			) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			if (fileStorage.userId !== user.id && user.role !== 'SUPER_ADMIN') {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			const storageUrl = getStorageUrl()
			const bucketName = getBucketName()
			const publicUrl = `${storageUrl}/${bucketName}/${fileStorage.filePath}`

			return { publicUrl }
		}),

	// Generate access token for secure file
	generateAccessToken: protectedProcedure
		.input(
			z.object({
				fileStorageId: z.string(),
				expiryHours: z.number().min(1).max(168).default(24), // 1 hour to 7 days
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { user } = ctx

			const fileStorage = await prisma.fileStorage.findUnique({
				where: { id: input.fileStorageId },
			})

			if (!fileStorage) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' })
			}

			// Check permissions
			if (fileStorage.userId !== user.id && user.role !== 'SUPER_ADMIN') {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			// Generate new access token
			const accessToken = crypto.randomBytes(32).toString('hex')
			const tokenExpiry = new Date(
				Date.now() + input.expiryHours * 60 * 60 * 1000
			)

			await prisma.fileStorage.update({
				where: { id: input.fileStorageId },
				data: {
					accessToken,
					tokenExpiry,
				},
			})

			const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
			const fileUrl = `${appUrl}/api/files/${fileStorage.id}?token=${accessToken}`

			logger.info('Access token generated for secure file', {
				userId: user.id,
				fileStorageId: fileStorage.id,
				expiryHours: input.expiryHours,
			})

			return {
				accessToken,
				tokenExpiry,
				fileUrl,
			}
		}),

	// Delete file
	deleteFile: protectedProcedure
		.input(
			z.object({
				fileStorageId: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { user } = ctx

			const fileStorage = await prisma.fileStorage.findUnique({
				where: { id: input.fileStorageId },
			})

			if (!fileStorage) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' })
			}

			// Check permissions
			const isOwner = fileStorage.userId === user.id
			const isClinicAdmin =
				fileStorage.clinicId === ctx.clinic?.id &&
				['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(user.role || '')

			if (!isOwner && !isClinicAdmin && user.role !== 'SUPER_ADMIN') {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			// Delete from MinIO and database
			await deleteFile(input.fileStorageId)

			// Create audit log
			await createFileAuditLog(
				'FILE_DELETE',
				fileStorage.id,
				user.id,
				fileStorage.clinicId,
				{
					fileName: fileStorage.fileName,
					filePath: fileStorage.filePath,
				}
			)

			logger.info('File deleted', {
				userId: user.id,
				fileStorageId: fileStorage.id,
			})

			return { success: true }
		}),

	// List files
	listFiles: protectedProcedure
		.input(
			z.object({
				bucket: z
					.string()
					.regex(/^[a-z0-9-]+$/)
					.optional(),
				clinicId: z.string().optional().nullable(),
				patientId: z.string().optional().nullable(),
				userId: z.string().optional(),
				limit: z.number().min(1).max(100).default(50),
				cursor: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const { user, clinic } = ctx

			// Build where clause based on permissions
			const where: Prisma.FileStorageWhereInput = {}

			// Filter by clinic if specified and user has access
			const clinicId = input.clinicId || clinic?.id
			if (clinicId) {
				if (clinicId !== clinic?.id && user.role !== 'SUPER_ADMIN') {
					throw new TRPCError({ code: 'FORBIDDEN' })
				}
				where.clinicId = clinicId
			}

			// Filter by patient if specified
			if (input.patientId) {
				// Check if user has access to this patient
				const hasAccess = await prisma.patient.findFirst({
					where: {
						id: input.patientId,
						OR: [{ clinicId: clinic?.id }, { userId: user.id }],
					},
				})

				if (!hasAccess && user.role !== 'SUPER_ADMIN') {
					throw new TRPCError({ code: 'FORBIDDEN' })
				}
				where.patientId = input.patientId
			}

			// Filter by user (admins only)
			if (input.userId) {
				if (user.role !== 'SUPER_ADMIN' && user.role !== 'CLINIC_ADMIN') {
					throw new TRPCError({ code: 'FORBIDDEN' })
				}
				where.userId = input.userId
			}

			// Filter by bucket (stored in metadata)
			if (input.bucket) {
				where.metadata = {
					path: ['bucket'],
					equals: input.bucket,
				}
			}

			// If no specific filters, show user's own files
			if (Object.keys(where).length === 0) {
				where.userId = user.id
			}

			const files = await prisma.fileStorage.findMany({
				take: input.limit + 1,
				where,
				orderBy: { createdAt: 'desc' },
				cursor: input.cursor ? { id: input.cursor } : undefined,
				include: {
					patient: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
						},
					},
				},
			})

			let nextCursor: string | undefined
			if (files.length > input.limit) {
				const nextItem = files.pop()
				nextCursor = nextItem?.id
			}

			return {
				files,
				nextCursor,
			}
		}),

	// Get file metadata
	getFileMetadata: protectedProcedure
		.input(
			z.object({
				fileStorageId: z.string(),
			})
		)
		.query(async ({ ctx, input }) => {
			const { user, clinic } = ctx

			const file = await prisma.fileStorage.findUnique({
				where: { id: input.fileStorageId },
				include: {
					patient: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							dateOfBirth: true,
						},
					},
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			})

			if (!file) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' })
			}

			// Check permissions
			const hasAccess =
				file.userId === user.id ||
				(file.clinicId && file.clinicId === clinic?.id) ||
				user.role === 'SUPER_ADMIN'

			if (!hasAccess) {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			return file
		}),

	// Update file metadata
	updateFileMetadata: protectedProcedure
		.input(
			z.object({
				fileStorageId: z.string(),
				description: z.string().optional(),
				tags: z.array(z.string()).optional(),
				isSecure: z.boolean().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { user } = ctx

			const file = await prisma.fileStorage.findUnique({
				where: { id: input.fileStorageId },
			})

			if (!file) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' })
			}

			// Check permissions
			if (file.userId !== user.id && user.role !== 'SUPER_ADMIN') {
				throw new TRPCError({ code: 'FORBIDDEN' })
			}

			const metadata = (file.metadata as Record<string, unknown>) || {}

			const updated = await prisma.fileStorage.update({
				where: { id: input.fileStorageId },
				data: {
					description: input.description,
					isSecure: input.isSecure,
					metadata: {
						...metadata,
						tags: input.tags,
						updatedAt: new Date().toISOString(),
					},
				},
			})

			return updated
		}),
})
