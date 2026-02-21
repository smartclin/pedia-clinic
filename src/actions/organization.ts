'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '../lib/auth/server'
import { uploadFile } from '../lib/storage'
import { prisma } from '../server/db'
import type { Clinic } from '../types/prisma-types'

export async function getClinic() {
	const session = await getSession()

	if (!session || !session.userId) {
		throw new Error('Unauthorized')
	}

	const clinics = await prisma.clinicMember.findMany({
		include: {
			clinic: true,
		},
		where: {
			userId: session.userId,
		},
	})

	return clinics.map((access: { clinic: Clinic }) => access.clinic)
}

export async function getCurrentClinic() {
	const session = await getSession()

	if (!session || !session.userId) {
		throw new Error('Unauthorized')
	}

	// Get user's current clinic (you may need to adjust this based on your org selection logic)
	const access = await prisma.clinicMember.findFirst({
		include: {
			clinic: true,
		},
		where: {
			userId: session.userId,
		},
	})

	return access?.clinic || null
}

const updateClinicSchema = z.object({
	logoFile: z.instanceof(File).optional(),
	name: z.string().min(1, 'Clinic name is required'),
})
interface ClinicState {
	errors?: {
		email?: string[]
		password?: string[]
		name?: string[]
		userRole?: string[]
		root?: string[]
	}
	success?: boolean
	message?: string
}

export async function updateClinic(
	clinicId: string,
	_prevState: ClinicState | undefined,
	formData: FormData
) {
	const session = await getSession()

	if (!session || !session.userId) {
		return { error: 'Unauthorized' }
	}

	// Check if user has access to this clinic
	const access = await prisma.clinicMember.findUnique({
		where: {
			clinicId_userId: {
				clinicId: clinicId,
				userId: session.userId,
			},
		},
	})

	if (!access) {
		return { error: "You don't have access to this clinic" }
	}

	try {
		const data = Object.fromEntries(formData)
		const result = updateClinicSchema.safeParse({
			logoFile: data.logoFile instanceof File ? data.logoFile : undefined,
			name: data.name,
		})

		if (!result.success) {
			return { error: result.error.flatten().fieldErrors }
		}

		let logoUrl: string | undefined

		// Handle logo upload if provided
		if (result.data.logoFile && result.data.logoFile.size > 0) {
			const arrayBuffer = await result.data.logoFile.arrayBuffer()
			const buffer = Buffer.from(arrayBuffer)

			const uploadResult = await uploadFile({
				clinicId: clinicId,
				file: buffer,
				fileName: result.data.logoFile.name,
				isSecure: false, // Clinic logos are typically public
				mimeType: result.data.logoFile.type,
			})

			logoUrl = uploadResult.fileUrl
		}

		// Update clinic
		const updateData: { name: string; logoUrl?: string } = {
			name: result.data.name,
		}

		if (logoUrl) {
			updateData.logoUrl = logoUrl
		}

		await prisma.clinic.update({
			data: updateData,
			where: { id: clinicId },
		})

		revalidatePath('/dashboard/settings')
		return { success: true }
	} catch (error) {
		console.error('Update Clinic error:', error)
		return {
			error: error instanceof Error ? error.message : 'Failed to update clinic',
		}
	}
}
