import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Users, MessageCircle, TrendingUp, Calendar, Clock } from 'lucide-react';
import StatsCard from '@/components/ui/StatsCard';
import PageHeader from '@/components/ui/PageHeader';

function DashboardPage() {
  const { user } = useAuthStore();
  const [stats] = useState({
    activeGroups: 2,
    totalMessages: 47,
    weeklyProgress: 85,
    upcomingSessions: 3,
  });

  const mockGroups = [
    {
      id: '1',
      name: 'Recovery Warriors',
      lastMessage: 'Great session today everyone!',
      lastActivity: '2 hours ago',
      members: 5,
      unread: 2,
    },
    {
      id: '2',
      name: 'Anxiety Support Circle',
      lastMessage: 'Thanks for the breathing exercise tip',
      lastActivity: '1 day ago',
      members: 4,
      unread: 0,
    },
  ];

  const mockInsights = [
    {
      id: '1',
      title: 'Progress Milestone',
      description: 'You\'ve been active in groups for 2 weeks straight!',
      type: 'success',
      date: 'Today',
    },
    {
      id: '2',
      title: 'Engagement Tip',
      description: 'Your group engagement has increased by 20% this week',
      type: 'info',
      date: 'Yesterday',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader
        title={`Welcome back, ${user?.firstName}!`}
        subtitle="Here's your support community overview"
        portalType="member"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Active Groups"
          value={stats.activeGroups}
          icon={Users}
          portalType="member"
        />
        <StatsCard
          title="Messages This Week"
          value={stats.totalMessages}
          icon={MessageCircle}
          portalType="member"
        />
        <StatsCard
          title="Weekly Progress"
          value={`${stats.weeklyProgress}%`}
          icon={TrendingUp}
          portalType="member"
        />
        <StatsCard
          title="Upcoming Sessions"
          value={stats.upcomingSessions}
          icon={Calendar}
          portalType="member"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Active Groups</h2>
            <Link to="/app/groups" className="text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {mockGroups.map((group) => (
              <Link
                key={group.id}
                to={`/app/groups/${group.id}`}
                className="block p-4 rounded-lg border hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{group.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{group.members} members</span>
                    {group.unread > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1">
                        {group.unread}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{group.lastMessage}</p>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock size={12} className="mr-1" />
                  {group.lastActivity}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Insights</h2>
          <div className="space-y-4">
            {mockInsights.map((insight) => (
              <div key={insight.id} className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">{insight.title}</h3>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">{insight.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;