import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { toast } from 'react-hot-toast';

interface Session {
  id: string;
  title: string;
  type: 'individual' | 'group' | 'assessment' | 'crisis' | 'family';
  clientId?: string;
  clientName?: string;
  groupId?: string;
  groupName?: string;
  scheduledDate: string;
  duration: number; // in minutes
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  meetingType: 'in_person' | 'video' | 'phone';
  location?: string;
  meetingLink?: string;
  notes?: string;
  objectives?: string[];
  outcomes?: string[];
  followUpTasks?: string[];
  attendance?: Array<{
    clientId: string;
    clientName: string;
    status: 'present' | 'absent' | 'late';
    participationLevel: number; // 1-5 scale
  }>;
  billingCode?: string;
  insuranceApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SessionFilters {
  search: string;
  type: string;
  status: string;
  dateRange: string;
  clientId: string;
}

export default function SessionManagement() {
  const [filters, setFilters] = useState<SessionFilters>({
    search: '',
    type: 'all',
    status: 'all',
    dateRange: 'upcoming',
    clientId: 'all'
  });
  
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [calendarView, setCalendarView] = useState<'list' | 'calendar'>('list');

  const queryClient = useQueryClient();

  // Fetch sessions
  const { data: sessionsData } = useQuery({
    queryKey: ['therapist-sessions', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.dateRange !== 'all' && { dateRange: filters.dateRange }),
        ...(filters.clientId !== 'all' && { clientId: filters.clientId })
      });
      
      const response = await api.get(`/therapist/sessions?${params}`);
      return response as any;
    },
    refetchInterval: 30000
  });

  // Fetch clients for filtering
  const { data: clientsData } = useQuery({
    queryKey: ['therapist-clients-simple'],
    queryFn: async () => {
      const response = await api.get('/therapist/clients?limit=1000&fields=id,firstName,lastName');
      return response as any;
    }
  });

  const sessions = sessionsData?.sessions || [];
  const totalSessions = sessionsData?.total || 0;
  const totalPages = Math.ceil(totalSessions / pageSize);
  const clients = clientsData?.clients || [];

  // Create session
  const createSessionMutation = useMutation({
    mutationFn: (sessionData: Partial<Session>) =>
      api.post('/therapist/sessions', sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-sessions'] });
      setShowCreateDialog(false);
      toast.success('Session created successfully');
    },
    onError: () => toast.error('Failed to create session')
  });

  // Update session
  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, updates }: { sessionId: string; updates: Partial<Session> }) =>
      api.patch(`/therapist/sessions/${sessionId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-sessions'] });
      toast.success('Session updated successfully');
    },
    onError: () => toast.error('Failed to update session')
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: ({ sessionId, notes, outcomes }: { sessionId: string; notes: string; outcomes: string[] }) =>
      api.post(`/therapist/sessions/${sessionId}/complete`, { notes, outcomes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-sessions'] });
      toast.success('Session completed successfully');
    },
    onError: () => toast.error('Failed to complete session')
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'no_show': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <Calendar className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'individual': return '👤';
      case 'group': return '👥';
      case 'assessment': return '📋';
      case 'crisis': return '🚨';
      case 'family': return '👨‍👩‍👧‍👦';
      default: return '📅';
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

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getUpcomingSessions = () => {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return sessions.filter((session: Session) => {
      const sessionDate = new Date(session.scheduledDate);
      return sessionDate >= now && sessionDate <= next24Hours && session.status === 'scheduled';
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Session Management</h2>
          <p className="text-gray-600 mt-1">Schedule, conduct, and track therapy sessions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCalendarView('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                calendarView === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setCalendarView('calendar')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                calendarView === 'calendar' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar View
            </button>
          </div>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Schedule
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Session</DialogTitle>
              </DialogHeader>
              <CreateSessionForm 
                clients={clients}
                onSubmit={(data) => createSessionMutation.mutate(data)}
                onClose={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter((s: Session) => 
                    new Date(s.scheduledDate).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming (24h)</p>
                <p className="text-2xl font-bold text-blue-600">{getUpcomingSessions().length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {sessions.filter((s: Session) => s.status === 'completed').length}
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
                <p className="text-sm text-gray-600">No Shows</p>
                <p className="text-2xl font-bold text-orange-600">
                  {sessions.filter((s: Session) => s.status === 'no_show').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search sessions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <select
              title="Session Type"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="individual">Individual</option>
              <option value="group">Group</option>
              <option value="assessment">Assessment</option>
              <option value="crisis">Crisis</option>
              <option value="family">Family</option>
            </select>
            
            <select
              title="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
            
            <select
              title="Date Range"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="past">Past</option>
              <option value="all">All Time</option>
            </select>
            
            <select
              title="Client"
              value={filters.clientId}
              onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Clients</option>
              {clients.map((client: any) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </select>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions ({totalSessions})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client/Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meeting Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session: Session) => {
                  const { date, time } = formatDateTime(session.scheduledDate);
                  return (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-3">{getTypeIcon(session.type)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{session.title}</div>
                            <div className="text-sm text-gray-500">{session.type}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {session.clientName || session.groupName || 'Unassigned'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{date}</div>
                        <div className="text-sm text-gray-500">{time}</div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{session.duration} min</div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMeetingTypeIcon(session.meetingType)}
                          <span className="text-sm text-gray-900">{session.meetingType}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(session.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                            {session.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSession(session);
                              setShowSessionDetail(true);
                            }}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          
                          {session.meetingLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(session.meetingLink, '_blank')}
                            >
                              <Video className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalSessions)} of {totalSessions} sessions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Detail Dialog */}
      {showSessionDetail && selectedSession && (
        <Dialog open={showSessionDetail} onOpenChange={setShowSessionDetail}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Session Details: {selectedSession.title}</DialogTitle>
            </DialogHeader>
            <SessionDetailView 
              session={selectedSession}
              onUpdate={(updates) => updateSessionMutation.mutate({ 
                sessionId: selectedSession.id, 
                updates 
              })}
              onComplete={(notes, outcomes) => completeSessionMutation.mutate({
                sessionId: selectedSession.id,
                notes,
                outcomes
              })}
              onClose={() => setShowSessionDetail(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Create Session Form Component
function CreateSessionForm({ 
  clients, 
  onSubmit, 
  onClose 
}: { 
  clients: any[]; 
  onSubmit: (data: Partial<Session>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'individual',
    clientId: '',
    scheduledDate: '',
    duration: 50,
    meetingType: 'in_person',
    location: '',
    objectives: ['']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: formData.title,
      type: formData.type as Session['type'],
      clientId: formData.clientId,
      scheduledDate: formData.scheduledDate,
      duration: formData.duration,
      meetingType: formData.meetingType as Session['meetingType'],
      location: formData.location,
      objectives: formData.objectives.filter(obj => obj.trim() !== ''),
      status: 'scheduled' as Session['status']
    });
  };

  const addObjective = () => {
    setFormData({
      ...formData,
      objectives: [...formData.objectives, '']
    });
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...formData.objectives];
    newObjectives[index] = value;
    setFormData({
      ...formData,
      objectives: newObjectives
    });
  };

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Weekly Check-in, Initial Assessment"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
          <select
            title="Session Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="individual">Individual</option>
            <option value="group">Group</option>
            <option value="assessment">Assessment</option>
            <option value="crisis">Crisis</option>
            <option value="family">Family</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select
            title="Client"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={formData.type === 'individual'}
          >
            <option value="">Select a client</option>
            {clients.map((client: any) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
          <Input
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
          <Input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            min="15"
            max="180"
            step="5"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
          <select
            title="Meeting Type"
            value={formData.meetingType}
            onChange={(e) => setFormData({ ...formData, meetingType: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="in_person">In Person</option>
            <option value="video">Video Call</option>
            <option value="phone">Phone Call</option>
          </select>
        </div>
      </div>

      {formData.meetingType === 'in_person' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Office address or room number"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Session Objectives</label>
        <div className="space-y-2">
          {formData.objectives.map((objective, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={objective}
                onChange={(e) => updateObjective(index, e.target.value)}
                placeholder="Enter session objective"
              />
              {formData.objectives.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeObjective(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addObjective}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Objective
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Schedule Session
        </Button>
      </div>
    </form>
  );
}

// Session Detail View Component
function SessionDetailView({ 
  session, 
  onUpdate, 
  onComplete, 
  onClose 
}: { 
  session: Session;
  onUpdate: (updates: Partial<Session>) => void;
  onComplete: (notes: string, outcomes: string[]) => void;
  onClose: () => void;
}) {
  const [sessionNotes, setSessionNotes] = useState(session.notes || '');
  const [outcomes, setOutcomes] = useState<string[]>(session.outcomes || ['']);

  const addOutcome = () => setOutcomes([...outcomes, '']);
  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
  };
  const removeOutcome = (index: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== index));
  };

  const { date, time } = formatDateTime(session.scheduledDate);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'no_show': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Session Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Type</span>
                <span className="text-sm font-medium">{session.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Date</span>
                <span className="text-sm font-medium">{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Time</span>
                <span className="text-sm font-medium">{time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Duration</span>
                <span className="text-sm font-medium">{session.duration} min</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Client/Group</h4>
            <div className="space-y-2">
              <p className="text-sm font-medium">{session.clientName || session.groupName}</p>
              <p className="text-sm text-gray-600">{session.meetingType}</p>
              {session.location && (
                <p className="text-sm text-gray-600">{session.location}</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Status</h4>
            <div className="flex items-center gap-2 mb-3">
              {getStatusIcon(session.status)}
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                {session.status.replace('_', ' ')}
              </span>
            </div>
            {session.status === 'scheduled' && (
              <Button
                size="sm"
                onClick={() => onUpdate({ status: 'in_progress' })}
                className="w-full"
              >
                Start Session
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Objectives */}
      {session.objectives && session.objectives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {session.objectives.map((objective, index) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm">{objective}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Session Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Session Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Document session progress, client responses, observations..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={6}
          />
        </CardContent>
      </Card>

      {/* Outcomes */}
      {session.status === 'in_progress' || session.status === 'completed' ? (
        <Card>
          <CardHeader>
            <CardTitle>Session Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outcomes.map((outcome, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={outcome}
                    onChange={(e) => updateOutcome(index, e.target.value)}
                    placeholder="Enter session outcome or achievement"
                  />
                  {outcomes.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOutcome(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOutcome}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Outcome
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t">
        {session.status === 'in_progress' && (
          <Button
            onClick={() => onComplete(sessionNotes, outcomes.filter(o => o.trim() !== ''))}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Session
          </Button>
        )}
        
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Edit Session
        </Button>
        
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Notes
        </Button>
        
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

function formatDateTime(dateTime: string) {
  const date = new Date(dateTime);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}