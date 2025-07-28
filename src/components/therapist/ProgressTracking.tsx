import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  Heart,
  Brain,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { toast } from 'react-hot-toast';

interface Assessment {
  id: string;
  clientId: string;
  clientName: string;
  type: 'phq9' | 'gad7' | 'custom' | 'beck_depression' | 'beck_anxiety' | 'dass21';
  name: string;
  score: number;
  maxScore: number;
  interpretation: string;
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  administeredDate: string;
  administeredBy: string;
  notes?: string;
  followUpRequired: boolean;
  previousScore?: number;
  percentChange?: number;
}

interface Goal {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  category: 'behavioral' | 'emotional' | 'cognitive' | 'social' | 'physical';
  targetDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'abandoned';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number; // 0-100
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedDate?: string;
    notes?: string;
  }>;
  lastUpdated: string;
  createdDate: string;
}

interface ProgressFilters {
  search: string;
  clientId: string;
  timeRange: string;
  category: string;
  severity: string;
}

export default function ProgressTracking() {
  const [activeTab, setActiveTab] = useState<'assessments' | 'goals' | 'analytics'>('assessments');
  const [filters, setFilters] = useState<ProgressFilters>({
    search: '',
    clientId: 'all',
    timeRange: '3months',
    category: 'all',
    severity: 'all'
  });
  
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [currentPage] = useState(1);
  const [pageSize] = useState(20);

  const queryClient = useQueryClient();

  // Fetch assessments
  const { data: assessmentsData } = useQuery({
    queryKey: ['therapist-assessments', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.clientId !== 'all' && { clientId: filters.clientId }),
        ...(filters.timeRange !== 'all' && { timeRange: filters.timeRange }),
        ...(filters.severity !== 'all' && { severity: filters.severity })
      });
      
      const response = await api.get(`/therapist/assessments?${params}`);
      return response as any;
    },
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Fetch goals
  const { data: goalsData } = useQuery({
    queryKey: ['therapist-goals', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters.search && { search: filters.search }),
        ...(filters.clientId !== 'all' && { clientId: filters.clientId }),
        ...(filters.category !== 'all' && { category: filters.category })
      });
      
      const response = await api.get(`/therapist/goals?${params}`);
      return response as any;
    },
    refetchInterval: 300000
  });

  // Fetch clients for filtering
  const { data: clientsData } = useQuery({
    queryKey: ['therapist-clients-simple'],
    queryFn: async () => {
      const response = await api.get('/therapist/clients?limit=1000&fields=id,firstName,lastName');
      return response as any;
    }
  });

  // Fetch progress analytics
  useQuery({
    queryKey: ['therapist-progress-analytics', filters.timeRange, filters.clientId],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange: filters.timeRange,
        ...(filters.clientId !== 'all' && { clientId: filters.clientId })
      });
      
      const response = await api.get(`/therapist/progress-analytics?${params}`);
      return response as any;
    }
  });

  const assessments = assessmentsData?.assessments || [];
  const goals = goalsData?.goals || [];
  const clients = clientsData?.clients || [];

  // Create assessment
  const createAssessmentMutation = useMutation({
    mutationFn: (assessmentData: Partial<Assessment>) =>
      api.post('/therapist/assessments', assessmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-assessments'] });
      setShowAssessmentDialog(false);
      toast.success('Assessment created successfully');
    },
    onError: () => toast.error('Failed to create assessment')
  });

  // Create goal
  const createGoalMutation = useMutation({
    mutationFn: (goalData: Partial<Goal>) =>
      api.post('/therapist/goals', goalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-goals'] });
      setShowGoalDialog(false);
      toast.success('Goal created successfully');
    },
    onError: () => toast.error('Failed to create goal')
  });

  // Update goal progress
  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, progress }: { goalId: string; progress: number }) =>
      api.patch(`/therapist/goals/${goalId}`, { progress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-goals'] });
      toast.success('Goal progress updated');
    },
    onError: () => toast.error('Failed to update goal')
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minimal': return 'bg-green-100 text-green-800';
      case 'mild': return 'bg-yellow-100 text-yellow-800';
      case 'moderate': return 'bg-orange-100 text-orange-800';
      case 'severe': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'abandoned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'behavioral': return <Activity className="w-4 h-4" />;
      case 'emotional': return <Heart className="w-4 h-4" />;
      case 'cognitive': return <Brain className="w-4 h-4" />;
      case 'social': return <Users className="w-4 h-4" />;
      case 'physical': return <Target className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (percentChange: number | undefined) => {
    if (!percentChange) return <Activity className="w-4 h-4 text-gray-500" />;
    if (percentChange > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (percentChange < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Progress Tracking</h2>
          <p className="text-gray-600 mt-1">Monitor client assessments, goals, and therapeutic outcomes</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Progress Report
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'assessments', label: 'Assessments', icon: BarChart3 },
          { key: 'goals', label: 'Goals & Milestones', icon: Target },
          { key: 'analytics', label: 'Progress Analytics', icon: PieChart },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 font-medium ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
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
            
            <select
              title="Time Range"
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1month">Last Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
              <option value="all">All Time</option>
            </select>
            
            {activeTab === 'goals' && (
              <select
                title="Category"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="behavioral">Behavioral</option>
                <option value="emotional">Emotional</option>
                <option value="cognitive">Cognitive</option>
                <option value="social">Social</option>
                <option value="physical">Physical</option>
              </select>
            )}
            
            {activeTab === 'assessments' && (
              <select
                title="Severity"
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Severities</option>
                <option value="minimal">Minimal</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            )}
            
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assessments Tab */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          {/* Assessment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Assessments</p>
                    <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Severe Cases</p>
                    <p className="text-2xl font-bold text-red-600">
                      {assessments.filter((a: Assessment) => a.severity === 'severe').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Improving</p>
                    <p className="text-2xl font-bold text-green-600">
                      {assessments.filter((a: Assessment) => (a.percentChange || 0) < 0).length}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Follow-up Required</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {assessments.filter((a: Assessment) => a.followUpRequired).length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assessments Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Assessments</CardTitle>
                <Dialog open={showAssessmentDialog} onOpenChange={setShowAssessmentDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Assessment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Assessment</DialogTitle>
                    </DialogHeader>
                    <CreateAssessmentForm 
                      clients={clients}
                      onSubmit={(data) => createAssessmentMutation.mutate(data)}
                      onClose={() => setShowAssessmentDialog(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assessment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assessments.map((assessment: Assessment) => (
                      <tr key={assessment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{assessment.clientName}</div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{assessment.name}</div>
                            <div className="text-sm text-gray-500">{assessment.type.toUpperCase()}</div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {assessment.score}/{assessment.maxScore}
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${(assessment.score / assessment.maxScore) * 100}%` }}
                            />
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(assessment.severity)}`}>
                            {assessment.severity}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getTrendIcon(assessment.percentChange)}
                            {assessment.percentChange && (
                              <span className={`text-sm ${
                                assessment.percentChange > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {assessment.percentChange > 0 ? '+' : ''}{assessment.percentChange.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(assessment.administeredDate).toLocaleDateString()}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          {/* Goals Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Goals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {goals.filter((g: Goal) => g.status === 'in_progress').length}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {goals.filter((g: Goal) => g.status === 'completed').length}
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
                    <p className="text-sm text-gray-600">Critical Priority</p>
                    <p className="text-2xl font-bold text-red-600">
                      {goals.filter((g: Goal) => g.priority === 'critical').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Progress</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(goals.reduce((acc: number, g: Goal) => acc + g.progress, 0) / goals.length) || 0}%
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Grid */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Client Goals</h3>
            <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Goal</DialogTitle>
                </DialogHeader>
                <CreateGoalForm 
                  clients={clients}
                  onSubmit={(data) => createGoalMutation.mutate(data)}
                  onClose={() => setShowGoalDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal: Goal) => (
              <Card key={goal.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(goal.category)}
                      <div>
                        <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                        <p className="text-sm text-gray-600">{goal.clientName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(goal.priority)}`} />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGoalStatusColor(goal.status)}`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4">{goal.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Milestones ({goal.milestones.filter(m => m.completed).length}/{goal.milestones.length})</p>
                    <div className="space-y-1">
                      {goal.milestones.slice(0, 3).map((milestone: any) => (
                        <div key={milestone.id} className="flex items-center gap-2 text-sm">
                          {milestone.completed ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={milestone.completed ? 'line-through text-gray-500' : 'text-gray-700'}>
                            {milestone.title}
                          </span>
                        </div>
                      ))}
                      {goal.milestones.length > 3 && (
                        <p className="text-xs text-gray-500">+{goal.milestones.length - 3} more</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                    <span>Updated: {new Date(goal.lastUpdated).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const newProgress = Math.min(100, goal.progress + 10);
                        updateGoalMutation.mutate({ goalId: goal.id, progress: newProgress });
                      }}
                    >
                      +10%
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Placeholder for charts - would integrate with chart library */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Assessment Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Assessment trend chart would be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Goal Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Goal distribution chart would be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Progress Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Progress metrics chart would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// Create Assessment Form Component
function CreateAssessmentForm({ 
  clients, 
  onSubmit, 
  onClose 
}: { 
  clients: any[]; 
  onSubmit: (data: Partial<Assessment>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    clientId: '',
    type: 'phq9',
    score: 0,
    maxScore: 27,
    notes: ''
  });

  const assessmentTypes: any = {
    phq9: { name: 'PHQ-9 (Depression)', maxScore: 27 },
    gad7: { name: 'GAD-7 (Anxiety)', maxScore: 21 },
    beck_depression: { name: 'Beck Depression Inventory', maxScore: 63 },
    beck_anxiety: { name: 'Beck Anxiety Inventory', maxScore: 63 },
    dass21: { name: 'DASS-21', maxScore: 126 },
    custom: { name: 'Custom Assessment', maxScore: 100 }
  };

  const getSeverity = (_type: string, score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage < 25) return 'minimal';
    if (percentage < 50) return 'mild';
    if (percentage < 75) return 'moderate';
    return 'severe';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedType = assessmentTypes[formData.type as keyof typeof assessmentTypes];
    onSubmit({
      clientId: formData.clientId,
      type: formData.type as Assessment['type'],
      score: formData.score,
      notes: formData.notes,
      name: selectedType.name,
      maxScore: formData.type === 'custom' ? formData.maxScore : selectedType.maxScore,
      severity: getSeverity(formData.type, formData.score, selectedType.maxScore) as Assessment['severity'],
      administeredDate: new Date().toISOString(),
      followUpRequired: getSeverity(formData.type, formData.score, selectedType.maxScore) === 'severe'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select
            title="Client"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type</label>
          <select
            title="Assessment Type"
            value={formData.type}
            onChange={(e) => {
              const type = e.target.value;
              const typeInfo = assessmentTypes[type as keyof typeof assessmentTypes];
              setFormData({ 
                ...formData, 
                type, 
                maxScore: typeInfo.maxScore,
                score: 0
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(assessmentTypes).map(([key, value]) => (
              <option key={key} value={key}>{(value as any).name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
          <Input
            type="number"
            value={formData.score}
            onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) })}
            min="0"
            max={formData.maxScore}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
          <Input
            type="number"
            value={formData.maxScore}
            onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
            disabled={formData.type !== 'custom'}
            min="1"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional observations or notes..."
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Create Assessment
        </Button>
      </div>
    </form>
  );
}

// Create Goal Form Component
function CreateGoalForm({ 
  clients, 
  onSubmit, 
  onClose 
}: { 
  clients: any[]; 
  onSubmit: (data: Partial<Goal>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    description: '',
    category: 'behavioral',
    targetDate: '',
    priority: 'medium',
    milestones: ['']
  });

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, '']
    });
  };

  const updateMilestone = (index: number, value: string) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index] = value;
    setFormData({
      ...formData,
      milestones: newMilestones
    });
  };

  const removeMilestone = (index: number) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      clientId: formData.clientId,
      title: formData.title,
      description: formData.description,
      category: formData.category as Goal['category'],
      targetDate: formData.targetDate,
      priority: formData.priority as Goal['priority'],
      milestones: formData.milestones
        .filter(m => m.trim() !== '')
        .map((title, index) => ({
          id: `milestone-${index}`,
          title,
          completed: false
        })),
      status: 'not_started' as Goal['status'],
      progress: 0,
      createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select
            title="Client"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            title="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="behavioral">Behavioral</option>
            <option value="emotional">Emotional</option>
            <option value="cognitive">Cognitive</option>
            <option value="social">Social</option>
            <option value="physical">Physical</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Reduce anxiety symptoms"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the goal in detail..."
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
          <Input
            type="date"
            value={formData.targetDate}
            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            title="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Milestones</label>
        <div className="space-y-2">
          {formData.milestones.map((milestone, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={milestone}
                onChange={(e) => updateMilestone(index, e.target.value)}
                placeholder="Enter milestone"
              />
              {formData.milestones.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeMilestone(index)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMilestone}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Milestone
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Create Goal
        </Button>
      </div>
    </form>
  );
}