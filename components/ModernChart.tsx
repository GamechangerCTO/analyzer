'use client'

import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react'

interface ChartData {
  labels: string[]
  values: number[]
  colors?: string[]
}

interface ModernChartProps {
  data: ChartData
  title: string
  type: 'bar' | 'line' | 'doughnut' | 'radar'
  height?: number
  showTrend?: boolean
  animated?: boolean
}

const glacierColors = {
  primary: ['#B5F9FF', '#87E8F7', '#5DD6ED', '#34C5E3', '#0BB4D9'],
  accent: ['#C9FFEE', '#A7F5E1', '#84EBD4', '#62E1C7', '#40D7BA'],
  success: ['#E2FFE0', '#C8F7C5', '#AEEFAA', '#94E78F', '#7ADF74'],
  warning: ['#FEFFD6', '#FCF5B8', '#FAEB9A', '#F8E17C', '#F6D75E'],
  neutral: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8']
}

export default function ModernChart({ 
  data, 
  title, 
  type, 
  height = 350, 
  showTrend = true,
  animated = true 
}: ModernChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [trendValue, setTrendValue] = useState(0)

  useEffect(() => {
    // אנימציה של כניסה
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // חישוב מגמה
    if (data.values.length >= 2) {
      const recent = data.values.slice(-2)
      const trend = ((recent[1] - recent[0]) / recent[0]) * 100
      setTrendValue(Math.round(trend))
    }
  }, [data.values])

  useEffect(() => {
    if (!chartRef.current || !data.values.length) return

    // ניקוי תרשים קודם
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    // בחירת צבעים לפי סוג הגרף
    const colors = data.colors || glacierColors.primary.slice(0, data.values.length)
    
    const config: any = {
      type,
      data: {
        labels: data.labels,
        datasets: [{
          label: title,
          data: data.values,
          backgroundColor: type === 'line' ? 'rgba(181, 249, 255, 0.1)' : colors.map(color => color + '80'),
          borderColor: type === 'line' ? glacierColors.primary[2] : colors,
          borderWidth: type === 'line' ? 3 : 2,
          fill: type === 'line',
          tension: type === 'line' ? 0.4 : 0,
          pointBackgroundColor: type === 'line' ? glacierColors.primary[2] : undefined,
          pointBorderColor: type === 'line' ? '#ffffff' : undefined,
          pointBorderWidth: type === 'line' ? 2 : undefined,
          pointRadius: type === 'line' ? 6 : undefined,
          pointHoverRadius: type === 'line' ? 8 : undefined,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animated ? {
          duration: 2000,
          easing: 'easeInOutCubic',
          delay: (context: any) => context.dataIndex * 100
        } : false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1e293b',
            bodyColor: '#475569',
            borderColor: glacierColors.primary[2],
            borderWidth: 1,
            cornerRadius: 12,
            displayColors: false,
            padding: 12,
            boxPadding: 6,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            }
          }
        },
        scales: type !== 'doughnut' && type !== 'radar' ? {
          x: {
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 12
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(181, 249, 255, 0.2)',
              drawBorder: false
            },
            border: {
              display: false
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 12
              }
            }
          }
        } : undefined,
        elements: {
          bar: {
            borderRadius: 8
          },
          point: {
            hoverBackgroundColor: glacierColors.primary[2]
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    }

    chartInstance.current = new Chart(ctx, config)

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, title, type, animated])

  const getChartIcon = () => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="w-5 h-5" />
      case 'line':
        return <Activity className="w-5 h-5" />
      case 'doughnut':
        return <PieChart className="w-5 h-5" />
      default:
        return <BarChart3 className="w-5 h-5" />
    }
  }

  if (!data.values.length) {
    return (
      <div className={`
        bg-gradient-to-br from-glacier-neutral-50 to-glacier-neutral-100 
        border border-glacier-neutral-200/50 rounded-3xl p-6
        transform transition-all duration-500
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}>
        <div className="flex items-center justify-center h-64 text-glacier-neutral-400">
          <div className="text-center">
            {getChartIcon()}
            <p className="mt-2 text-sm">אין נתונים להצגה</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`
      group bg-white/80 backdrop-blur-md border border-glacier-neutral-200/50 
      rounded-3xl p-6 shadow-glacier-soft hover:shadow-glacier-hover
      transform transition-all duration-500 hover:-translate-y-1
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      overflow-hidden relative
    `}>
      {/* אפקט gradient ברקע */}
      <div className="absolute inset-0 bg-gradient-to-br from-glacier-primary-50/50 via-transparent to-glacier-accent-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* כותרת עם אייקון ומגמה */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-glacier-primary-400 to-glacier-primary-600 flex items-center justify-center text-white shadow-glacier-soft">
            {getChartIcon()}
          </div>
          <h3 className="text-lg font-bold text-glacier-neutral-900 group-hover:text-glacier-primary-700 transition-colors">
            {title}
          </h3>
        </div>
        
        {showTrend && trendValue !== 0 && (
          <div className={`
            flex items-center gap-1 px-3 py-1 rounded-xl text-sm font-medium
            ${trendValue >= 0 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
            }
          `}>
            <TrendingUp className={`w-4 h-4 ${trendValue < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trendValue)}%
          </div>
        )}
      </div>

      {/* אזור הגרף */}
      <div className="relative" style={{ height: `${height}px` }}>
        <canvas 
          ref={chartRef}
          className="w-full h-full"
        />
        
        {/* אפקט זוהר */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-glacier-primary-200/30 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-br from-glacier-accent-200/30 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-200" />
        </div>
      </div>

      {/* מידע נוסף */}
      {data.values.length > 0 && (
        <div className="relative mt-4 pt-4 border-t border-glacier-neutral-200/50">
          <div className="flex items-center justify-between text-sm text-glacier-neutral-600">
            <span>סה״כ נקודות נתונים: {data.values.length}</span>
            <span>
              {type === 'bar' || type === 'line' 
                ? `מקסימום: ${Math.max(...data.values)}` 
                : `סה״כ: ${data.values.reduce((a, b) => a + b, 0)}`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  )
} 