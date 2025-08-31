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

import TeamInsights from '@/components/TeamInsights'
import SimulationsDashboard from '@/components/dashboard/SimulationsDashboard';

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
    <div className="bg-gradient-to-br from-brand-primary via-brand-primary-light to-brand-secondary rounded-tl-3xl rounded-br-3xl p-8 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-tl-3xl rounded-br-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
            <div className="w-16 h-16 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-brand-secondary to-brand-secondary-dark flex items-center justify-center text-white font-bold text-2xl">
              {managerInfo?.full_name?.charAt(0) || 'M'}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {managerInfo?.full_name || 'מנהל'}! 👋
            </h1>
            <p className="text-white/90 text-lg">
              ברוך הבא לדשבורד הניהול של {companyName || 'החברה'}
            </p>
            <p className="text-white/75 text-sm mt-1">
              עקוב אחר ביצועי הצוות, נהל נציגים וקבל תובנות מתקדמות
            </p>
          </div>
        </div>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-white/10 rounded-tr-2xl rounded-bl-2xl flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <p className="text-white/90 text-sm">דשבורד מנהל</p>
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
          cardBg: 'bg-white border-2 border-brand-accent-dark',
          iconBg: 'bg-gradient-to-br from-brand-secondary to-brand-secondary-dark group-hover:from-brand-secondary-dark group-hover:to-brand-secondary',
          iconColor: 'text-white',
          textColor: 'text-neutral-800',
          subtitleColor: 'text-neutral-600'
        };
      case 'success':
        return {
          cardBg: 'bg-white border-2 border-brand-success',
          iconBg: 'bg-gradient-to-br from-brand-success to-brand-success-dark group-hover:from-brand-success-dark group-hover:to-brand-success',
          iconColor: 'text-white',
          textColor: 'text-neutral-800',
          subtitleColor: 'text-neutral-600'
        };
      case 'warning':
        return {
          cardBg: 'bg-white border-2 border-brand-warning',
          iconBg: 'bg-gradient-to-br from-brand-warning to-brand-warning-dark group-hover:from-brand-warning-dark group-hover:to-brand-warning',
          iconColor: 'text-white',
          textColor: 'text-neutral-800',
          subtitleColor: 'text-neutral-600'
        };
      default:
        return {
          cardBg: 'bg-white border-2 border-brand-primary',
          iconBg: 'bg-gradient-to-br from-brand-primary to-brand-primary-light group-hover:from-brand-primary-light group-hover:to-brand-primary',
          iconColor: 'text-white',
          textColor: 'text-neutral-800',
          subtitleColor: 'text-neutral-600'
        };
    }
  };

  const getBentoRadius = () => {
    switch (size) {
      case 'large':
        return 'rounded-tl-3xl rounded-br-3xl';
      case 'small':
        return 'rounded-tr-2xl rounded-bl-2xl';
      default:
        return 'rounded-tl-2xl rounded-br-2xl';
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
    <div className={`${variantStyles.cardBg} ${getBentoRadius()} shadow-sm p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-tr-xl rounded-bl-xl ${variantStyles.iconBg} transition-all duration-300 shadow-sm`}>
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
      <div className="min-h-screen bg-gradient-to-br from-brand-bg-light to-brand-bg flex items-center justify-center">
        <div className="text-center animate-in fade-in duration-700">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-tl-3xl rounded-br-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">טוען דשבורד מנהל...</h3>
          <p className="text-neutral-600">אוסף נתוני צוות וביצועים</p>
          </div>
        </div>
    );
  }

  const quotaPercentage = quota ? (quota.usedMinutes / quota.totalMinutes) * 100 : 0;
        
        return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg-light to-brand-bg p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Welcome Hero - Clean Brand Design */}
        <div className="bg-gradient-to-br from-brand-primary via-brand-primary-light to-brand-secondary rounded-tl-3xl rounded-br-3xl p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-black/5 rounded-tl-3xl rounded-br-3xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-tl-2xl rounded-br-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg">
                <div className="w-16 h-16 rounded-tl-xl rounded-br-xl bg-gradient-to-br from-brand-secondary to-brand-secondary-dark flex items-center justify-center text-white font-bold text-2xl">
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
                <p className="text-white/90 text-lg">
                  ברוך הבא לדשבורד הניהול של {companyName || 'החברה'}
                </p>
                <p className="text-white/75 text-sm mt-1">
                  עקוב אחר ביצועי הצוות, נהל נציגים וקבל תובנות מתקדמות
                </p>
        </div>
            </div>
            
        <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-tr-xl rounded-bl-xl flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-8 h-8 text-white" />
          </div>
              <p className="text-white/90 text-sm">דשבורד מנהל</p>
        </div>
      </div>
        </div>

        {/* AI Team Insights - ממש בראש הדף */}
        {user?.company_id && (
          <TeamInsights companyId={user.company_id} />
        )}

        {/* Main Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Column - Stats (1/5 = 20%) */}
        <div className="lg:col-span-1 space-y-6">
            {/* Primary KPI - Large */}
            <div className="bg-gradient-to-br from-brand-secondary via-brand-secondary-dark to-brand-primary rounded-tl-3xl rounded-br-3xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/15 rounded-tl-3xl rounded-br-3xl"></div>
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
                  <div className="w-16 h-16 bg-white/20 rounded-tr-xl rounded-bl-xl flex items-center justify-center">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
            
                        {/* Small Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white border-2 border-brand-primary/20 rounded-tl-2xl rounded-br-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-tr-xl rounded-bl-xl bg-gradient-to-br from-brand-primary to-brand-primary-light">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-800">{stats?.totalAgents || 0}</p>
                  <p className="text-sm font-medium text-neutral-600">נציגים פעילים</p>
          </div>
        </div>

              <div className="bg-white border-2 border-brand-secondary/20 rounded-tr-2xl rounded-bl-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-tl-xl rounded-br-xl bg-gradient-to-br from-brand-secondary to-brand-secondary-dark">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-800">{stats?.weeklyCalls || 0}</p>
                  <p className="text-sm font-medium text-neutral-600">שיחות השבוע</p>
                </div>
              </div>
            </div>

            {/* Quota Card */}
            {quota && (
              <div className="bg-white border-2 border-brand-warning/20 rounded-tl-3xl rounded-br-3xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-neutral-700 mb-4 flex items-center">
                  <Battery className="w-5 h-5 ml-2 text-neutral-600" />
                  מכסת דקות
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">שימוש נוכחי</span>
                    <span className="font-semibold text-neutral-800">{quotaPercentage.toFixed(1)}%</span>
                  </div>
                  
                  <div className="w-full bg-neutral-100 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        quotaPercentage >= 90 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                        quotaPercentage >= 70 ? 'bg-gradient-to-r from-brand-warning to-brand-warning-dark' : 
                        'bg-gradient-to-r from-brand-secondary to-brand-secondary-dark'
                      }`}
                      style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">{quota.usedMinutes} דקות</span>
                    <span className="text-neutral-600">{quota.totalMinutes} דקות</span>
                  </div>
                    
                    {quotaPercentage >= 75 && (
                    <div className="pt-2 border-t border-neutral-200">
                        <button
                          onClick={() => router.push('/team/purchase-quota')}
                          className={`w-full py-2 px-4 rounded-tl-xl rounded-br-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                            quotaPercentage >= 90 
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg' 
                            : 'bg-gradient-to-r from-brand-warning to-brand-warning-dark hover:from-brand-warning-dark hover:to-brand-warning text-white shadow-lg'
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

            {/* Recent Activity */}
            <div className="bg-white border-2 border-brand-secondary/20 rounded-tr-3xl rounded-bl-3xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-neutral-700 mb-4 flex items-center">
                <Activity className="w-5 h-5 ml-2 text-brand-secondary" />
                פעילות אחרונה
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 rounded-tl-xl rounded-br-xl border border-brand-primary/20">
                  <div className="w-3 h-3 bg-brand-primary rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-bold text-neutral-800">{stats?.weeklyCalls || 0}</span>
                    <span className="text-neutral-600"> שיחות השבוע</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-brand-secondary/10 to-brand-secondary/5 rounded-tr-xl rounded-bl-xl border border-brand-secondary/20">
                  <div className="w-3 h-3 bg-brand-secondary rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-bold text-neutral-800">{stats?.totalAgents || 0}</span>
                    <span className="text-neutral-600"> נציגים פעילים</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-brand-warning/10 to-brand-warning/5 rounded-tl-xl rounded-br-xl border border-brand-warning/20">
                  <div className="w-3 h-3 bg-brand-warning rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-bold text-neutral-800">{((stats?.avgScore || 0) * 10).toFixed(0)}%</span>
                    <span className="text-neutral-600"> יעילות כללית</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Team Overview & Calls Table (4/5 = 80%) */}
          <div className="lg:col-span-4 space-y-6">


            {/* Team Calls in Bento Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-tl-xl rounded-br-xl bg-gradient-to-br from-brand-primary to-brand-primary-light flex items-center justify-center text-white shadow-lg">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-800">שיחות אחרונות</h2>
                    <p className="text-sm text-neutral-600">ניתוח מהיר של השיחות האחרונות</p>
                  </div>
                </div>
                <Link 
                  href="/dashboard/manager/all-calls"
                  className="text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors flex items-center gap-1"
                >
                  ראה הכל
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Compact Filters Section */}
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Search Input */}
                  <div>
                    <input
                      type="text"
                      placeholder="חפש שיחה..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm"
                    />
                  </div>

                  {/* Agent Filter */}
                  <div>
                    <select
                      value={agentFilter}
                      onChange={(e) => setAgentFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm"
                    >
                      <option value="all">כל הנציגים</option>
                      {agents.filter(agent => agent.role === 'agent').map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.fullName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Score Filter */}
                  <div>
                    <select
                      value={scoreFilter}
                      onChange={(e) => setScoreFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-sm"
                    >
                      <option value="all">כל הציונים</option>
                      <option value="high">גבוה (8+)</option>
                      <option value="medium">בינוני (6-8)</option>
                      <option value="low">נמוך (מתחת ל-6)</option>
                      <option value="none">ללא ציון</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCallTypeFilter('all');
                        setAgentFilter('all');
                        setScoreFilter('all');
                        setRedFlagFilter('all');
                        setStatusFilter('all');
                      }}
                      className="w-full px-3 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-all duration-200 border border-neutral-300"
                    >
                      נקה
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact Calls Table */}
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="px-4 py-3 border-b border-neutral-200 bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">
                      {filteredCalls.length} שיחות • לחץ על שיחה לצפייה בניתוח
                    </span>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <div className="w-2 h-2 bg-brand-success rounded-full"></div>
                      <span>מנותח</span>
                      <div className="w-2 h-2 bg-brand-warning rounded-full"></div>
                      <span>בתהליך</span>
                    </div>
                  </div>
                </div>

                {/* Table Content */}
                {filteredCalls.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-indigo-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Phone className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-700 mb-1">
                      {allCalls.length === 0 ? 'אין עדיין שיחות' : 'לא נמצאו שיחות מתאימות'}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      {allCalls.length === 0 
                        ? 'השיחות יופיעו כאן לאחר שהנציגים יעלו שיחות' 
                        : 'נסה לשנות את הסינונים או החיפוש'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Compact Card List */}
                    <div className="divide-y divide-neutral-100">
                      {filteredCalls.slice(0, 8).map((call, index) => (
                        <div 
                          key={call.id}
                          onClick={() => {
                            if (call.processing_status === 'completed') {
                              window.location.href = `/call/${call.id}`;
                            }
                          }}
                          className={`p-4 hover:bg-neutral-50 transition-all duration-200 ${
                            call.processing_status === 'completed' 
                              ? 'cursor-pointer' 
                              : 'cursor-default opacity-75'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            {/* Left side - Main info */}
                            <div className="flex items-center gap-3 flex-1">
                              {/* Status indicator */}
                              <div className="flex-shrink-0">
                                {call.processing_status === 'completed' ? (
                                  <div className="w-3 h-3 bg-brand-success rounded-full"></div>
                                ) : call.processing_status === 'pending' ? (
                                  <div className="w-3 h-3 bg-brand-warning rounded-full"></div>
                                ) : (
                                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                )}
                              </div>

                              {/* Agent */}
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-light flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                  {call.agent_name?.charAt(0) || '?'}
                                </div>
                                <span className="text-sm font-medium text-neutral-800 truncate">
                                  {call.agent_name}
                                </span>
                              </div>

                              {/* Customer */}
                              <div className="hidden sm:block text-sm text-neutral-600 truncate min-w-0 max-w-[120px]">
                                {call.customer_name || 'לקוח ללא שם'}
                              </div>

                              {/* Call type - mobile only */}
                              <div className="sm:hidden text-xs text-neutral-500 truncate">
                                {getCallTypeName(call.call_type)}
                              </div>
                            </div>

                            {/* Right side - Score and date */}
                            <div className="flex items-center gap-4 flex-shrink-0">
                              {/* Score */}
                              <div className="text-center">
                                {call.overall_score ? (
                                  <div className={`text-lg font-bold ${
                                    call.overall_score >= 8 ? 'text-brand-success' :
                                    call.overall_score >= 6 ? 'text-brand-warning' : 'text-red-600'
                                  }`}>
                                    {call.overall_score.toFixed(1)}
                                  </div>
                                ) : (
                                  <div className="text-neutral-400 text-sm">-</div>
                                )}
                              </div>

                              {/* Date */}
                              <div className="text-right">
                                <div className="text-xs text-neutral-500">
                                  {formatDate(call.created_at)}
                                </div>
                                {call.red_flag && (
                                  <AlertTriangle className="w-4 h-4 text-red-500 mt-1 ml-auto" />
                                )}
                              </div>

                              {/* Action button */}
                              {call.processing_status === 'completed' && (
                                <Link 
                                  href={`/call/${call.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-brand-primary to-brand-primary-light hover:from-brand-primary-dark hover:to-brand-primary text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-xs font-medium"
                                >
                                  <span>צפה</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Mobile additional info */}
                          <div className="sm:hidden mt-2 flex items-center gap-4 text-xs text-neutral-500">
                            <span>{call.customer_name || 'לקוח ללא שם'}</span>
                            <span>•</span>
                            <span>{getCallTypeName(call.call_type)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show more button if there are more calls */}
                    {filteredCalls.length > 8 && (
                      <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
                        <div className="text-center">
                          <Link 
                            href="/dashboard/manager/all-calls"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors"
                          >
                            ראה עוד {filteredCalls.length - 8} שיחות
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Team Members Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-tl-xl rounded-br-xl bg-gradient-to-br from-brand-primary to-brand-primary-light flex items-center justify-center text-white shadow-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-800">צוות החברה</h2>
                  <p className="text-sm text-neutral-600">רשימת כל חברי הצוות והביצועים שלהם</p>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-neutral-800">רשימת הצוות</h3>
                    <Link 
                      href="/team"
                      className="text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors flex items-center gap-1"
                    >
                      ניהול צוות
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="p-4">
                  {agents.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 rounded-tl-xl rounded-br-xl flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-neutral-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-700 mb-2">אין עדיין נציגים</h3>
                      <p className="text-neutral-500 mb-4">התחל לבנות את הצוות שלך</p>
                      <Link 
                        href="/team/add-agent" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-primary-light text-white rounded-tl-lg rounded-br-lg hover:from-brand-primary-dark hover:to-brand-primary transition-all duration-300 font-medium shadow-md text-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>הוסף נציג ראשון</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {agents.map((agent, index) => (
                        <div 
                          key={agent.id} 
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5 border border-neutral-200/50 rounded-tl-lg rounded-br-lg hover:from-brand-primary/10 hover:to-brand-secondary/10 transition-all duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-light flex items-center justify-center text-white font-bold shadow-md">
                              {agent.fullName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-800 text-sm">{agent.fullName}</div>
                              <div className="text-xs text-neutral-600 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-neutral-400 to-neutral-600 flex items-center justify-center text-white text-xs">
                                  {getRoleIcon(agent.role)}
                                </div>
                                {getRoleName(agent.role)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-neutral-800">{agent.totalCalls}</div>
                            <div className="text-xs text-neutral-600">שיחות</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* Insights Section - Full Width */}
        {insights.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-brand-secondary to-brand-secondary-dark flex items-center justify-center text-white shadow-sm">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-800">תובנות ניהוליות</h2>
                <p className="text-neutral-600">המלצות מבוססות נתונים לשיפור ביצועי הצוות</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {insights.map((insight) => (
                <div key={insight.id} className={`bg-white border-2 ${
                  insight.type === 'success' ? 'border-brand-success' :
                  insight.type === 'warning' ? 'border-brand-warning' :
                  'border-brand-primary'
                } rounded-tl-3xl rounded-br-3xl shadow-sm p-6`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-tr-lg rounded-bl-lg flex items-center justify-center ${
                      insight.type === 'success' ? 'bg-gradient-to-br from-brand-success to-brand-success-dark' :
                      insight.type === 'warning' ? 'bg-gradient-to-br from-brand-warning to-brand-warning-dark' :
                      'bg-gradient-to-br from-brand-primary to-brand-primary-dark'
                    }`}>
                      {insight.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
                      {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-white" />}
                      {insight.type === 'info' && <Activity className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1 text-neutral-800">{insight.title}</h4>
                      <p className="text-sm leading-relaxed mb-3 text-neutral-600">{insight.description}</p>
                      {insight.actionText && (
                        <Link 
                          href={insight.actionUrl || '#'}
                          className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                            insight.type === 'success' ? 'text-brand-success hover:text-brand-success-dark' :
                            insight.type === 'warning' ? 'text-brand-warning hover:text-brand-warning-dark' :
                            'text-brand-primary hover:text-brand-primary-dark'
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

        {/* Team Simulations Dashboard */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-r-4 border-purple-400">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">🎭 סימולציות הצוות</h2>
              <p className="text-gray-600">מעקב אחר התקדמות הצוות בסימולציות ואימונים</p>
            </div>
          </div>
          
          <SimulationsDashboard 
            userId={user?.id || ''}
            userRole="manager"
            companyId={user?.company_id}
          />
        </div>
                
      </div>
    </div>
  );
} 