'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Phone, 
  Target, 
  Trophy, 
  Calendar,
  BarChart3,
  Zap,
  Star,
  Award
} from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  subtitle?: string
  color: 'primary' | 'accent' | 'success' | 'warning'
  delay?: number
  borderRadius?: string
}

interface DashboardStatsProps {
  totalCalls: number
  avgScore: number
  successfulCalls: number
  weekCalls: number
  loading?: boolean
}

const StatsCard = ({ title, value, icon, trend, subtitle, color, delay = 0, borderRadius = 'rounded-3xl' }: StatsCardProps) => {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const colorClasses = {
    primary: 'from-glacier-primary-400 to-glacier-primary-600 text-white',
    accent: 'from-glacier-accent-400 to-glacier-accent-600 text-white',
    success: 'from-green-400 to-green-600 text-white',
    warning: 'from-amber-400 to-amber-600 text-white'
  }

  const bgClasses = {
    primary: 'bg-gradient-to-br from-glacier-primary-50 to-glacier-primary-100',
    accent: 'bg-gradient-to-br from-glacier-accent-50 to-glacier-accent-100',
    success: 'bg-gradient-to-br from-green-50 to-green-100',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100'
  }

  return (
    <div className={`
      group relative p-6 ${borderRadius} ${bgClasses[color]} 
      border border-glacier-neutral-200/50 backdrop-blur-sm
      transform transition-all duration-500 hover:scale-105 hover:-translate-y-2
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      shadow-glacier-soft hover:shadow-glacier-hover
      overflow-hidden
    `}>
      {/* אנימציה של gradient ברקע */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* אייקון מעוצב */}
      <div className={`
        relative w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses[color]}
        flex items-center justify-center mb-4 
        transform transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110
        shadow-glacier-soft
      `}>
        {icon}
        
        {/* אפקט זוהר */}
        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* כותרת וערך */}
      <div className="relative">
        <h3 className="text-glacier-neutral-600 text-sm font-medium mb-2 group-hover:text-glacier-neutral-700 transition-colors">
          {title}
        </h3>
        
        <div className="flex items-end gap-3 mb-2">
          <span className="text-3xl font-bold text-glacier-neutral-900 group-hover:text-glacier-primary-700 transition-colors">
            {value}
          </span>
          
          {trend !== undefined && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
              ${trend >= 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
              }
            `}>
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        {subtitle && (
          <p className="text-glacier-neutral-500 text-xs">
            {subtitle}
          </p>
        )}
      </div>

      {/* אפקט מעגל זוהר */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  )
}

const LoadingCard = ({ delay = 0 }: { delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div className={`
      p-6 rounded-3xl bg-gradient-to-br from-glacier-neutral-50 to-glacier-neutral-100 
      border border-glacier-neutral-200/50 backdrop-blur-sm
      transform transition-all duration-500
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      animate-pulse
    `}>
      <div className="w-16 h-16 rounded-2xl bg-glacier-neutral-200 mb-4" />
      <div className="h-4 bg-glacier-neutral-200 rounded-lg mb-2 w-24" />
      <div className="h-8 bg-glacier-neutral-200 rounded-lg mb-2 w-16" />
      <div className="h-3 bg-glacier-neutral-200 rounded-lg w-32" />
    </div>
  )
}

export default function DashboardStats({ totalCalls, avgScore, successfulCalls, weekCalls, loading }: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <LoadingCard delay={0} />
        <LoadingCard delay={100} />
        <LoadingCard delay={200} />
        <LoadingCard delay={300} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="סה״כ שיחות"
        value={totalCalls}
        icon={<Phone className="w-8 h-8" />}
        subtitle="שיחות שהועלו למערכת"
        color="primary"
        delay={0}
        borderRadius="rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md"
      />
      
      <StatsCard
        title="ציון ממוצע"
        value={avgScore > 0 ? avgScore.toFixed(1) : 'אין נתונים'}
        icon={<Target className="w-8 h-8" />}
        trend={avgScore > 8 ? 5 : avgScore > 6 ? 0 : -3}
        subtitle="ביצועים כלליים"
        color="accent"
        delay={100}
        borderRadius="rounded-tr-3xl rounded-bl-3xl rounded-tl-md rounded-br-md"
      />
      
      <StatsCard
        title="שיחות מצוינות"
        value={successfulCalls}
        icon={<Trophy className="w-8 h-8" />}
        subtitle="ציון 8+ מתוך 10"
        color="success"
        delay={200}
        borderRadius="rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md"
      />
      
      <StatsCard
        title="השבוע"
        value={weekCalls}
        icon={<Calendar className="w-8 h-8" />}
        trend={weekCalls > 5 ? 12 : weekCalls > 2 ? 3 : -5}
        subtitle="שיחות השבוע האחרון"
        color="warning"
        delay={300}
        borderRadius="rounded-tr-3xl rounded-bl-3xl rounded-tl-md rounded-br-md"
      />
    </div>
  )
} 