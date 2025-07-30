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
  Star,
  Building2,
  Zap,
  Trophy
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

interface Call {
  id: string;
  call_type: string;
  customer_name: string | null;
  created_at: string;
  overall_score: number | null;
  processing_status: string | null;
  red_flag: boolean | null;
  audio_duration_seconds?: number | null;
  user_id: string;
  agent_name?: string;
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

// WelcomeHero Component for Manager - Bento Style
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
    <div className="bg-gradient-to-br from-glacier-primary-600 via-glacier-primary-700 to-glacier-accent-600 rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg p-8 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
            <div className="w-16 h-16 rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md bg-gradient-to-br from-glacier-secondary-400 to-glacier-secondary-600 flex items-center justify-center text-white font-bold text-2xl">
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
          <div className="w-16 h-16 bg-white/10 rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <p className="text-glacier-primary-100 text-sm">דשבורד מנהל</p>
        </div>
      </div>
    </div>
  );
};

// Bento-style KPI Card Component
interface BentoKPICardProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
  trend?: number;
  format?: 'number' | 'percentage' | 'currency';
  subtitle?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'accent' | 'success' | 'warning';
}

const BentoKPICard: React.FC<BentoKPICardProps> = ({ 
  icon: Icon, 
  title, 
  value, 
  trend, 
  format = 'number',
  subtitle,
  size = 'medium',
  variant = 'primary'
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

  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return {
          cardBg: 'bg-gradient-to-br from-glacier-accent-50 to-glacier-accent-100',
          iconBg: 'bg-gradient-to-br from-glacier-secondary-400 to-glacier-secondary-500 group-hover:from-glacier-secondary-500 group-hover:to-glacier-secondary-600',
          iconColor: 'text-white',
          textColor: 'text-glacier-secondary-800',
          subtitleColor: 'text-glacier-secondary-600'
        };
      case 'success':
        return {
          cardBg: 'bg-gradient-to-br from-glacier-secondary-50 to-glacier-secondary-100',
          iconBg: 'bg-gradient-to-br from-glacier-secondary-500 to-glacier-secondary-600 group-hover:from-glacier-secondary-600 group-hover:to-glacier-secondary-700',
          iconColor: 'text-white',
          textColor: 'text-glacier-secondary-800',
          subtitleColor: 'text-glacier-secondary-600'
        };
      case 'warning':
        return {
          cardBg: 'bg-gradient-to-br from-glacier-warning-light to-orange-100',
          iconBg: 'bg-gradient-to-br from-glacier-warning to-glacier-warning-dark group-hover:from-glacier-warning-dark group-hover:to-orange-600',
          iconColor: 'text-white',
          textColor: 'text-glacier-warning-dark',
          subtitleColor: 'text-orange-700'
        };
      default:
        return {
          cardBg: 'bg-gradient-to-br from-glacier-primary-50 to-glacier-primary-100',
          iconBg: 'bg-gradient-to-br from-glacier-primary-500 to-glacier-primary-600 group-hover:from-glacier-primary-600 group-hover:to-glacier-primary-700',
          iconColor: 'text-white',
          textColor: 'text-glacier-primary-800',
          subtitleColor: 'text-glacier-primary-600'
        };
    }
  };

  const getBentoRadius = () => {
    switch (size) {
      case 'large':
        return 'rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg';
      case 'small':
        return 'rounded-tr-3xl rounded-bl-3xl rounded-tl-lg rounded-br-lg';
      default:
        return 'rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg';
    }
  };

  const getTrendIcon = () => {
    if (trend === undefined) return <Minus className="w-4 h-4 text-gray-400" />;
    if (trend > 0) return <ChevronUp className="w-4 h-4 text-emerald-600" />;
    if (trend < 0) return <ChevronDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return 'text-gray-400';
    if (trend > 0) return 'text-emerald-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  const variantStyles = getVariantStyles();

  return (
    <div className={`${variantStyles.cardBg} backdrop-blur-md border border-glacier-primary-200 ${getBentoRadius()} shadow-glacier-soft p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md ${variantStyles.iconBg} transition-all duration-300 shadow-sm`}>
          <Icon className={`w-6 h-6 ${variantStyles.iconColor}`} />
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
        <p className={`font-bold ${variantStyles.textColor} ${
          size === 'large' ? 'text-3xl' : size === 'small' ? 'text-xl' : 'text-2xl'
        }`}>
          {formatValue(value)}
        </p>
        <p className={`text-sm font-medium ${variantStyles.subtitleColor}`}>{title}</p>
        {subtitle && (
          <p className={`text-xs ${variantStyles.subtitleColor} opacity-80`}>{subtitle}</p>
        )}
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
  
  // Calls table state
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [callTypeFilter, setCallTypeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [redFlagFilter, setRedFlagFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination state for calls
  const [currentCallsPage, setCurrentCallsPage] = useState(1);
  const [callsPerPage] = useState(10);
  
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
            sum + (agent.avgScore >= 8 ? agent.totalCalls : 0), 0
          );

          setStats({
            totalAgents,
            weeklyCalls,
            avgScore: Number(avgScore.toFixed(1)),
            successfulCalls,
            todayCalls: 0,
            yesterdayCalls: 0
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

        // Get all team calls
        if (agentsData && agentsData.length > 0) {
          const agentIds = agentsData.map(agent => agent.id);
          const { data: callsData } = await supabase
            .from('calls')
            .select('id, call_type, customer_name, created_at, overall_score, processing_status, red_flag, audio_duration_seconds, user_id')
            .in('user_id', agentIds)
            .order('created_at', { ascending: false });

          if (callsData) {
            // Add agent names to calls
            const callsWithAgentNames = callsData.map(call => ({
              ...call,
              agent_name: agentsData.find(agent => agent.id === call.user_id)?.full_name || 'לא ידוע'
            }));
            
            setAllCalls(callsWithAgentNames);
            setFilteredCalls(callsWithAgentNames);
          }
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

  // Helper functions for calls
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא ידוע';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCallTypeIcon = (callType: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'sales_call': <Phone className="w-4 h-4" />,
      'follow_up_before_offer': <Target className="w-4 h-4" />,
      'follow_up_after_offer': <CheckCircle className="w-4 h-4" />,
      'appointment_scheduling': <Calendar className="w-4 h-4" />,
      'follow_up_appointment': <Clock className="w-4 h-4" />,
      'customer_service': <User className="w-4 h-4" />
    };
    return icons[callType] || <Phone className="w-4 h-4" />;
  };

  const getCallTypeName = (callType: string) => {
    const names: { [key: string]: string } = {
      'sales_call': 'מכירה טלפונית',
      'follow_up_before_offer': 'פולו אפ לפני הצעה',
      'follow_up_after_offer': 'פולו אפ אחרי הצעה',
      'appointment_scheduling': 'תאום פגישה',
      'follow_up_appointment': 'פולו אפ תאום',
      'customer_service': 'שירות לקוחות'
    };
    return names[callType] || callType;
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score >= 8.5) return 'bg-gradient-to-r from-glacier-secondary-100 to-glacier-secondary-200 text-glacier-secondary-800';
    if (score >= 7) return 'bg-gradient-to-r from-glacier-warning-light to-glacier-warning text-glacier-warning-dark';
    return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-glacier-secondary-100 to-glacier-secondary-200 text-glacier-secondary-800';
      case 'pending':
        return 'bg-gradient-to-r from-glacier-warning-light to-glacier-warning text-glacier-warning-dark';
      case 'error':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'הושלם';
      case 'pending':
        return 'בתהליך';
      case 'error':
        return 'שגיאה';
      default:
        return status;
    }
  };

  // Filtering logic
  useEffect(() => {
    let filtered = allCalls;

    // Search term
    if (searchTerm) {
      filtered = filtered.filter(call => 
        call.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCallTypeName(call.call_type).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Call type filter
    if (callTypeFilter !== 'all') {
      filtered = filtered.filter(call => call.call_type === callTypeFilter);
    }

    // Agent filter
    if (agentFilter !== 'all') {
      filtered = filtered.filter(call => call.user_id === agentFilter);
    }

    // Score filter
    if (scoreFilter !== 'all') {
      if (scoreFilter === 'high') {
        filtered = filtered.filter(call => call.overall_score && call.overall_score >= 8);
      } else if (scoreFilter === 'medium') {
        filtered = filtered.filter(call => call.overall_score && call.overall_score >= 6 && call.overall_score < 8);
      } else if (scoreFilter === 'low') {
        filtered = filtered.filter(call => call.overall_score && call.overall_score < 6);
      } else if (scoreFilter === 'none') {
        filtered = filtered.filter(call => !call.overall_score);
      }
    }

    // Red flag filter
    if (redFlagFilter === 'yes') {
      filtered = filtered.filter(call => call.red_flag === true);
    } else if (redFlagFilter === 'no') {
      filtered = filtered.filter(call => call.red_flag === false);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.processing_status === statusFilter);
    }

    setFilteredCalls(filtered);
    setCurrentCallsPage(1); // Reset to first page when filters change
  }, [allCalls, searchTerm, callTypeFilter, agentFilter, scoreFilter, redFlagFilter, statusFilter]);

  // Pagination for calls
  const totalCallsItems = filteredCalls.length;
  const totalCallsPages = Math.ceil(totalCallsItems / callsPerPage);
  const startCallsIndex = (currentCallsPage - 1) * callsPerPage;
  const endCallsIndex = startCallsIndex + callsPerPage;
  const paginatedCalls = filteredCalls.slice(startCallsIndex, endCallsIndex);

  const handleCallsPageChange = (page: number) => {
    setCurrentCallsPage(page);
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

  const getActivityBadge = (status: 'active' | 'moderate' | 'inactive') => {
    const statusConfig = {
      'active': { color: 'bg-emerald-100 text-emerald-700 border border-emerald-200', text: 'פעיל' },
      'moderate': { color: 'bg-amber-100 text-amber-700 border border-amber-200', text: 'בינוני' },
      'inactive': { color: 'bg-slate-100 text-slate-600 border border-slate-200', text: 'לא פעיל' }
    };
    
    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-glacier-primary-50 via-white to-glacier-accent-50 flex items-center justify-center">
        <div className="text-center animate-in fade-in duration-700">
          <div className="w-16 h-16 bg-gradient-to-br from-glacier-primary-400 to-glacier-secondary-500 rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-glacier-primary-800 mb-2">טוען דשבורד מנהל...</h3>
          <p className="text-glacier-primary-600">אוסף נתוני צוות וביצועים</p>
          </div>
        </div>
    );
  }

  const quotaPercentage = quota ? (quota.usedMinutes / quota.totalMinutes) * 100 : 0;
        
        return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Welcome Hero - Elegant Design */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 rounded-3xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-white font-bold text-2xl">
                  {user?.full_name?.charAt(0) || 'M'}
          </div>
        </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return 'בוקר טוב';
                    if (hour < 17) return 'צהריים טובים';
                    if (hour < 21) return 'ערב טוב';
                    return 'לילה טוב';
                  })()}, {user?.full_name || 'מנהל'}! 👋
                </h1>
                <p className="text-indigo-100 text-lg">
                  ברוך הבא לדשבורד הניהול של {companyName || 'החברה'}
                </p>
                <p className="text-indigo-200 text-sm mt-1">
                  עקוב אחר ביצועי הצוות, נהל נציגים וקבל תובנות מתקדמות
                </p>
        </div>
            </div>
            
        <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-8 h-8 text-white" />
          </div>
              <p className="text-indigo-100 text-sm">דשבורד מנהל</p>
        </div>
      </div>
        </div>

        {/* Main Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column - Stats (1/4) */}
        <div className="space-y-6">
            {/* Primary KPI - Large */}
            <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/20 rounded-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">ציון ממוצע צוות</p>
                    <p className="text-4xl font-bold">{stats?.avgScore.toFixed(1) || '0.0'}</p>
                    <div className="mt-3 w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-1000"
                        style={{width: `${Math.min(((stats?.avgScore || 0) / 10) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
            
                        {/* Small Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats?.totalAgents || 0}</p>
                  <p className="text-sm font-medium text-slate-600">נציגים פעילים</p>
          </div>
        </div>

              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100">
                    <Phone className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats?.weeklyCalls || 0}</p>
                  <p className="text-sm font-medium text-slate-600">שיחות השבוע</p>
                </div>
              </div>
            </div>

            {/* Quota Card */}
            {quota && (
              <div className="bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                  <Battery className="w-5 h-5 ml-2 text-slate-600" />
                  מכסת דקות
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">שימוש נוכחי</span>
                    <span className="font-semibold text-slate-800">{quotaPercentage.toFixed(1)}%</span>
                  </div>
                  
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        quotaPercentage >= 90 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                        quotaPercentage >= 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
                        'bg-gradient-to-r from-emerald-400 to-teal-500'
                      }`}
                      style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{quota.usedMinutes} דקות</span>
                    <span className="text-slate-600">{quota.totalMinutes} דקות</span>
                  </div>
                    
                    {quotaPercentage >= 75 && (
                    <div className="pt-2 border-t border-slate-200">
                        <button
                          onClick={() => router.push('/team/purchase-quota')}
                          className={`w-full py-2 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                            quotaPercentage >= 90 
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg' 
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>רכישת דקות נוספות</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
            )}
          </div>

          {/* Middle Column - Team Overview (2/4) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats?.successfulCalls || 0}</p>
                  <p className="text-sm font-medium text-slate-600">שיחות מוצלחות</p>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100">
                    <Trophy className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{((stats?.successfulCalls || 0) / Math.max(stats?.weeklyCalls || 1, 1) * 100).toFixed(0)}%</p>
                  <p className="text-sm font-medium text-slate-600">יעילות צוות</p>
                </div>
              </div>
            </div>

            {/* Team Members Preview */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">צוות החברה</h2>
                  <Link 
                    href="/team"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
                  >
                    ראה הכל
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {agents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">אין עדיין נציגים</h3>
                    <p className="text-slate-500 mb-6">התחל לבנות את הצוות שלך</p>
                    <Link 
                      href="/team/add-agent" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span>הוסף נציג ראשון</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agents.slice(0, 5).map((agent, index) => (
                      <div 
                        key={agent.id} 
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/50 rounded-xl hover:from-slate-100 hover:to-blue-50/50 transition-all duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {agent.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{agent.fullName}</div>
                            <div className="text-sm text-slate-600 flex items-center gap-2">
                              <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs">
                                {getRoleIcon(agent.role)}
                              </div>
                              {getRoleName(agent.role)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-800">{agent.totalCalls} שיחות</div>
                          <div className="text-xs">{getActivityBadge(agent.activityStatus)}</div>
                        </div>
                      </div>
                    ))}
                    
                                        {agents.length > 5 && (
                      <div className="text-center pt-4 border-t border-slate-200">
                        <Link 
                          href="/team"
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          +{agents.length - 5} נציגים נוספים
                        </Link>
              </div>
            )}
                  </div>
                )}
              </div>
            </div>
          </div>

                    {/* Right Column - Actions & Insights (1/4) */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                <Zap className="w-5 h-5 ml-2 text-indigo-600" />
                פעולות מהירות
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/team/add-agent')}
                  className="w-full flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl hover:from-indigo-100 hover:to-blue-100 transition-all duration-300 group"
                >
                  <UserPlus className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-700">הוסף נציג</span>
                </button>
                <button 
                  onClick={() => router.push('/dashboard/manager/all-calls')}
                  className="w-full flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl hover:from-emerald-100 hover:to-teal-100 transition-all duration-300 group"
                >
                  <Eye className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-700">כל השיחות</span>
                </button>
                <button 
                  onClick={() => router.push('/team')}
                  className="w-full flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl hover:from-purple-100 hover:to-violet-100 transition-all duration-300 group"
                >
                  <Users className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-700">ניהול צוות</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                <Activity className="w-5 h-5 ml-2 text-emerald-600" />
                פעילות אחרונה
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-bold text-slate-800">{stats?.weeklyCalls || 0}</span>
                    <span className="text-slate-600"> שיחות השבוע</span>
            </div>
          </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-bold text-slate-800">{stats?.totalAgents || 0}</span>
                    <span className="text-slate-600"> נציגים פעילים</span>
          </div>
        </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-bold text-slate-800">{((stats?.avgScore || 0) * 10).toFixed(0)}%</span>
                    <span className="text-slate-600"> יעילות כללית</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights Section - Full Width */}
        {insights.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md bg-gradient-to-br from-glacier-secondary-400 to-glacier-secondary-600 flex items-center justify-center text-white shadow-glacier-soft">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-glacier-primary-800">תובנות ניהוליות</h2>
                <p className="text-glacier-primary-600">המלצות מבוססות נתונים לשיפור ביצועי הצוות</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {insights.map((insight) => (
                <div key={insight.id} className={`bg-gradient-to-br from-white/95 to-${
                  insight.type === 'success' ? 'glacier-secondary-50' :
                  insight.type === 'warning' ? 'glacier-warning-light' :
                  'glacier-primary-50'
                } backdrop-blur-md border ${
                  insight.type === 'success' ? 'border-glacier-secondary-200 border-r-4 border-r-glacier-secondary-500' :
                  insight.type === 'warning' ? 'border-glacier-warning border-r-4 border-r-glacier-warning-dark' :
                  'border-glacier-primary-200 border-r-4 border-r-glacier-primary-500'
                } rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg shadow-glacier-soft p-6`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-tl-lg rounded-br-lg rounded-tr-sm rounded-bl-sm flex items-center justify-center ${
                      insight.type === 'success' ? 'bg-gradient-to-br from-glacier-secondary-100 to-glacier-secondary-200' :
                      insight.type === 'warning' ? 'bg-gradient-to-br from-glacier-warning-light to-glacier-warning' :
                      'bg-gradient-to-br from-glacier-primary-100 to-glacier-primary-200'
                    }`}>
                      {insight.type === 'success' && <CheckCircle className="w-5 h-5 text-glacier-secondary-700" />}
                      {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-glacier-warning-dark" />}
                      {insight.type === 'info' && <Activity className="w-5 h-5 text-glacier-primary-700" />}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-1 ${
                        insight.type === 'success' ? 'text-glacier-secondary-800' :
                        insight.type === 'warning' ? 'text-glacier-warning-dark' :
                        'text-glacier-primary-800'
                      }`}>{insight.title}</h4>
                      <p className={`text-sm leading-relaxed mb-3 ${
                        insight.type === 'success' ? 'text-glacier-secondary-600' :
                        insight.type === 'warning' ? 'text-glacier-warning-dark' :
                        'text-glacier-primary-600'
                      }`}>{insight.description}</p>
                      {insight.actionText && (
                        <Link 
                          href={insight.actionUrl || '#'}
                          className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                            insight.type === 'success' ? 'text-glacier-secondary-600 hover:text-glacier-secondary-700' :
                            insight.type === 'warning' ? 'text-glacier-warning-dark hover:text-glacier-warning' :
                            'text-glacier-primary-600 hover:text-glacier-primary-700'
                          }`}
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

                {/* Comprehensive Team Calls Table */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Phone className="w-6 h-6" />
      </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">שיחות הצוות</h2>
              <p className="text-slate-600">כל השיחות של הצוות עם אפשרויות חיפוש וסינון מתקדמות</p>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">חיפוש וסינון מתקדם</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Search Input */}
              <div className="xl:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">חיפוש כללי</label>
                <input
                  type="text"
                  placeholder="חפש לפי לקוח, נציג או סוג שיחה..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Agent Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">נציג</label>
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">כל הנציגים</option>
                  {agents.filter(agent => agent.role === 'agent').map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Call Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">סוג שיחה</label>
                <select
                  value={callTypeFilter}
                  onChange={(e) => setCallTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">כל הסוגים</option>
                  <option value="sales_call">מכירה טלפונית</option>
                  <option value="follow_up_before_offer">פולו אפ לפני הצעה</option>
                  <option value="follow_up_after_offer">פולו אפ אחרי הצעה</option>
                  <option value="appointment_scheduling">תאום פגישה</option>
                  <option value="follow_up_appointment">פולו אפ תאום</option>
                  <option value="customer_service">שירות לקוחות</option>
                </select>
              </div>

              {/* Score Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ציון</label>
                <select
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">כל הציונים</option>
                  <option value="high">גבוה (8+)</option>
                  <option value="medium">בינוני (6-8)</option>
                  <option value="low">נמוך (מתחת ל-6)</option>
                  <option value="none">ללא ציון</option>
                </select>
              </div>

              {/* Red Flag Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">דגלים אדומים</label>
                <select
                  value={redFlagFilter}
                  onChange={(e) => setRedFlagFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">הכל</option>
                  <option value="yes">עם דגל אדום</option>
                  <option value="no">ללא דגל אדום</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">סטטוס</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="completed">הושלם</option>
                  <option value="pending">בתהליך</option>
                  <option value="error">שגיאה</option>
                </select>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  מציג <span className="font-semibold text-slate-800">{filteredCalls.length}</span> מתוך <span className="font-semibold text-slate-800">{allCalls.length}</span> שיחות
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCallTypeFilter('all');
                    setAgentFilter('all');
                    setScoreFilter('all');
                    setRedFlagFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all duration-200 border border-slate-300"
                >
                  נקה סינונים
                </button>
              </div>
            </div>
          </div>

          {/* Calls Table */}
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-indigo-50/30">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">שיחות הצוות</h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">
                    מציג {Math.min(startCallsIndex + 1, totalCallsItems)} עד {Math.min(endCallsIndex, totalCallsItems)} מתוך {totalCallsItems} שיחות
                  </span>
                </div>
              </div>
            </div>

            {/* Table Content */}
            {filteredCalls.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  {allCalls.length === 0 ? 'אין עדיין שיחות' : 'לא נמצאו שיחות מתאימות'}
                </h3>
                <p className="text-slate-500 mb-6">
                  {allCalls.length === 0 
                    ? 'השיחות יופיעו כאן לאחר שהנציגים יעלו שיחות' 
                    : 'נסה לשנות את הסינונים או החיפוש'}
                </p>
              </div>
            ) : (
              <>
                {/* Responsive Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                          תאריך
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                          נציג
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                          סוג שיחה
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                          לקוח
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                          ציון
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider hidden md:table-cell">
                          סטטוס
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {paginatedCalls.map((call, index) => (
                        <tr 
                          key={call.id} 
                          className="hover:bg-slate-50 transition-colors duration-200"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-slate-800">
                            <div className="space-y-1">
                              <div className="font-medium text-xs lg:text-sm">{formatDate(call.created_at)}</div>
                              {/* Mobile: Show call type under date */}
                              <div className="lg:hidden">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white">
                                    {getCallTypeIcon(call.call_type)}
                                  </div>
                                  <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]" title={getCallTypeName(call.call_type)}>
                                    {getCallTypeName(call.call_type)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                {call.agent_name?.charAt(0) || '?'}
                              </div>
                              <span className="text-sm font-medium text-slate-800 max-w-xs truncate" title={call.agent_name}>
                                {call.agent_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
                                {getCallTypeIcon(call.call_type)}
                              </div>
                              <span className="text-sm font-medium text-slate-800 max-w-xs truncate" title={getCallTypeName(call.call_type)}>
                                {getCallTypeName(call.call_type)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="max-w-[100px] lg:max-w-xs truncate" title={call.customer_name || 'לקוח ללא שם'}>
                                {call.customer_name || 'לקוח ללא שם'}
                              </span>
                              {call.red_flag && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-center">
                            {call.overall_score ? (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(call.overall_score)}`}>
                                {call.overall_score.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-center hidden md:table-cell">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.processing_status || 'pending')}`}>
                              {getStatusText(call.processing_status || 'pending')}
                            </span>
                          </td>
                          <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-center">
                            {call.processing_status === 'completed' && (
                              <Link 
                                href={`/call/${call.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 text-xs font-medium"
                              >
                                <span className="hidden sm:inline">צפה</span>
                                <span className="sm:hidden">דוח</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalCallsItems > callsPerPage && (
                  <div className="px-4 lg:px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>
                          מציג {startCallsIndex + 1} עד {Math.min(endCallsIndex, totalCallsItems)} מתוך {totalCallsItems} שיחות
                        </span>
                      </div>
                      
                      {totalCallsPages > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCallsPageChange(Math.max(1, currentCallsPage - 1))}
                            disabled={currentCallsPage === 1}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                          >
                            קודם
                          </button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalCallsPages) }, (_, i) => {
                              const pageNum = i + 1;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handleCallsPageChange(pageNum)}
                                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                    currentCallsPage === pageNum
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          
                          <button
                            onClick={() => handleCallsPageChange(Math.min(totalCallsPages, currentCallsPage + 1))}
                            disabled={currentCallsPage === totalCallsPages}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                          >
                            הבא
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
} 