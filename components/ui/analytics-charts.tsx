'use client'

import React from 'react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts'

interface DailyData {
  date: string
  costs: number
  requests: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

interface ModelData {
  model: string
  requests: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  audioInputTokens: number
  audioOutputTokens: number
}

interface CostBreakdownData {
  lineItem: string
  totalCost: number
  currency: string
}

// Colors for charts
const COLORS = [
  '#4F46E5', // indigo
  '#10B981', // emerald  
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#84CC16', // lime
]

interface DailyCostChartProps {
  data: DailyData[]
}

export function DailyCostChart({ data }: DailyCostChartProps) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value: any) => new Date(value).toLocaleDateString('he-IL', { 
              month: 'short', 
              day: 'numeric' 
            })}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value: any) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">
                      {new Date(label).toLocaleDateString('he-IL', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <div className="space-y-1">
                      <p className="text-indigo-600 font-semibold">
                        עלות: ${payload[0].value?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="costs"
            stroke="#4F46E5"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#costGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface DailyUsageChartProps {
  data: DailyData[]
}

export function DailyUsageChart({ data }: DailyUsageChartProps) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value: any) => new Date(value).toLocaleDateString('he-IL', { 
              month: 'short', 
              day: 'numeric' 
            })}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value: any) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
              return value.toString()
            }}
          />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">
                      {new Date(label).toLocaleDateString('he-IL', { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <div className="space-y-1">
                      <p className="text-emerald-600 font-semibold">
                        Input: {payload[0].value?.toLocaleString()} טוקנים
                      </p>
                      <p className="text-amber-600 font-semibold">
                        Output: {payload[1].value?.toLocaleString()} טוקנים
                      </p>
                      <p className="text-gray-600 font-semibold">
                        סה"כ: {((Number(payload[0].value) || 0) + (Number(payload[1].value) || 0)).toLocaleString()} טוקנים
                      </p>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="inputTokens" stackId="tokens" fill="#10B981" name="Input Tokens" />
          <Bar dataKey="outputTokens" stackId="tokens" fill="#F59E0B" name="Output Tokens" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface ModelBreakdownChartProps {
  data: ModelData[]
}

export function ModelBreakdownChart({ data }: ModelBreakdownChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
    displayName: item.model.length > 20 ? `${item.model.substring(0, 20)}...` : item.model
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ displayName, percent }) => 
              percent > 5 ? `${displayName} (${(percent * 100).toFixed(0)}%)` : ''
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="requests"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">{data.model}</p>
                    <div className="space-y-1">
                      <p className="text-gray-600">
                        בקשות: {data.requests.toLocaleString()}
                      </p>
                      <p className="text-gray-600">
                        טוקנים: {data.totalTokens.toLocaleString()}
                      </p>
                      {data.audioInputTokens > 0 && (
                        <p className="text-blue-600">
                          אודיו: {(data.audioInputTokens + data.audioOutputTokens).toLocaleString()} טוקנים
                        </p>
                      )}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CostBreakdownChartProps {
  data: CostBreakdownData[]
}

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          layout="horizontal"
          margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            type="number"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value: any) => `$${value.toFixed(2)}`}
          />
          <YAxis 
            type="category"
            dataKey="lineItem"
            stroke="#6B7280"
            fontSize={12}
            width={120}
            tickFormatter={(value: any) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
          />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">{label}</p>
                    <p className="text-indigo-600 font-semibold">
                      עלות: ${Number(payload[0].value).toFixed(2)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="totalCost" fill="#4F46E5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface RequestsTimelineChartProps {
  data: DailyData[]
}

export function RequestsTimelineChart({ data }: RequestsTimelineChartProps) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value: any) => new Date(value).toLocaleDateString('he-IL', { 
              month: 'short', 
              day: 'numeric' 
            })}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value: any) => {
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
              return value.toString()
            }}
          />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">
                      {new Date(label).toLocaleDateString('he-IL', { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-purple-600 font-semibold">
                      בקשות: {payload[0].value?.toLocaleString()}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Line
            type="monotone"
            dataKey="requests"
            stroke="#8B5CF6"
            strokeWidth={3}
            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#8B5CF6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 