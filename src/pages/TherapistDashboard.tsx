import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  MessageCircle,
  AlertCircle,
  Download,
  Filter,
  Search,
  BarChart3,
  Clock
} from 'lucide-react';

function TherapistDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'groups' | 'reports'>('overview');
  const [timeRange, setTimeRange] = useState('30');

  const mockStats = {
    totalPatients: 24,
    activeGroups: 6,
    weeklyEngagement: 78,
    completionRate: 85,
    alertsCount: 3,
    totalSessions: 156,
  };

  const mockPatients = [
    {
      id: '1',
      name: 'Sarah M.',
      groupName: 'Recovery Warriors',
      lastActive: '2 hours ago',
      progressTrend: 'improving',
      engagementScore: 92,
      alerts: 0,
    },
    {
      id: '2',
      name: 'Mike R.',
      groupName: 'Anxiety Support Circle',
      lastActive: '1 day ago',
      progressTrend: 'stable',
      engagementScore: 78,
      alerts: 1,
    },
    {
      id: '3',
      name: 'Lisa K.',
      groupName: 'Recovery Warriors',
      lastActive: '3 hours ago',
      progressTrend: 'improving',
      engagementScore: 89,
      alerts: 0,
    },
    {
      id: '4',
      name: 'David T.',
      groupName: 'Depression Support',
      lastActive: '5 days ago',
      progressTrend: 'declining',
      engagementScore: 45,
      alerts: 2,
    },
  ];

  const mockGroups = [
    {
      id: '1',
      name: 'Recovery Warriors',
      participants: 5,
      weeklyMessages: 87,
      avgEngagement: 85,
      facilitatorInsights: 'High engagement this week, members showing strong mutual support',
      lastSession: '2 hours ago',
    },
    {
      id: '2',
      name: 'Anxiety Support Circle',
      participants: 4,
      weeklyMessages: 62,
      avgEngagement: 72,
      facilitatorInsights: 'Focus on breathing exercises has been particularly effective',
      lastSession: '1 day ago',
    },
    {
      id: '3',
      name: 'Depression Support',
      participants: 6,
      weeklyMessages: 34,
      avgEngagement: 58,
      facilitatorInsights: 'Some members need additional encouragement to participate',
      lastSession: '3 days ago',
    },
  ];

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-success-600';
      case 'stable': return 'text-yellow-600';
      case 'declining': return 'text-error-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '↗️';
      case 'stable': return '➡️';
      case 'declining': return '↘️';
      default: return '➡️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Therapist Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor patient progress and group dynamics</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                title="Time Range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="input"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <Link to="/" className="btn-outline">
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'patients', label: 'Patients', icon: Users },
            { key: 'groups', label: 'Groups', icon: MessageCircle },
            { key: 'reports', label: 'Reports', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 font-medium ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Patients</p>
                    <p className="text-2xl font-bold text-gray-900">{mockStats.totalPatients}</p>
                  </div>
                  <Users className="text-primary-600" size={24} />
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Groups</p>
                    <p className="text-2xl font-bold text-gray-900">{mockStats.activeGroups}</p>
                  </div>
                  <MessageCircle className="text-primary-600" size={24} />
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Weekly Engagement</p>
                    <p className="text-2xl font-bold text-gray-900">{mockStats.weeklyEngagement}%</p>
                  </div>
                  <TrendingUp className="text-success-600" size={24} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="text-yellow-600" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Low Engagement Alert</p>
                      <p className="text-xs text-gray-600">David T. hasn't participated in 5 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <AlertCircle className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Progress Milestone</p>
                      <p className="text-xs text-gray-600">Sarah M. completed 30 days in Recovery Warriors</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Groups</h3>
                <div className="space-y-3">
                  {mockGroups.slice(0, 3).map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{group.name}</p>
                        <p className="text-sm text-gray-600">{group.participants} members</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-success-600">{group.avgEngagement}%</p>
                        <p className="text-xs text-gray-500">engagement</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="input pl-10"
                />
              </div>
              <button className="btn-outline flex items-center gap-2">
                <Filter size={20} />
                Filter
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Engagement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alerts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{patient.groupName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{patient.lastActive}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${getTrendColor(patient.progressTrend)}`}>
                            {getTrendIcon(patient.progressTrend)} {patient.progressTrend}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{patient.engagementScore}%</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {patient.alerts > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {patient.alerts}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {mockGroups.map((group) => (
                <div key={group.id} className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{group.lastSession}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{group.participants}</p>
                      <p className="text-sm text-gray-600">Participants</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{group.weeklyMessages}</p>
                      <p className="text-sm text-gray-600">Weekly Messages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-success-600">{group.avgEngagement}%</p>
                      <p className="text-sm text-gray-600">Avg Engagement</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">AI Facilitator Insights</h4>
                    <p className="text-sm text-gray-700">{group.facilitatorInsights}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="btn-outline p-4 text-left">
                  <div className="flex items-center gap-3">
                    <Download size={20} />
                    <div>
                      <p className="font-medium">Patient Progress Report</p>
                      <p className="text-sm text-gray-600">Individual patient metrics and trends</p>
                    </div>
                  </div>
                </button>
                <button className="btn-outline p-4 text-left">
                  <div className="flex items-center gap-3">
                    <Download size={20} />
                    <div>
                      <p className="font-medium">Group Analytics Report</p>
                      <p className="text-sm text-gray-600">Group engagement and effectiveness</p>
                    </div>
                  </div>
                </button>
                <button className="btn-outline p-4 text-left">
                  <div className="flex items-center gap-3">
                    <Download size={20} />
                    <div>
                      <p className="font-medium">Aggregate Insights</p>
                      <p className="text-sm text-gray-600">Overall program effectiveness</p>
                    </div>
                  </div>
                </button>
                <button className="btn-outline p-4 text-left">
                  <div className="flex items-center gap-3">
                    <Download size={20} />
                    <div>
                      <p className="font-medium">Compliance Report</p>
                      <p className="text-sm text-gray-600">HIPAA and data security metrics</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TherapistDashboard;