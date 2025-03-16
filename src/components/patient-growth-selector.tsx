'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'


import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Patient {
  id: number
  firstName: string
  lastName: string
}

interface PatientGrowthSelectorProps {
  patients: Patient[]
}

export function PatientGrowthSelector({
  patients,
}: PatientGrowthSelectorProps) {
  const router = useRouter()
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [selectedChart, setSelectedChart] = useState<string>('height-weight')

  const handleViewChart = () => {
    if (selectedPatient) {
      router.push(
        `/dashboard/growth-charts/${selectedPatient}?chart=${selectedChart}`,
      )
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="patient">Select Patient</Label>
        <Select onValueChange={setSelectedPatient} value={selectedPatient}>
          <SelectTrigger id="patient">
            <SelectValue placeholder="Select patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map(patient => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="chart-type">Chart Type</Label>
        <Select onValueChange={setSelectedChart} value={selectedChart}>
          <SelectTrigger id="chart-type">
            <SelectValue placeholder="Select chart type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="height-weight">Height & Weight</SelectItem>
            <SelectItem value="head-circumference">
              Head Circumference
            </SelectItem>
            <SelectItem value="bmi">BMI</SelectItem>
            <SelectItem value="percentiles">Percentiles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button onClick={handleViewChart} disabled={!selectedPatient}>
          View Growth Chart
        </Button>
      </div>
    </div>
  )
}
