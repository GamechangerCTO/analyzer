'use client'

import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

interface LineChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor?: string
    backgroundColor?: string
  }[]
}

interface ProgressLineChartProps {
  data: LineChartData
  title: string
  height?: number
}

export default function ProgressLineChart({ data, title, height = 300 }: ProgressLineChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart<"line"> | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // ניקוי תרשים קודם אם קיים
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const defaultColors = [
      { borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.1)' },
      { borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.1)' },
      { borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.1)' },
      { borderColor: 'rgb(255, 159, 64)', backgroundColor: 'rgba(255, 159, 64, 0.1)' }
    ]

    const datasets = data.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: dataset.borderColor || defaultColors[index % defaultColors.length].borderColor,
      backgroundColor: dataset.backgroundColor || defaultColors[index % defaultColors.length].backgroundColor,
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 6
    }))

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16
            }
          },
          legend: {
            position: 'top',
            align: 'end'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'ציון'
            }
          },
          x: {
            title: {
              display: true,
              text: 'תאריך'
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