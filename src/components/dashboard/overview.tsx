'use client'

import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const data = [
  {
    name: 'Jan',
    patients: 120,
    revenue: 4000,
  },
  {
    name: 'Feb',
    patients: 150,
    revenue: 5300,
  },
  {
    name: 'Mar',
    patients: 180,
    revenue: 6800,
  },
  {
    name: 'Apr',
    patients: 220,
    revenue: 8100,
  },
  {
    name: 'May',
    patients: 200,
    revenue: 7400,
  },
  {
    name: 'Jun',
    patients: 250,
    revenue: 9200,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={value => `$${value}`}
        />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="patients"
          fill="hsl(var(--chart-1))"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="revenue"
          fill="hsl(var(--chart-2))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
