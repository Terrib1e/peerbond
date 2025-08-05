import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Users, MessageCircle, TrendingUp, Calendar, Clock } from 'lucide-react';
import StatsCard from '@/components/ui/StatsCard';
import PageHeader from '@/components/ui/PageHeader';
import MayaAccessCard from '@/components/MayaAccessCard';
import { Card, CardContent } from '@/components/ui/Card';
import { getPortalComponentClasses } from '@/lib/design-system';
import { cn } from '@/utils/cn';
import { groupService, type Group } from '@/services/groupService';
import { toast } from 'react-hot-toast';

function DashboardPage() {
  const { member } = useAuthStore();
  const portalType = 'member';
  const portalClasses = getPortalComponentClasses(portalType);
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [stats, setStats] = useState({
    activeGroups: 0,
    totalMessages: 0,
    weeklyProgress: 85,
    upcomingSessions: 0,
  });

  // Load member's groups on component mount
  useEffect(() => {
    loadMemberGroups();
  }, []);

  const loadMemberGroups = async () => {
    try {
      setIsLoadingGroups(true);
      const memberGroups = await groupService.getMemberGroups();
      setGroups(memberGroups);
      
      // Update stats based on real data
      setStats(prevStats => ({
        ...prevStats,
        activeGroups: memberGroups.length,
        totalMessages: memberGroups.reduce((total, group) => total + (group.unreadCount || 0), 0),
        upcomingSessions: memberGroups.filter(group => group.isActive).length
      }));
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast.error('Failed to load your groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Format time for display
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'No recent activity';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  // Real insights based on member activity
  const insights = [];
  
  // Add insights based on real data
  if (groups.length > 0) {
    insights.push({
      id: 'active-groups',
      title: 'Active in Groups',
      description: `You're participating in ${groups.length} support group${groups.length > 1 ? 's' : ''}`,
      type: 'success',
      date: 'Current'
    });
  }
  
  if (stats.totalMessages > 0) {
    insights.push({
      id: 'engagement',
      title: 'Community Engagement',
      description: `You have ${stats.totalMessages} new message${stats.totalMessages > 1 ? 's' : ''} this week`,
      type: 'info',
      date: 'This week'
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader
        title={`Welcome back, ${member?.firstName}!`}
        subtitle="Here's your support community overview"
        portalType={portalType}
      />

      {/* Stats Cards - Enhanced with portal theming */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Active Groups"
          value={stats.activeGroups}
          icon={Users}
          portalType={portalType}
          variant="interactive"
        />
        <StatsCard
          title="Messages This Week"
          value={stats.totalMessages}
          icon={MessageCircle}
          portalType={portalType}
          variant="interactive"
        />
        <StatsCard
          title="Weekly Progress"
          value={`${stats.weeklyProgress}%`}
          icon={TrendingUp}
          portalType={portalType}
          variant="interactive"
        />
        <StatsCard
          title="Upcoming Sessions"
          value={stats.upcomingSessions}
          icon={Calendar}
          portalType={portalType}
          variant="interactive"
        />
      </div>

      {/* Maya AI Access Card */}
      <div className="mb-8">
        <MayaAccessCard
          memberRole="member"
          variant="full"
          className="max-w-4xl mx-auto"
        />
      </div>

      {/* Main Content Grid - Enhanced with unified design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Groups Card */}
        <Card className={portalClasses.card('hover')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Active Groups</h2>
              <Link 
                to="/app/groups" 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {isLoadingGroups ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse p-4 rounded-lg border bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-48 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Yet</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't joined any support groups yet. Let Maya help you find the perfect group!
                  </p>
                  <Link 
                    to="/app/groups" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Find Groups
                  </Link>
                </div>
              ) : (
                groups.map((group) => (
                  <Link
                    key={group.id}
                    to={`/app/groups/${group.id}`}
                    className={cn(
                      'block p-4 rounded-lg border transition-all duration-200',
                      'hover:border-blue-300 hover:shadow-sm bg-white hover:bg-blue-50/30'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{group.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{group.memberCount} members</span>
                        {group.unreadCount && group.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 font-medium">
                            {group.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {group.lastMessage?.content || group.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <Clock size={12} className="mr-1" />
                        {formatTimeAgo(group.lastActivity || group.createdAt)}
                      </div>
                      <span className="capitalize text-xs bg-gray-100 px-2 py-1 rounded">
                        {group.type}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Insights Card */}
        <Card className={portalClasses.card('hover')}>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Insights</h2>
            <div className="space-y-4">
              {insights.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Join groups and engage with the community to see your insights here
                  </p>
                </div>
              ) : (
                insights.map((insight) => (
                <div 
                  key={insight.id} 
                  className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 transition-colors hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-600">{insight.description}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{insight.date}</span>
                  </div>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;