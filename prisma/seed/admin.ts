import 'dotenv/config'

import { auth } from '@/lib/auth'
import { prisma } from '@/server/db'

async function seedAdmin() {
	console.log('🌱 Starting admin user, clinic, and doctor profile seed...')

	const adminEmail = 'clinysmar@gmail.com'
	const adminPassword = 'HealthF24'
	const adminName = 'Dr. Ali'
	const adminPhone = '01033022221'
	const clinicName = 'Smart Clinic'

	try {
		// 0️⃣ PRE-SEED CLEANUP
		console.log('🧹 Cleaning up existing admin data...')
		const existingClinic = await prisma.clinic.findFirst({
			where: { name: clinicName },
		})

		if (existingClinic) {
			// Clear memberships and roles first to prevent FK conflicts
			await prisma.clinicMember.deleteMany({
				where: { clinicId: existingClinic.id },
			})
			await prisma.role.deleteMany({ where: { clinicId: existingClinic.id } })
			console.log('🗑️ Cleared existing roles and memberships')
		}

		await prisma.user.deleteMany({ where: { email: adminEmail } })
		console.log(`🗑️ Removed existing user: ${adminEmail}`)

		// 1️⃣ UPSERT CLINIC
		const clinic = await prisma.clinic.upsert({
			where: { name: clinicName },
			update: { isDeleted: false },
			create: {
				name: clinicName,
				address: 'Hurghada, Egypt',
				phone: adminPhone,
				email: adminEmail,
				timezone: 'Africa/Cairo',
			},
		})
		console.log(`🏥 Clinic: ${clinic.name}`)

		// 2️⃣ CREATE ROLES WITH FIXED IDs
		const rolesToSeed = [
			{ id: 'ADMIN', name: 'Admin' },
			{ id: 'DOCTOR', name: 'Doctor' },
			{ id: 'STAFF', name: 'Staff' },
			{ id: 'PATIENT', name: 'Patient' },
		]

		for (const roleData of rolesToSeed) {
			await prisma.role.create({
				data: {
					id: roleData.id,
					name: roleData.name,
					clinicId: clinic.id,
					description: `${roleData.name} role`,
					permissions: roleData.id === 'ADMIN' ? ['*'] : [],
					isSystem: true,
				},
			})
		}
		console.log(
			'🛡️ Roles created with fixed IDs (ADMIN, DOCTOR, STAFF, PATIENT)'
		)

		// 3️⃣ CREATE USER VIA AUTH
		console.log('Creating admin user...')
		const { user: authUser } = await auth.api.createUser({
			body: {
				email: adminEmail,
				password: adminPassword,
				name: adminName,
				role: 'admin',
				data: { role: 'ADMIN', isAdmin: true, phone: adminPhone },
			},
		})

		// 4️⃣ SYNC PRISMA USER
		const user = await prisma.user.update({
			where: { id: authUser.id },
			data: {
				emailVerified: true,
				isAdmin: true,
				role: 'ADMIN',
			},
		})
		console.log(`👨‍💻 User Created: ${user.email}`)

		// 5️⃣ UPSERT DOCTOR PROFILE
		const adminDoctor = await prisma.doctor.upsert({
			where: { userId: user.id },
			update: { clinicId: clinic.id },
			create: {
				email: adminEmail,
				name: adminName,
				appointmentPrice: 300,
				specialty: 'Pediatrician',
				licenseNumber: 'SMART-ADM-001',
				phone: adminPhone,
				clinicId: clinic.id,
				userId: user.id,
			},
		})
		console.log(`👨‍⚕️ Doctor Profile: ${adminDoctor.name}`)

		// 6️⃣ FINAL CLINIC MEMBERSHIP LINK (Use 'ADMIN' string directly)
		await prisma.clinicMember.upsert({
			where: { clinicId_userId: { userId: user.id, clinicId: clinic.id } },
			update: { roleId: 'ADMIN' },
			create: {
				userId: user.id,
				clinicId: clinic.id,
				roleId: 'ADMIN',
			},
		})
		console.log('🔗 Admin linked to clinic with ADMIN role.')

		console.log('✅ Seed process finished successfully')
	} catch (err) {
		console.error('❌ Error during seeding:', err)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

if (import.meta.main) {
	seedAdmin()
}
