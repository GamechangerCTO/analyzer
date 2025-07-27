'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  CreditCard,
  Calendar,
  User,
  ArrowRight,
  Star
} from 'lucide-react';

// קומפוננט טבלת נתונים מתקדמת
import AdvancedDataTable from '@/components/AdvancedDataTable';

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
  email: string;
  totalCalls: number;
  weeklyCalls: number;
  avgScore: number;
  lastCallDate: string | null;
  activityStatus: 'active' | 'moderate' | 'inactive';
  role: string;
  isApproved: boolean | null;
  createdAt: string;
}

interface MinutesQuota {
  totalMinutes: number;
  usedMinutes: number;
  availableMinutes: number;
  isPoc: boolean;
  canPurchaseAdditional: boolean;
}

interface Insight {
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
    <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-2xl shadow-glacier-soft p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-2xl bg-glacier-primary-50 group-hover:bg-glacier-primary-100 transition-colors">
          <Icon className="w-6 h-6 text-glacier-primary-600 group-hover:text-glacier-primary-700" />
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
        <p className="text-2xl font-bold text-glacier-neutral-900">{formatValue(value)}</p>
        <p className="text-sm text-glacier-neutral-500">{title}</p>
        {subtitle && (
          <p className="text-xs text-glacier-neutral-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// WelcomeHero Component for Manager
interface WelcomeHeroProps {
  managerInfo: {
    full_name: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
  companyName?: string;
}

const WelcomeHero: React.FC<WelcomeHeroProps> = ({ managerInfo, companyName }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'בוקר טוב';
    if (hour < 17) return 'צהריים טובים';
    if (hour < 21) return 'ערב טוב';
    return 'לילה טוב';
  };

  return (
    <div className="bg-gradient-to-br from-glacier-primary-600 via-glacier-primary-700 to-glacier-accent-600 rounded-3xl p-8 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white font-bold text-2xl">
              {managerInfo?.full_name?.charAt(0) || 'M'}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {managerInfo?.full_name || 'מנהל'}! 👋
            </h1>
            <p className="text-glacier-primary-100 text-lg">
              ברוך הבא לדשבורד הניהול של {companyName || 'החברה'}
            </p>
            <p className="text-glacier-primary-200 text-sm mt-1">
              עקוב אחר ביצועי הצוות, נהל נציגים וקבל תובנות מתקדמות
            </p>
          </div>
        </div>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-8 h-8 text-white" />
          </div>
          <p className="text-glacier-primary-100 text-sm">דשבורד מנהל</p>
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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [user, setUser] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string>('');
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        // Get user details
        const { data: userData } = await supabase
          .from('users')
          .select('*, companies(name)')
          .eq('id', currentUser.id)
          .single();

        if (userData) {
          setUser(userData);
          setCompanyName(userData.companies?.name || '');
        }

        // Get company agents
        const { data: agentsData } = await supabase
          .from('users')
          .select('*')
          .eq('company_id', userData.company_id)
          .in('role', ['agent', 'manager', 'owner'])
          .order('created_at', { ascending: false });

        if (agentsData) {
          // Add performance data for each agent
          const agentsWithStats = await Promise.all(
            agentsData.map(async (agent) => {
              // Get calls data
              const { data: callsData } = await supabase
                .from('calls')
                .select('id, overall_score, created_at')
                .eq('user_id', agent.id);

              const totalCalls = callsData?.length || 0;
              
              // Weekly calls
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              const weeklyCalls = callsData?.filter(call => 
                new Date(call.created_at) >= oneWeekAgo
              ).length || 0;

              // Average score
              const callsWithScore = callsData?.filter(call => call.overall_score !== null) || [];
              const avgScore = callsWithScore.length > 0 
                ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
                : 0;

              // Last call date
              const lastCallDate = callsData && callsData.length > 0 
                ? callsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
                : null;

              // Activity status
              let activityStatus: 'active' | 'moderate' | 'inactive' = 'inactive';
              if (weeklyCalls >= 10) activityStatus = 'active';
              else if (weeklyCalls >= 3) activityStatus = 'moderate';

              return {
                id: agent.id,
                fullName: agent.full_name || '',
                avatarUrl: agent.avatar_url,
                email: agent.email || '',
                totalCalls,
                weeklyCalls,
                avgScore: Number(avgScore.toFixed(1)),
                lastCallDate,
                activityStatus,
                role: agent.role || '',
                isApproved: agent.is_approved,
                createdAt: agent.created_at
              };
            })
          );

          setAgents(agentsWithStats);

          // Calculate stats
          const totalAgents = agentsWithStats.filter(a => a.role === 'agent').length;
          const weeklyCalls = agentsWithStats.reduce((sum, agent) => sum + agent.weeklyCalls, 0);
          const agentsWithScores = agentsWithStats.filter(a => a.avgScore > 0);
          const avgScore = agentsWithScores.length > 0 
            ? agentsWithScores.reduce((sum, a) => sum + a.avgScore, 0) / agentsWithScores.length
            : 0;
          const successfulCalls = agentsWithStats.reduce((sum, agent) => 
            sum + (agent.avgScore >= 7 ? agent.totalCalls : 0), 0
          );

          setStats({
            totalAgents,
            weeklyCalls,
            avgScore: Number(avgScore.toFixed(1)),
            successfulCalls,
            todayCalls: 0, // Can be calculated if needed
            yesterdayCalls: 0 // Can be calculated if needed
          });
        }

        // Get quota information
        const { data: quotaData } = await supabase
          .from('company_minutes_quotas')
          .select('*')
          .eq('company_id', userData.company_id)
          .single();

        if (quotaData) {
          setQuota({
            totalMinutes: quotaData.total_minutes || 0,
            usedMinutes: quotaData.used_minutes || 0,
            availableMinutes: (quotaData.total_minutes || 0) - (quotaData.used_minutes || 0),
            isPoc: quotaData.is_poc || false,
            canPurchaseAdditional: true
          });
        }

        // Generate insights
        if (stats) {
          const generatedInsights: Insight[] = [];
          
          if (stats.avgScore >= 7) {
            generatedInsights.push({
              id: '1',
              type: 'success',
              title: 'ביצועים מעולים השבוע!',
              description: `הצוות שלך השיג ציון ממוצע של ${stats.avgScore} השבוע. המשיכו כך!`,
              actionText: 'צפה בדוח מפורט',
              actionUrl: '/dashboard/manager/all-calls'
            });
          }

          if (stats.totalAgents < 3) {
            generatedInsights.push({
              id: '2',
              type: 'info',
              title: 'הרחב את הצוות',
              description: 'שקול להוסיף עוד נציגים כדי להגדיל את היקף הפעילות.',
              actionText: 'הוסף נציג',
              actionUrl: '/team/add-agent'
            });
          }

          setInsights(generatedInsights);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [supabase, router]);

  // Helper functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא ידוע';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const getRoleIcon = (role: string) => {
    const roleIcons = {
      'owner': <Award className="w-4 h-4" />,
      'manager': <Users className="w-4 h-4" />,
      'agent': <User className="w-4 h-4" />
    };
    return roleIcons[role as keyof typeof roleIcons] || <User className="w-4 h-4" />;
  };

  const getRoleName = (role: string) => {
    const roleNames = {
      'owner': 'בעלים',
      'manager': 'מנהל',
      'agent': 'נציג'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const getStatusBadge = (isApproved: boolean | null) => {
    if (isApproved === true) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">מאושר</span>;
    } else if (isApproved === false) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">נדחה</span>;
    } else {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">ממתין</span>;
    }
  };

  const getActivityBadge = (status: 'active' | 'moderate' | 'inactive') => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', text: 'פעיל' },
      'moderate': { color: 'bg-yellow-100 text-yellow-800', text: 'בינוני' },
      'inactive': { color: 'bg-red-100 text-red-800', text: 'לא פעיל' }
    };
    
    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // Table columns
  const columns = [
    {
      key: 'fullName',
      title: 'נציג',
      sortable: true,
      filterable: true,
      render: (value: string, row: AgentData) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-glacier-primary-400 to-glacier-accent-500 flex items-center justify-center text-white font-bold">
            {value?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-medium text-glacier-neutral-900">{value}</div>
            <div className="text-sm text-glacier-neutral-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'תפקיד',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'owner', label: 'בעלים' },
        { value: 'manager', label: 'מנהל' },
        { value: 'agent', label: 'נציג' }
      ],
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white">
            {getRoleIcon(value)}
          </div>
          <span className="font-medium">{getRoleName(value)}</span>
        </div>
      )
    },
    {
      key: 'activityStatus',
      title: 'פעילות',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'active', label: 'פעיל' },
        { value: 'moderate', label: 'בינוני' },
        { value: 'inactive', label: 'לא פעיל' }
      ],
      render: (value: 'active' | 'moderate' | 'inactive') => getActivityBadge(value)
    },
    {
      key: 'totalCalls',
      title: 'סה"כ שיחות',
      sortable: true,
      filterable: true,
      filterType: 'number' as const,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-glacier-neutral-400" />
          <span className="font-medium">{value || 0}</span>
        </div>
      )
    },
    {
      key: 'weeklyCalls',
      title: 'שיחות השבוע',
      sortable: true,
      filterable: true,
      filterType: 'number' as const,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-glacier-neutral-400" />
          <span className="font-medium">{value || 0}</span>
        </div>
      )
    },
    {
      key: 'avgScore',
      title: 'ציון ממוצע',
      sortable: true,
      filterable: true,
      filterType: 'number' as const,
      render: (value: number) => {
        if (!value) return <span className="text-glacier-neutral-400">אין נתונים</span>;
        
        let colorClass = '';
        if (value >= 8) colorClass = 'bg-green-100 text-green-700';
        else if (value >= 6) colorClass = 'bg-amber-100 text-amber-700';
        else if (value >= 4) colorClass = 'bg-orange-100 text-orange-700';
        else colorClass = 'bg-red-100 text-red-700';
        
        return (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-glacier-neutral-400" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
              {value.toFixed(1)}
            </span>
          </div>
        );
      }
    },
    {
      key: 'lastCallDate',
      title: 'שיחה אחרונה',
      sortable: true,
      filterable: true,
      filterType: 'date' as const,
      render: (value: string | null) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-glacier-neutral-400" />
          <span>{formatDate(value)}</span>
        </div>
      )
    },
    {
      key: 'id',
      title: 'פעולות',
      sortable: false,
      filterable: false,
      searchable: false,
      render: (value: string, row: AgentData) => (
        <div className="flex items-center gap-2">
          <Link 
            href={`/dashboard/agent?user=${value}`}
            className="inline-flex items-center gap-1 px-3 py-1 bg-glacier-primary-500 text-white rounded-lg hover:bg-glacier-primary-600 transition-colors text-xs font-medium"
          >
            <Eye className="w-3 h-3" />
            <span>צפה</span>
          </Link>
          
          {row.role === 'agent' && (
            <Link 
              href={`/team/edit-agent/${value}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-glacier-neutral-100 text-glacier-neutral-700 rounded-lg hover:bg-glacier-neutral-200 transition-colors text-xs font-medium"
            >
              <Settings className="w-3 h-3" />
              <span>ערוך</span>
            </Link>
          )}
        </div>
      )
    }
  ];

  // Export function
  const handleExport = () => {
    const headers = [
      'שם מלא',
      'אימייל',
      'תפקיד',
      'פעילות',
      'סה"כ שיחות',
      'שיחות השבוע',
      'ציון ממוצע',
      'שיחה אחרונה'
    ].join(',');
    
    const rows = agents.map(agent => [
      agent.fullName,
      agent.email,
      getRoleName(agent.role),
      agent.activityStatus === 'active' ? 'פעיל' : agent.activityStatus === 'moderate' ? 'בינוני' : 'לא פעיל',
      agent.totalCalls || 0,
      agent.weeklyCalls || 0,
      agent.avgScore || 0,
      formatDate(agent.lastCallDate)
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team_dashboard_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-glacier-neutral-50 via-white to-glacier-primary-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-glacier-primary-400 to-glacier-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-glacier-neutral-900 mb-2">טוען דשבורד מנהל...</h3>
          <p className="text-glacier-neutral-600">אוסף נתוני צוות וביצועים</p>
        </div>
      </div>
    );
  }

  const quotaPercentage = quota ? (quota.usedMinutes / quota.totalMinutes) * 100 : 0;
  const todayVsYesterday = stats ? ((stats.todayCalls - stats.yesterdayCalls) / Math.max(stats.yesterdayCalls, 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-neutral-50 via-white to-glacier-primary-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* שורה ראשונה - כותרת וסטטיסטיקות */}
        <div className="space-y-6">
          <WelcomeHero 
            managerInfo={user}
            companyName={companyName}
          />
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <SmartKPICard
              icon={Users}
              title="סה״כ נציגים"
              value={stats?.totalAgents || 0}
              subtitle="נציגים פעילים"
            />
            <SmartKPICard
              icon={Phone}
              title="שיחות השבוע"
              value={stats?.weeklyCalls || 0}
              trend={todayVsYesterday}
              subtitle="בהשוואה לאתמול"
            />
            <SmartKPICard
              icon={BarChart3}
              title="ציון ממוצע"
              value={stats?.avgScore || 0}
              format="number"
              subtitle="השבוע האחרון"
            />
            <SmartKPICard
              icon={CheckCircle}
              title="שיחות מוצלחות"
              value={stats?.successfulCalls || 0}
              subtitle="ציון מעל 7"
            />
          </div>
        </div>

        {/* חלוקה 20-80: סיכומים ומכסות + טבלת צוות */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          
          {/* 20% - מידע מנהלי ומכסות */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* מכסת דקות */}
            {quota && (
              <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-2xl shadow-glacier-soft p-6">
                <h3 className="text-lg font-semibold text-glacier-neutral-900 mb-4 flex items-center">
                  <Battery className="w-5 h-5 ml-2 text-glacier-primary-600" />
                  מכסת דקות
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-glacier-neutral-600">שימוש נוכחי</span>
                    <span className="font-semibold text-glacier-neutral-900">{quotaPercentage.toFixed(1)}%</span>
                  </div>
                  
                  <div className="w-full bg-glacier-neutral-200 rounded-full h-3">
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
                    <span className="text-glacier-neutral-600">{quota.usedMinutes} דקות</span>
                    <span className="text-glacier-neutral-600">{quota.totalMinutes} דקות</span>
                  </div>
                  
                  <div className="pt-2 border-t border-glacier-neutral-100">
                    <p className="text-sm text-glacier-neutral-600">
                      נותרו <span className="font-semibold text-glacier-neutral-900">{quota.availableMinutes}</span> דקות
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
            )}

            {/* פעולות מהירות */}
            <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-2xl shadow-glacier-soft p-6">
              <h3 className="text-lg font-semibold text-glacier-neutral-900 mb-4 flex items-center">
                <Target className="w-5 h-5 ml-2 text-glacier-primary-600" />
                פעולות מהירות
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/team/add-agent')}
                  className="w-full flex items-center justify-center gap-3 p-3 border border-glacier-neutral-200 rounded-xl hover:bg-glacier-neutral-50 transition-colors"
                >
                  <UserPlus className="w-5 h-5 text-glacier-primary-600" />
                  <span className="font-medium text-glacier-neutral-900">הוסף נציג</span>
                </button>
                <button 
                  onClick={() => router.push('/dashboard/manager/all-calls')}
                  className="w-full flex items-center justify-center gap-3 p-3 border border-glacier-neutral-200 rounded-xl hover:bg-glacier-neutral-50 transition-colors"
                >
                  <Eye className="w-5 h-5 text-glacier-accent-600" />
                  <span className="font-medium text-glacier-neutral-900">כל השיחות</span>
                </button>
                <button 
                  onClick={() => router.push('/team')}
                  className="w-full flex items-center justify-center gap-3 p-3 border border-glacier-neutral-200 rounded-xl hover:bg-glacier-neutral-50 transition-colors"
                >
                  <Users className="w-5 h-5 text-glacier-secondary-600" />
                  <span className="font-medium text-glacier-neutral-900">ניהול צוות</span>
                </button>
              </div>
            </div>
          </div>

          {/* 80% - טבלת צוות מלאה */}
          <div className="xl:col-span-4">
            <AdvancedDataTable
              data={agents}
              columns={columns}
              loading={loading}
              title="צוות החברה"
              subtitle={`${agents.length} חברי צוות עם נתוני ביצועים מלאים`}
              onRefresh={() => window.location.reload()}
              onExport={handleExport}
              globalSearch={true}
              pagination={true}
              pageSize={15}
              className="shadow-xl"
            />
          </div>
        </div>

        {/* תובנות ניהוליות */}
        {insights.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white shadow-glacier-soft">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-glacier-neutral-900">תובנות ניהוליות</h2>
                <p className="text-glacier-neutral-600">המלצות מבוססות נתונים לשיפור ביצועי הצוות</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {insights.map((insight) => (
                <div key={insight.id} className={`bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-2xl shadow-glacier-soft p-6 ${
                  insight.type === 'success' ? 'border-r-4 border-r-green-400' :
                  insight.type === 'warning' ? 'border-r-4 border-r-amber-400' :
                  'border-r-4 border-r-blue-400'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      insight.type === 'success' ? 'bg-green-100' :
                      insight.type === 'warning' ? 'bg-amber-100' :
                      'bg-blue-100'
                    }`}>
                      {insight.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                      {insight.type === 'info' && <Activity className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-glacier-neutral-900 mb-1">{insight.title}</h4>
                      <p className="text-sm text-glacier-neutral-600 leading-relaxed mb-3">{insight.description}</p>
                      {insight.actionText && (
                        <Link 
                          href={insight.actionUrl || '#'}
                          className="text-sm text-glacier-primary-600 hover:text-glacier-primary-700 font-medium flex items-center gap-1"
                        >
                          <span>{insight.actionText}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
} 