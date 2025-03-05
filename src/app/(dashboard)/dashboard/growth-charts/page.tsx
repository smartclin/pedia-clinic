import { GrowthChartVisualization } from '@/components/growth-chart-visualization'
import { PatientGrowthSelector } from '@/components/patient-growth-selector'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { db } from '@/prisma'

export default async function GrowthChartsPage() {
  const patients = await db.patient
    .findMany({
      orderBy: {
        lastName: 'asc',
      },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        // Add other fields as needed
      },
    })
    .then(patients =>
      patients.map(patient => ({ ...patient, id: patient.id.toString() })),
    )

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Growth Charts</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Growth Tracking</CardTitle>
          <CardDescription>
            Monitor and visualize patient growth metrics over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientGrowthSelector patients={patients} />
          <div className="mt-6">
            <GrowthChartVisualization />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
