'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Phone, 
  Target, 
  Trophy, 
  Calendar
} from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  subtitle?: string
  color: 'primary' | 'accent' | 'success' | 'warning'
  delay?: number
  leafDirection?: 'normal' | 'alt'
}

interface DashboardStatsProps {
  totalCalls: number
  avgScore: number
  successfulCalls: number
  weekCalls: number
  loading?: boolean
}

const StatsCard = ({ title, value, icon, trend, subtitle, color, delay = 0, leafDirection = 'normal' }: StatsCardProps) => {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  // צבעי רקע עדינים - solid colors
  const bgClasses = {
    primary: 'bg-brand-info-light/50',
    accent: 'bg-brand-accent-light/50',
    success: 'bg-green-50',
    warning: 'bg-amber-50'
  }

  // צבעי אייקון
  const iconBgClasses = {
    primary: 'bg-brand-primary text-white',
    accent: 'bg-brand-secondary text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-amber-500 text-white'
  }

  // צורת עלה - normal או alt (הפוך)
  const leafClass = leafDirection === 'normal' 
    ? 'rounded-tl-2xl rounded-br-2xl rounded-tr-lg rounded-bl-lg'
    : 'rounded-tr-2xl rounded-bl-2xl rounded-tl-lg rounded-br-lg'

  return (
    <div className={`
      relative p-6 ${leafClass} ${bgClasses[color]} 
      border border-neutral-200/60
      transition-all duration-300 hover:shadow-md
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      shadow-sm
    `}>
      {/* אייקון מעוצב */}
      <div className={`
        w-12 h-12 rounded-xl ${iconBgClasses[color]}
        flex items-center justify-center mb-4 
        shadow-sm
      `}>
        {icon}
      </div>

      {/* כותרת וערך */}
      <div>
        <h3 className="text-neutral-500 text-sm font-medium mb-1">
          {title}
        </h3>
        
        <div className="flex items-end gap-3 mb-1">
          <span className="text-2xl font-bold text-neutral-900">
            {value}
          </span>
          
          {trend !== undefined && (
            <div className={`
              flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium
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
          <p className="text-neutral-400 text-xs">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

const LoadingCard = ({ delay = 0, leafDirection = 'normal' }: { delay?: number, leafDirection?: 'normal' | 'alt' }) => {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const leafClass = leafDirection === 'normal' 
    ? 'rounded-tl-2xl rounded-br-2xl rounded-tr-lg rounded-bl-lg'
    : 'rounded-tr-2xl rounded-bl-2xl rounded-tl-lg rounded-br-lg'

  return (
    <div className={`
      p-6 ${leafClass} bg-neutral-50
      border border-neutral-200/60
      transition-all duration-300
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      animate-pulse
    `}>
      <div className="w-12 h-12 rounded-xl bg-neutral-200 mb-4" />
      <div className="h-4 bg-neutral-200 rounded mb-2 w-20" />
      <div className="h-6 bg-neutral-200 rounded mb-2 w-14" />
      <div className="h-3 bg-neutral-200 rounded w-28" />
    </div>
  )
}

export default function DashboardStats({ totalCalls, avgScore, successfulCalls, weekCalls, loading }: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <LoadingCard delay={0} leafDirection="normal" />
        <LoadingCard delay={50} leafDirection="alt" />
        <LoadingCard delay={100} leafDirection="normal" />
        <LoadingCard delay={150} leafDirection="alt" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <StatsCard
        title="סה״כ שיחות"
        value={totalCalls}
        icon={<Phone className="w-6 h-6" />}
        subtitle="שיחות שהועלו למערכת"
        color="primary"
        delay={0}
        leafDirection="normal"
      />
      
      <StatsCard
        title="ציון ממוצע"
        value={avgScore > 0 ? avgScore.toFixed(1) : 'אין נתונים'}
        icon={<Target className="w-6 h-6" />}
        trend={avgScore > 8 ? 5 : avgScore > 6 ? 0 : -3}
        subtitle="ביצועים כלליים"
        color="accent"
        delay={50}
        leafDirection="alt"
      />
      
      <StatsCard
        title="שיחות מצוינות"
        value={successfulCalls}
        icon={<Trophy className="w-6 h-6" />}
        subtitle="ציון 8+ מתוך 10"
        color="success"
        delay={100}
        leafDirection="normal"
      />
      
      <StatsCard
        title="השבוע"
        value={weekCalls}
        icon={<Calendar className="w-6 h-6" />}
        trend={weekCalls > 5 ? 12 : weekCalls > 2 ? 3 : -5}
        subtitle="שיחות השבוע האחרון"
        color="warning"
        delay={150}
        leafDirection="alt"
      />
    </div>
  )
}
