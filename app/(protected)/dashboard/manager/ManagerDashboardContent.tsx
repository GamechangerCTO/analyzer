'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users, 
  Phone, 
  BarChart3, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  UserPlus,
  Eye,
  Battery,
  Award,
  Target,
  Activity,
  Bell,
  Settings,
  ChevronUp,
  ChevronDown,
  CreditCard
} from 'lucide-react';

// Types
interface ManagerStats {
  totalAgents: number;
  weeklyCalls: number;
  avgScore: number;
  successfulCalls: number;
  todayCalls: number;
  yesterdayCalls: number;
}

interface AgentData {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  totalCalls: number;
  weeklyCalls: number;
  avgScore: number;
  lastCallDate: string | null;
  activityStatus: 'active' | 'moderate' | 'inactive';
}

interface MinutesQuota {
  totalMinutes: number;
  usedMinutes: number;
  availableMinutes: number;
  isPoc: boolean;
  canPurchaseAdditional: boolean;
}

interface AIInsight {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  actionText?: string;
  actionUrl?: string;
}

// Smart KPI Card Component
interface SmartKPICardProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
  trend?: number;
  format?: 'number' | 'percentage' | 'currency';
  subtitle?: string;
}

const SmartKPICard: React.FC<SmartKPICardProps> = ({ 
  icon: Icon, 
  title, 
  value, 
  trend, 
  format = 'number',
  subtitle 
}) => {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percentage':
        return `${val}%`;
      case 'currency':
        return `₪${val.toLocaleString()}`;
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (trend === undefined) return <Minus className="w-4 h-4 text-gray-400" />;
    if (trend > 0) return <ChevronUp className="w-4 h-4 text-emerald-500" />;
    if (trend < 0) return <ChevronDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return 'text-gray-400';
    if (trend > 0) return 'text-emerald-500';
    if (trend < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white rounded-3xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-100 group cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl bg-gray-50 group-hover:bg-blue-50 transition-colors">
          <Icon className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
        </div>
        {trend !== undefined && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
        <p className="text-sm text-gray-500">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// AI Insight Card Component
interface AIInsightCardProps {
  insight: AIInsight;
}

const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info':
        return <Activity className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (insight.type) {
      case 'success':
        return 'border-emerald-200';
      case 'warning':
        return 'border-amber-200';
      case 'info':
        return 'border-blue-200';
    }
  };

  return (
    <div className={`bg-white rounded-2xl p-5 border-2 ${getBorderColor()} hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{insight.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{insight.description}</p>
          {insight.actionText && (
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 hover:underline">
              {insight.actionText} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Agent Status Card Component
interface AgentStatusCardProps {
  agent: AgentData;
}

const AgentStatusCard: React.FC<AgentStatusCardProps> = ({ agent }) => {
  const getStatusColor = () => {
    switch (agent.activityStatus) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700';
      case 'moderate':
        return 'bg-amber-100 text-amber-700';
      case 'inactive':
        return 'bg-red-100 text-red-700';
    }
  };

  const getStatusText = () => {
    switch (agent.activityStatus) {
      case 'active':
        return 'פעיל';
      case 'moderate':
        return 'בינוני';
      case 'inactive':
        return 'לא פעיל';
    }
  };

  const getTrendArrow = () => {
    if (agent.avgScore >= 7) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (agent.avgScore >= 5) return <Minus className="w-4 h-4 text-amber-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
            {agent.fullName.charAt(0)}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{agent.fullName}</h4>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>
        {getTrendArrow()}
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-gray-900">{agent.weeklyCalls}</p>
          <p className="text-xs text-gray-500">השבוע</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{agent.totalCalls}</p>
          <p className="text-xs text-gray-500">סה"כ</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{agent.avgScore || 0}</p>
          <p className="text-xs text-gray-500">ציון</p>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function ManagerDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [quota, setQuota] = useState<MinutesQuota | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  // Generate AI insights based on real data
  const generateAIInsights = (stats: ManagerStats, agents: AgentData[], quota: MinutesQuota): AIInsight[] => {
    const insights: AIInsight[] = [];

    // Performance insight
    if (stats.avgScore >= 7) {
      insights.push({
        id: '1',
        type: 'success',
        title: 'ביצועים מעולים השבוע!',
        description: `הצוות שלך השיג ציון ממוצע של ${stats.avgScore} השבוע. זה שיפור משמעותי!`,
        actionText: 'צפה בדוח מפורט',
        actionUrl: '/dashboard/calls'
      });
    } else if (stats.avgScore < 5) {
      insights.push({
        id: '1',
        type: 'warning',
        title: 'הזדמנות לשיפור',
        description: `הציון הממוצע השבוע הוא ${stats.avgScore}. מומלץ לקיים הדרכה או לבדוק את השיחות האחרונות.`,
        actionText: 'צפה בשיחות לשיפור',
        actionUrl: '/dashboard/calls'
      });
    }

    // Quota insight
    const quotaUsagePercent = Math.round((quota.usedMinutes / quota.totalMinutes) * 100);
    if (quotaUsagePercent >= 80) {
      insights.push({
        id: '2',
        type: 'warning',
        title: 'מכסת הדקות מתמלאת',
        description: `השתמשת ב-${quotaUsagePercent}% מהמכסה החודשית. כדאי לשקול הגדלת המכסה.`,
        actionText: 'הגדל מכסה',
        actionUrl: '/dashboard/subscription'
      });
    } else if (quotaUsagePercent < 30) {
      insights.push({
        id: '2',
        type: 'info',
        title: 'מכסת דקות יעילה',
        description: `השתמשת רק ב-${quotaUsagePercent}% מהמכסה. ניצול יעיל של המשאבים!`,
      });
    }

    // Team activity insight
    const activeAgents = agents.filter(a => a.activityStatus === 'active').length;
    if (activeAgents === agents.length && agents.length > 0) {
      insights.push({
        id: '3',
        type: 'success',
        title: 'הצוות פעיל ומעורב',
        description: `כל ${agents.length} הנציגים שלך היו פעילים השבוע. מעולה!`,
      });
    } else if (activeAgents < agents.length / 2) {
      insights.push({
        id: '3',
        type: 'warning',
        title: 'פעילות נמוכה בצוות',
        description: `רק ${activeAgents} מתוך ${agents.length} נציגים היו פעילים השבוע.`,
        actionText: 'בדוק פעילות הצוות',
        actionUrl: '/dashboard/team'
      });
    }

    return insights.slice(0, 3); // Return max 3 insights
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Get user details
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (!userData) return;
      setUser(userData);

      const companyId = userData.company_id;

      // Fetch stats
      const { data: statsData } = await supabase.rpc('get_manager_dashboard_stats', {
        company_uuid: companyId
      });

      if (statsData && statsData.length > 0) {
        const stats = statsData[0];
        setStats({
          totalAgents: parseInt(stats.total_agents) || 0,
          weeklyCalls: parseInt(stats.weekly_calls) || 0,
          avgScore: parseFloat(stats.avg_score_weekly) || 0,
          successfulCalls: parseInt(stats.successful_calls_weekly) || 0,
          todayCalls: parseInt(stats.today_calls) || 0,
          yesterdayCalls: parseInt(stats.yesterday_calls) || 0
        });
      }

      // Fetch agents
      const { data: agentsData } = await supabase.rpc('get_company_agents_performance', {
        company_uuid: companyId
      });

      if (agentsData) {
        setAgents(agentsData.map((agent: any) => ({
          id: agent.id,
          fullName: agent.full_name,
          avatarUrl: agent.avatar_url,
          totalCalls: parseInt(agent.total_calls) || 0,
          weeklyCalls: parseInt(agent.weekly_calls) || 0,
          avgScore: parseFloat(agent.avg_score) || 0,
          lastCallDate: agent.last_call_date,
          activityStatus: agent.activity_status || 'inactive'
        })));
      }

      // Fetch quota
      const { data: quotaData } = await supabase
        .from('company_minutes_quotas')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (quotaData) {
        setQuota({
          totalMinutes: quotaData.total_minutes,
          usedMinutes: quotaData.used_minutes,
          availableMinutes: quotaData.available_minutes,
          isPoc: quotaData.is_poc,
          canPurchaseAdditional: quotaData.can_purchase_additional
        });
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Generate AI insights when data is loaded
  useEffect(() => {
    if (stats && agents.length > 0 && quota) {
      setAiInsights(generateAIInsights(stats, agents, quota));
    }
  }, [stats, agents, quota]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-3xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
                ))}
              </div>
              <div className="space-y-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !quota) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">שגיאה בטעינת הנתונים</h2>
          <p className="text-gray-600">נסה לרענן את הדף</p>
        </div>
      </div>
    );
  }

  const quotaPercentage = Math.round((quota.usedMinutes / quota.totalMinutes) * 100);
  const todayVsYesterday = stats.yesterdayCalls > 0 
    ? Math.round(((stats.todayCalls - stats.yesterdayCalls) / stats.yesterdayCalls) * 100)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              שלום, {user?.full_name || 'מנהל'} 👋
            </h1>
            <p className="text-gray-600 mt-1">הנה המצב העדכני של הצוות שלך</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Settings className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0) || 'M'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* AI Insights */}
        {aiInsights.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 ml-2 text-blue-600" />
              תובנות חכמות
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiInsights.map((insight) => (
                <AIInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SmartKPICard
            icon={Users}
            title="סה״כ נציגים"
            value={stats.totalAgents}
            subtitle="נציגים פעילים"
          />
          <SmartKPICard
            icon={Phone}
            title="שיחות השבוע"
            value={stats.weeklyCalls}
            trend={todayVsYesterday}
            subtitle="בהשוואה לאתמול"
          />
          <SmartKPICard
            icon={BarChart3}
            title="ציון ממוצע"
            value={stats.avgScore}
            format="number"
            subtitle="השבוע האחרון"
          />
          <SmartKPICard
            icon={CheckCircle}
            title="שיחות מוצלחות"
            value={stats.successfulCalls}
            subtitle="ציון מעל 7"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Team Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Members */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 ml-2 text-blue-600" />
                  סקירת הצוות
                </h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  צפה בכולם →
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => (
                  <AgentStatusCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 ml-2 text-blue-600" />
                פעולות מהירות
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center space-x-3 p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">הוסף נציג</span>
                </button>
                <button className="flex items-center justify-center space-x-3 p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors">
                  <Eye className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">צפה בשיחות</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Minutes Quota */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Battery className="w-5 h-5 ml-2 text-blue-600" />
                מכסת דקות
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">שימוש נוכחי</span>
                  <span className="font-semibold text-gray-900">{quotaPercentage}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      quotaPercentage >= 90 ? 'bg-red-500' :
                      quotaPercentage >= 70 ? 'bg-amber-500' : 
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{quota.usedMinutes} דקות</span>
                  <span className="text-gray-600">{quota.totalMinutes} דקות</span>
                </div>
                
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    נותרו <span className="font-semibold text-gray-900">{quota.availableMinutes}</span> דקות
                  </p>
                  
                  {quotaPercentage >= 75 && (
                    <div className="mt-4">
                      <button
                        onClick={() => router.push('/team/purchase-quota')}
                        className={`w-full py-2 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                          quotaPercentage >= 90 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>רכישת דקות נוספות</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 ml-2 text-blue-600" />
                סיכום ביצועים
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">שיחות השבוע</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{stats.weeklyCalls}</span>
                    {todayVsYesterday !== undefined && (
                      <span className={`text-xs flex items-center ${
                        todayVsYesterday > 0 ? 'text-emerald-600' : 
                        todayVsYesterday < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {todayVsYesterday > 0 ? <TrendingUp className="w-3 h-3" /> : 
                         todayVsYesterday < 0 ? <TrendingDown className="w-3 h-3" /> : 
                         <Minus className="w-3 h-3" />}
                        {Math.abs(todayVsYesterday)}%
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">ציון ממוצע</span>
                  <span className="font-semibold text-gray-900">{stats.avgScore}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">שיחות מוצלחות</span>
                  <span className="font-semibold text-gray-900">{stats.successfulCalls}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 