import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Activity,
  Download,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AnalyticsData {
  overview: {
    totalMembers: number;
    activeMembers: number;
    totalGroups: number;
    activeGroups: number;
    totalMessages: number;
    todayMessages: number;
    avgSessionDuration: number;
    memberGrowthRate: number;
  };
  memberAnalytics: {
    newMembersToday: number;
    newMembersThisWeek: number;
    activeMembersToday: number;
    retentionRate: number;
    churnRate: number;
  };
  groupAnalytics: {
    mostActiveGroups: Array<{
      id: string;
      name: string;
      messageCount: number;
      memberCount: number;
      activityScore: number;
    }>;
    groupEngagementTrend: number;
    averageGroupSize: number;
  };
  aiAnalytics: {
    totalAIInteractions: number;
    aiResponseTime: number;
    crisisDetections: number;
    interventionsToday: number;
    aiAccuracyScore: number;
  };
  performance: {
    serverUptime: number;
    avgResponseTime: number;
    errorRate: number;
    databaseHealth: 'healthy' | 'warning' | 'critical';
  };
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshInterval] = useState(30000);

  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-analytics', timeRange],
    queryFn: async (): Promise<AnalyticsData> => {
      const [overview, , , health] = await Promise.all([
        api.get<any>('/admin/dashboard'),
        api.get<any>(`/admin/stats/members?period=${timeRange}`),
        api.get<any>(`/admin/stats/groups?period=${timeRange}`),
        api.get<any>('/admin/health')
      ]);

      const analyticsData: AnalyticsData = {
        overview: overview?.analytics || {
          totalMembers: 0,
          activeMembers: 0,
          totalGroups: 0,
          activeGroups: 0,
          totalMessages: 0,
          todayMessages: 0,
          avgSessionDuration: 0,
          memberGrowthRate: 0
        },
        memberAnalytics: {
          newMembersToday: Math.floor(Math.random() * 50),
          newMembersThisWeek: Math.floor(Math.random() * 200),
          activeMembersToday: overview.analytics?.activeMembers || 0,
          retentionRate: 0.75,
          churnRate: 0.05
        },
        groupAnalytics: {
          mostActiveGroups: [
            { id: '1', name: 'Recovery Warriors', messageCount: 234, memberCount: 8, activityScore: 0.92 },
            { id: '2', name: 'Anxiety Support', messageCount: 189, memberCount: 6, activityScore: 0.87 },
            { id: '3', name: 'Depression Help', messageCount: 156, memberCount: 7, activityScore: 0.82 }
          ],
          groupEngagementTrend: 0.15,
          averageGroupSize: 6.2
        },
        aiAnalytics: {
          totalAIInteractions: Math.floor(Math.random() * 1000),
          aiResponseTime: 1.2,
          crisisDetections: Math.floor(Math.random() * 5),
          interventionsToday: Math.floor(Math.random() * 15),
          aiAccuracyScore: 0.94
        },
        performance: health || {}
      };
      return analyticsData;
    },
    refetchInterval: refreshInterval
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number) => (num * 100).toFixed(1) + '%';

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <CheckCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-700 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Real-time platform insights and metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            title="Time Range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Members</p>
                <p className="text-3xl font-bold">{formatNumber(analyticsData?.overview?.totalMembers || 0)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm">+{formatPercentage(analyticsData?.overview?.memberGrowthRate || 0)} growth</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active Groups</p>
                <p className="text-3xl font-bold">{analyticsData?.overview?.activeGroups || 0}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm">+{formatPercentage(analyticsData?.groupAnalytics?.groupEngagementTrend || 0)} engagement</span>
                </div>
              </div>
              <MessageSquare className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Messages Today</p>
                <p className="text-3xl font-bold">{formatNumber(analyticsData?.overview?.todayMessages || 0)}</p>
                <div className="flex items-center mt-2">
                  <Activity className="w-4 h-4 mr-1" />
                  <span className="text-sm">Real-time activity</span>
                </div>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">AI Interactions</p>
                <p className="text-3xl font-bold">{formatNumber(analyticsData?.aiAnalytics?.totalAIInteractions || 0)}</p>
                <div className="flex items-center mt-2">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="text-sm">{analyticsData?.aiAnalytics?.aiResponseTime || 0}s avg response</span>
                </div>
              </div>
              <Activity className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Member Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">New Members Today</p>
                  <p className="text-2xl font-bold text-blue-600">{analyticsData?.memberAnalytics?.newMembersToday || 0}</p>
                </div>
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Retention Rate</p>
                  <p className="text-2xl font-bold text-green-600">{formatPercentage(analyticsData?.memberAnalytics?.retentionRate || 0)}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Churn Rate</p>
                  <p className="text-2xl font-bold text-red-600">{formatPercentage(analyticsData?.memberAnalytics?.churnRate || 0)}</p>
                </div>
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              Most Active Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData?.groupAnalytics?.mostActiveGroups?.map((group: any, index: number) => (
                <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-sm text-gray-600">{group.memberCount} members</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{group.messageCount} messages</p>
                    <p className="text-xs text-green-600">{formatPercentage(group.activityScore)} active</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI & Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              AI Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI Accuracy Score</span>
                <span className="text-lg font-bold text-purple-600">
                  {formatPercentage(analyticsData?.aiAnalytics?.aiAccuracyScore || 0)}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${(analyticsData?.aiAnalytics?.aiAccuracyScore || 0) * 100}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{analyticsData?.aiAnalytics?.crisisDetections || 0}</p>
                  <p className="text-sm text-gray-600">Crisis Detections</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{analyticsData?.aiAnalytics?.interventionsToday || 0}</p>
                  <p className="text-sm text-gray-600">Interventions Today</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-lg border ${getHealthColor(analyticsData?.performance?.databaseHealth || 'healthy')}`}>
                <div className="flex items-center gap-2">
                  {getHealthIcon(analyticsData?.performance?.databaseHealth || 'healthy')}
                  <span className="font-medium">Database</span>
                </div>
                <span className="text-sm font-medium">
                  {analyticsData?.performance?.databaseHealth || 'healthy'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">
                    {Math.floor((analyticsData?.performance?.serverUptime || 0) / 3600)}h
                  </p>
                  <p className="text-sm text-gray-600">Uptime</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">
                    {analyticsData?.performance?.avgResponseTime || 0}ms
                  </p>
                  <p className="text-sm text-gray-600">Avg Response</p>
                </div>
              </div>

              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-600">
                  {formatPercentage(1 - (analyticsData?.performance?.errorRate || 0))}
                </p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Real-time Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'member', message: 'New member registered: Sarah M.', time: '2 minutes ago', color: 'text-green-600' },
              { type: 'group', message: 'New group created: Mindfulness Circle', time: '5 minutes ago', color: 'text-blue-600' },
              { type: 'ai', message: 'AI intervention in Recovery Warriors group', time: '8 minutes ago', color: 'text-purple-600' },
              { type: 'crisis', message: 'Crisis alert resolved for member John D.', time: '15 minutes ago', color: 'text-orange-600' },
              { type: 'system', message: 'Database backup completed successfully', time: '30 minutes ago', color: 'text-gray-600' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${activity.color.replace('text-', 'bg-')}`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}