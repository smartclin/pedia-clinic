import 'dotenv/config'

import { auth } from '@/lib/auth'
import { prisma } from '@/server/db'

async function seedAdmin() {
  console.log('🌱 Starting admin user, clinic, and doctor profile seed...')

  const adminEmail = 'hazem0302012@gmail.com'
  const adminPassword = 'HealthF26'
  const adminName = 'Dr. Hazem Ali'
  const adminPhone = '01003497579'
  const clinicName = 'Smart Clinic'

  try {
    // 0️⃣ PRE-SEED CLEANUP
    console.log('🧹 Cleaning up existing admin data...')

    // Find and cleanup clinic relationships first
    const existingClinic = await prisma.clinic.findFirst({
      where: { name: clinicName },
    })

    if (existingClinic) {
      // Clear memberships and roles first to prevent FK conflicts
      await prisma.clinicMember.deleteMany({
        where: { clinicId: existingClinic.id },
      })
      await prisma.role.deleteMany({ where: { clinicId: existingClinic.id } })

      // Delete the clinic
      await prisma.clinic.delete({
        where: { id: existingClinic.id },
      })
      console.log('🗑️ Cleared existing clinic and related data')
    }

    // Delete user if exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    if (existingUser) {
      // Delete doctor profile first if exists
      await prisma.doctor.deleteMany({
        where: { userId: existingUser.id },
      })
      // Delete the user
      await prisma.user.delete({
        where: { id: existingUser.id },
      })
      console.log(`🗑️ Removed existing user: ${adminEmail}`)
    }

    // 1️⃣ CREATE CLINIC
    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName,
        address: 'Hurghada, Egypt',
        phone: adminPhone,
        email: adminEmail,
        timezone: 'Africa/Cairo',
      },
    })
    console.log(`🏥 Clinic created: ${clinic.name}`)

    // 2️⃣ CREATE ROLES WITH FIXED IDs
    // 2️⃣ CREATE ROLES WITH PERMISSIONS
    const rolesToSeed = [
      { id: 'ADMIN', name: 'Admin', permissions: ['ALL'] },
      { id: 'DOCTOR', name: 'Doctor', permissions: ['READ_PATIENT', 'WRITE_ENCOUNTER'] },
      { id: 'STAFF', name: 'Staff', permissions: ['READ_PATIENT'] },
      { id: 'PATIENT', name: 'Patient', permissions: ['READ_MY_RECORDS'] },
    ]

    for (const roleData of rolesToSeed) {
      await prisma.role.upsert({
        where: {
          clinicId_name: {
            clinicId: clinic.id,
            name: roleData.name
          }
        },
        update: {
          permissions: roleData.permissions,
        },
        create: {
          // Note: If your schema uses the string ID (e.g. 'ADMIN'), include it here
          // id: roleData.id,
          name: roleData.name,
          clinicId: clinic.id,
          permissions: roleData.permissions
        },
      });
    }
    console.log('🛡️ Roles created and synced with clinic')

    // 3️⃣ CREATE USER VIA AUTH - ONLY USE ONE METHOD
    console.log('Creating admin user...')

    // Use signUpEmail to create the user (this handles password hashing, etc.)
    const createdUser = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
      headers: new Headers({
        'user-agent': 'seed-script',
        'x-forwarded-for': '127.0.0.1',
      }),
    })

    // Get the user from the response
    const authUser = createdUser.user

    console.log(`✅ User created via auth: ${authUser.email}`)

    // 4️⃣ UPDATE USER IN PRISMA WITH ADDITIONAL FIELDS
    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        emailVerified: true,
        isAdmin: true,
        role: 'ADMIN',
        phone: adminPhone,
      },
    })

    console.log(`👨‍💻 User updated in DB: ${user.email}`)

    // 5️⃣ CREATE DOCTOR PROFILE
    const adminDoctor = await prisma.doctor.create({
      data: {
        email: adminEmail,
        name: adminName,
        appointmentPrice: 300,
        specialty: 'Pediatrician',
        licenseNumber: 'SMART-ADM-001',
        phone: adminPhone,
        clinicId: clinic.id,
        userId: user.id,
        isActive: true,
        isDeleted: false,
      },
    })
    console.log(`👨‍⚕️ Doctor Profile created: ${adminDoctor.name}`)

    // 6️⃣ CREATE CLINIC MEMBERSHIP - Use upsert
    await prisma.clinicMember.upsert({
      where: {
        clinicId_userId: {
          userId: user.id,
          clinicId: clinic.id,
        },
      },
      update: {
        roleId: 'ADMIN',
      },
      create: {
        userId: user.id,
        clinicId: clinic.id,
        roleId: 'ADMIN',
      },
    })
    console.log('🔗 Admin linked to clinic with ADMIN role.')

    console.log('✅ Seed process finished successfully')

    // Test sign-in to verify
    console.log('🧪 Testing sign-in...')
    try {
      const signInResult = await auth.api.signInEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
        },
        headers: new Headers({
          'user-agent': 'seed-script-test',
        }),
      })
      console.log('✅ Sign-in test successful for:', signInResult.user.email)
    } catch (signInError) {
      console.error('❌ Sign-in test failed:', signInError)
    }
  } catch (err) {
    console.error('❌ Error during seeding:', err)
    process.exit(1)
  } finally {
    // Disconnect Prisma
    await prisma.$disconnect()

    // Force exit after all operations are complete
    console.log('👋 Seed script completed, exiting...')
    process.exit(0)
  }
}

// Run the seed function and ensure process exits
seedAdmin().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
