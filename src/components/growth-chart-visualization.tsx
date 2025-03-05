'use client'

import { useEffect, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export function GrowthChartVisualization() {
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId')
  const [growthData, setGrowthData] = useState<unknown[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchGrowthData = async () => {
      if (!patientId) {
        // Sample data for demonstration when no patient is selected
        const sampleData = [
          { age: '0', height: 50, weight: 3.5, headCircumference: 35 },
          { age: '2', height: 58, weight: 5.6, headCircumference: 39 },
          { age: '4', height: 64, weight: 7.0, headCircumference: 41 },
          { age: '6', height: 68, weight: 8.0, headCircumference: 43 },
          { age: '9', height: 72, weight: 9.0, headCircumference: 45 },
          { age: '12', height: 76, weight: 10.0, headCircumference: 46 },
          { age: '18', height: 82, weight: 11.5, headCircumference: 47 },
          { age: '24', height: 88, weight: 12.5, headCircumference: 48 },
          { age: '36', height: 96, weight: 14.5, headCircumference: 49 },
          { age: '48', height: 103, weight: 16.5, headCircumference: 50 },
          { age: '60', height: 110, weight: 18.5, headCircumference: 51 },
        ]
        setGrowthData(sampleData)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/growth-charts?patientId=${patientId}`,
        )
        if (response.ok) {
          const data = await response.json()
          setGrowthData(
            data.map(
              (item: {
                measurementDate: string | number | Date
                height: string
                weight: string
                headCircumference: string
              }) => ({
                age: new Date(item.measurementDate).toLocaleDateString(),
                height: Number.parseFloat(item.height),
                weight: Number.parseFloat(item.weight),
                headCircumference: Number.parseFloat(item.headCircumference),
              }),
            ),
          )
        }
      } catch (error) {
        console.error('Failed to fetch growth data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGrowthData()
  }, [patientId])

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading growth data...</div>
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Tabs defaultValue="height-weight">
          <TabsList className="mb-4">
            <TabsTrigger value="height-weight">Height & Weight</TabsTrigger>
            <TabsTrigger value="head-circumference">
              Head Circumference
            </TabsTrigger>
          </TabsList>

          <TabsContent value="height-weight" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={growthData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="age"
                    label={{
                      value: 'Age (months)',
                      position: 'insideBottomRight',
                      offset: -10,
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    label={{
                      value: 'Height (cm)',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{
                      value: 'Weight (kg)',
                      angle: 90,
                      position: 'insideRight',
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="height"
                    stroke="#8884d8"
                    name="Height (cm)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="weight"
                    stroke="#82ca9d"
                    name="Weight (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted-foreground text-center text-sm">
              {patientId
                ? "Patient's growth chart showing height and weight over time"
                : 'Sample growth chart (no patient selected)'}
            </p>
          </TabsContent>

          <TabsContent value="head-circumference" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={growthData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="age"
                    label={{
                      value: 'Age (months)',
                      position: 'insideBottomRight',
                      offset: -10,
                    }}
                  />
                  <YAxis
                    label={{
                      value: 'Head Circumference (cm)',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="headCircumference"
                    stroke="#ff7300"
                    name="Head Circumference (cm)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted-foreground text-center text-sm">
              {patientId
                ? "Patient's head circumference measurements over time"
                : 'Sample head circumference chart (no patient selected)'}
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
