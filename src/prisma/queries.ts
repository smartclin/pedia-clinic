import { AppointmentStatus, PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())

// A `main` function so that we can use async/await
async function main() {
  // Create a new patient
  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'Alice',
      lastName: 'Smith',
      dateOfBirth: new Date('2000-01-01'),
      gender: 'FEMALE',
      phone: '1234567890',
      email: 'alice@example.com',
      address: '123 Main St',
    },
  })
  console.log(`Created patient: ${JSON.stringify(patient1)}`)

  // Retrieve all patients
  const allPatients = await prisma.patient.findMany()
  console.log(`Retrieved all patients: ${JSON.stringify(allPatients)}`)

  // Create a new patient with appointments
  const patient2 = await prisma.patient.create({
    data: {
      firstName: 'Bob',
      lastName: 'Johnson',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      phone: '9876543210',
      email: 'bob@example.com',
      address: '456 Elm St',
      appointments: {
        create: [
          {
            date: new Date('2024-01-01'),
            status: 'SCHEDULED',
            type: 'CHECKUP',
            doctor: {
              connect: {
                id: 1, // Assuming you have a doctor with id 1
              },
            },
          },
          {
            date: new Date('2024-02-01'),
            status: AppointmentStatus.PENDING,
            type: 'FOLLOWUP',
            doctor: {
              connect: {
                id: 2, // Assuming you have a doctor with id 2
              },
            },
          },
        ],
      },
    },
    include: {
      appointments: true,
    },
  })
  console.log(`Created patient with appointments: ${JSON.stringify(patient2)}`)

  // Retrieve all patients with a specific condition (e.g., by gender)
  const femalePatients = await prisma.patient.findMany({
    where: {
      gender: 'FEMALE',
    },
  })
  console.log(`Retrieved female patients: ${JSON.stringify(femalePatients)}`)

  // Update a patient's details
  const updatedPatient = await prisma.patient.update({
    where: {
      id: patient1.id,
    },
    data: {
      phone: '5555555555',
    },
  })
  console.log(`Updated patient details: ${JSON.stringify(updatedPatient)}`)

  // Retrieve all appointments for a specific patient
  const appointmentsByPatient = await prisma.appointment.findMany({
    where: {
      patientId: patient2.id,
    },
  })
  console.log(
    `Retrieved appointments for a specific patient: ${JSON.stringify(appointmentsByPatient)}`,
  )
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
