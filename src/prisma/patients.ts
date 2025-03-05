import { AppointmentStatus, PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())

// A `main` function so that we can use async/await
async function main() {
  // Seed the database with patients
  const patient1 = await prisma.patient.create({
    data: {
      firstName: 'Alice',
      lastName: 'Smith',
      dateOfBirth: new Date('2000-01-01'),
      gender: 'FEMALE',
      phone: '1234567890',
      email: 'alice@example.com',
      address: '123 Main St',
      appointments: {
        create: {
          date: new Date('2024-01-01'),
          status: 'SCHEDULED',
          type: 'CHECKUP',
          doctor: {
            connect: {
              id: 1, // Assuming you have a doctor with id 1
            },
          },
        },
      },
    },
    include: {
      appointments: true,
    },
  })

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
            date: new Date('2024-01-15'),
            status: AppointmentStatus.COMPLETED,
            type: 'FOLLOWUP',
            doctor: {
              connect: {
                id: 1, // Assuming you have a doctor with id 1
              },
            },
          },
          {
            date: new Date('2024-02-01'),
            status: 'SCHEDULED',
            type: 'CHECKUP',
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

  console.log(
    `Created patients: ${patient1.firstName} (${patient1.appointments.length} appointments) and ${patient2.firstName} (${patient2.appointments.length} appointments) `,
  )

  // Retrieve all scheduled appointments
  const scheduledAppointments = await prisma.appointment.findMany({
    where: { status: 'SCHEDULED' },
  })
  console.log(
    `Retrieved all scheduled appointments: ${JSON.stringify(scheduledAppointments)}`,
  )

  // Create a new appointment for an existing patient
  const newAppointment = await prisma.appointment.create({
    data: {
      date: new Date('2024-03-01'),
      status: 'SCHEDULED',
      type: 'CHECKUP',
      patient: {
        connect: {
          id: patient1.id,
        },
      },
      doctor: {
        connect: {
          id: 1, // Assuming you have a doctor with id 1
        },
      },
    },
  })
  console.log(`Created a new appointment: ${JSON.stringify(newAppointment)}`)

  // Update the status of the new appointment
  const updatedAppointment = await prisma.appointment.update({
    where: {
      id: newAppointment.id,
    },
    data: {
      status: AppointmentStatus.SCHEDULED,
    },
  })
  console.log(
    `Updated the status of the new appointment: ${JSON.stringify(updatedAppointment)}`,
  )

  // Retrieve all appointments for a specific patient
  const appointmentsByPatient = await prisma.appointment.findMany({
    where: {
      patientId: patient1.id,
    },
  })
  console.log(
    `Retrieved all appointments for a specific patient: ${JSON.stringify(appointmentsByPatient)}`,
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
