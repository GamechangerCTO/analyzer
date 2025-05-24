'use client'

import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

interface ChartData {
  labels: string[]
  values: number[]
  colors?: string[]
}

interface CallsBarChartProps {
  data: ChartData
  title: string
  height?: number
}

export default function CallsBarChart({ data, title, height = 300 }: CallsBarChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart<"bar"> | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // ניקוי תרשים קודם אם קיים
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const defaultColors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 205, 86, 0.7)',
      'rgba(201, 203, 207, 0.7)'
    ]

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: title,
          data: data.values,
          backgroundColor: data.colors || defaultColors,
          borderColor: data.colors?.map(color => color.replace('0.7', '1')) || 
                        defaultColors.map(color => color.replace('0.7', '1')),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, title])

  return (
    <div style={{ height: `${height}px` }}>
      <canvas ref={chartRef}></canvas>
    </div>
  )
} 