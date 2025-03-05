import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { db } from '@/prisma'

import { Plus } from 'lucide-react'

export default async function MedicalRecordsPage() {
  const medicalRecords = await db.medicalRecord.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      patient: true,
    },
    take: 10,
  })

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Medical Records</h2>
        <Link href="/dashboard/medical-records/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Record
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical Records Management</CardTitle>
          <CardDescription>
            View and manage patient medical records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicalRecords.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.patient.firstName} {record.patient.lastName}
                  </TableCell>
                  <TableCell>{formatDate(record.createdAt)}</TableCell>
                  <TableCell>{record.diagnosis}</TableCell>
                  <TableCell>{record.treatment}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/medical-records/${record.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Link
                        href={`/dashboard/medical-records/${record.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
