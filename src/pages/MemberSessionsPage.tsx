import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  User,
  Users,
  CheckCircle,
  AlertCircle,
  Plus,
  MessageCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface MemberSession {
  id: string;
  title: string;
  type: 'individual' | 'group' | 'assessment';
  therapistName: string;
  scheduledDate: string;
  duration: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  meetingType: 'in_person' | 'video' | 'phone';
  meetingLink?: string;
  location?: string;
  notes?: string;
}

export default function MemberSessionsPage() {
  const { member: _member } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  // Fetch member's sessions
  const { data: sessionsData, isLoading: _isLoading } = useQuery({
    queryKey: ['member-sessions', filter],
    queryFn: async () => {
      // Mock data for member sessions
      const mockSessions: MemberSession[] = [
        {
          id: 'session-1',
          title: 'Weekly Check-in',
          type: 'individual',
          therapistName: 'Dr. Sarah Wilson',
          scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          duration: 50,
          status: 'upcoming',
          meetingType: 'video',
          meetingLink: 'https://meet.example.com/session-1'
        },
        {
          id: 'session-2',
          title: 'Recovery Warriors Group Session',
          type: 'group',
          therapistName: 'Dr. Michael Chen',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
          duration: 90,
          status: 'upcoming',
          meetingType: 'video',
          meetingLink: 'https://meet.example.com/group-session-1'
        },
        {
          id: 'session-3',
          title: 'Progress Assessment',
          type: 'assessment',
          therapistName: 'Dr. Sarah Wilson',
          scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
          duration: 60,
          status: 'completed',
          meetingType: 'in_person',
          location: 'Wellness Center, Room 204',
          notes: 'Completed PHQ-9 and GAD-7 assessments. Showing good progress.'
        }
      ];

      return { sessions: mockSessions };
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const sessions = sessionsData?.sessions || [];
  const filteredSessions = sessions.filter(session => 
    filter === 'all' || session.status === filter
  );

  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');
  const nextSession = upcomingSessions.sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  )[0];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Calendar className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'individual': return <User className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      case 'assessment': return <CheckCircle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getMeetingTypeIcon = (meetingType: string) => {
    switch (meetingType) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'in_person': return <MapPin className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntilSession = (dateString: string) => {
    const sessionDate = new Date(dateString);
    const now = new Date();
    const diffMs = sessionDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours <= 0) return 'Session time';
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.ceil(diffHours / 24)}d`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
        <p className="text-gray-600 mt-2">Manage your therapy sessions and appointments</p>
      </div>

      {/* Next Session Card */}
      {nextSession && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-1">Next Session</h3>
                <p className="text-blue-700 mb-2">{nextSession.title}</p>
                <div className="flex items-center gap-4 text-sm text-blue-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(nextSession.scheduledDate)} at {formatTime(nextSession.scheduledDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getMeetingTypeIcon(nextSession.meetingType)}
                    <span className="capitalize">{nextSession.meetingType}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{nextSession.therapistName}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {getTimeUntilSession(nextSession.scheduledDate)}
                </div>
                <div className="text-sm text-blue-600">until session</div>
                {nextSession.meetingLink && (
                  <Button
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.open(nextSession.meetingLink, '_blank')}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Join Session
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => s.status === 'upcoming').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(sessions.reduce((total, s) => total + s.duration, 0) / 60)}h
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'completed', label: 'Completed' },
          { key: 'all', label: 'All Sessions' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(session.type)}
                      <h3 className="font-semibold text-gray-900">{session.title}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                      {getStatusIcon(session.status)}
                      {session.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(session.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(session.scheduledDate)} ({session.duration}min)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getMeetingTypeIcon(session.meetingType)}
                      <span className="capitalize">{session.meetingType}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{session.therapistName}</span>
                    </div>
                  </div>

                  {session.location && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{session.location}</span>
                    </div>
                  )}

                  {session.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                      <strong>Notes:</strong> {session.notes}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  {session.status === 'upcoming' && session.meetingLink && (
                    <Button
                      onClick={() => window.open(session.meetingLink, '_blank')}
                      size="sm"
                    >
                      <Video className="w-4 h-4 mr-1" />
                      Join
                    </Button>
                  )}
                  
                  {session.status === 'upcoming' && (
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {filter !== 'all' ? filter : ''} sessions found
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'upcoming' 
                ? "You don't have any upcoming sessions scheduled." 
                : filter === 'completed'
                ? "You haven't completed any sessions yet."
                : "You don't have any sessions scheduled."
              }
            </p>
            {filter === 'upcoming' && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Request Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}