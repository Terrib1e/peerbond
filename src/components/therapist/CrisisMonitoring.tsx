import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Shield,
  Phone,
  Clock,
  User,
  MessageCircle,
  Activity,
  Bell,
  CheckCircle,
  PlayCircle,
  Pause,
  Download,
  Search,
  RefreshCw,
  Zap,
  Flag,
  Brain
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { toast } from 'react-hot-toast';

interface CrisisAlert {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  alertType: 'ai_detected' | 'manual_flag' | 'assessment_score' | 'inactivity' | 'keywords' | 'self_report';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'false_positive';
  triggeredBy: string;
  triggerDetails: {
    message?: string;
    score?: number;
    keywords?: string[];
    inactivityDays?: number;
    location?: string;
    context?: string;
  };
  aiConfidence: number; // 0-1 scale
  riskFactors: string[];
  recommendedActions: string[];
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  assignedTherapist: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  notes?: string;
  interventionTaken?: string;
  followUpRequired: boolean;
  escalationLevel: number; // 1-5 scale
}

interface CrisisFilters {
  search: string;
  severity: string;
  status: string;
  alertType: string;
  timeRange: string;
  assignedTherapist: string;
}

export default function CrisisMonitoring() {
  const [filters, setFilters] = useState<CrisisFilters>({
    search: '',
    severity: 'all',
    status: 'active',
    alertType: 'all',
    timeRange: '24h',
    assignedTherapist: 'all'
  });
  
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null);
  const [showAlertDetail, setShowAlertDetail] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const queryClient = useQueryClient();

  // Auto-refresh crisis alerts
  const { data: alertsData } = useQuery({
    queryKey: ['crisis-alerts', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.severity !== 'all' && { severity: filters.severity }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.alertType !== 'all' && { alertType: filters.alertType }),
        ...(filters.timeRange !== 'all' && { timeRange: filters.timeRange }),
        ...(filters.assignedTherapist !== 'all' && { assignedTherapist: filters.assignedTherapist })
      });
      
      const response = await api.get(`/therapist/crisis-alerts?${params}`);
      return response as any;
    },
    refetchInterval: monitoringEnabled ? 30000 : false // Refresh every 30 seconds when monitoring
  });

  // Fetch crisis statistics
  const { data: statsData } = useQuery({
    queryKey: ['crisis-stats', filters.timeRange],
    queryFn: async () => {
      const response = await api.get(`/therapist/crisis-stats?timeRange=${filters.timeRange}`);
      return response as any;
    },
    refetchInterval: 60000
  });

  const alerts = alertsData?.alerts || [];
  const totalAlerts = alertsData?.total || 0;
  const totalPages = Math.ceil(totalAlerts / pageSize);
  const stats = statsData?.stats || {};

  // Acknowledge alert
  const acknowledgeAlertMutation = useMutation({
    mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
      api.post(`/therapist/crisis-alerts/${alertId}/acknowledge`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crisis-alerts'] });
      toast.success('Alert acknowledged');
    },
    onError: () => toast.error('Failed to acknowledge alert')
  });

  // Resolve alert
  const resolveAlertMutation = useMutation({
    mutationFn: ({ alertId, intervention, notes }: { alertId: string; intervention: string; notes: string }) =>
      api.post(`/therapist/crisis-alerts/${alertId}/resolve`, { intervention, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crisis-alerts'] });
      toast.success('Alert resolved');
    },
    onError: () => toast.error('Failed to resolve alert')
  });

  // Escalate alert
  const escalateAlertMutation = useMutation({
    mutationFn: ({ alertId, reason }: { alertId: string; reason: string }) =>
      api.post(`/therapist/crisis-alerts/${alertId}/escalate`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crisis-alerts'] });
      toast.success('Alert escalated to crisis team');
    },
    onError: () => toast.error('Failed to escalate alert')
  });

  // Sound notification for new critical alerts
  useEffect(() => {
    if (soundEnabled && alerts.some((alert: CrisisAlert) => 
      alert.severity === 'critical' && alert.status === 'active'
    )) {
      // Play notification sound (would implement with actual audio)
      console.log('🚨 Critical alert notification sound');
    }
  }, [alerts, soundEnabled]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium': return <Flag className="w-4 h-4 text-yellow-600" />;
      case 'low': return <Flag className="w-4 h-4 text-blue-600" />;
      default: return <Flag className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'false_positive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'ai_detected': return <Brain className="w-4 h-4" />;
      case 'manual_flag': return <Flag className="w-4 h-4" />;
      case 'assessment_score': return <Activity className="w-4 h-4" />;
      case 'inactivity': return <Clock className="w-4 h-4" />;
      case 'keywords': return <MessageCircle className="w-4 h-4" />;
      case 'self_report': return <User className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const activeCriticalAlerts = alerts.filter((alert: CrisisAlert) => 
    alert.status === 'active' && alert.severity === 'critical'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-600" />
            Crisis Monitoring
            {activeCriticalAlerts > 0 && (
              <span className="relative">
                <Bell className="w-6 h-6 text-red-600 animate-pulse" />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {activeCriticalAlerts}
                </span>
              </span>
            )}
          </h2>
          <p className="text-gray-600 mt-1">Real-time crisis detection and intervention management</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={monitoringEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setMonitoringEnabled(!monitoringEnabled)}
            >
              {monitoringEnabled ? <Pause className="w-4 h-4 mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              {monitoringEnabled ? 'Pause' : 'Resume'} Monitoring
            </Button>
            
            <Button
              variant={soundEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              <Bell className="w-4 h-4 mr-2" />
              Sound {soundEnabled ? 'On' : 'Off'}
            </Button>
          </div>
          
          <Button variant="outline">
            <Phone className="w-4 h-4 mr-2" />
            Crisis Hotline
          </Button>
          
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {activeCriticalAlerts > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    {activeCriticalAlerts} Critical Alert{activeCriticalAlerts > 1 ? 's' : ''} Requiring Immediate Attention
                  </h3>
                  <p className="text-sm text-red-700">
                    These alerts indicate potential imminent risk and require immediate intervention.
                  </p>
                </div>
              </div>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => setFilters({ ...filters, severity: 'critical', status: 'active' })}
              >
                Review Critical Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalAlerts || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.activeAlerts || 0}</p>
              </div>
              <Flag className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Detected</p>
                <p className="text-2xl font-bold text-blue-600">{stats.aiDetected || 0}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolvedToday || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime || '0'}m</p>
              </div>
              <Clock className="w-8 h-8 text-gray-500" />
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
                placeholder="Search alerts..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <select
              title="Severity"
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              title="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
            
            <select
              title="Alert Type"
              value={filters.alertType}
              onChange={(e) => setFilters({ ...filters, alertType: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="ai_detected">AI Detected</option>
              <option value="manual_flag">Manual Flag</option>
              <option value="assessment_score">Assessment Score</option>
              <option value="inactivity">Inactivity</option>
              <option value="keywords">Keywords</option>
              <option value="self_report">Self Report</option>
            </select>
            
            <select
              title="Time Range"
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['crisis-alerts'] })}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Crisis Alerts ({totalAlerts})</span>
            <div className="flex items-center gap-2">
              {monitoringEnabled && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live Monitoring
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {alerts.map((alert: CrisisAlert) => (
              <div 
                key={alert.id} 
                className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                  alert.severity === 'critical' ? 'border-l-4 border-red-500 bg-red-25' : ''
                }`}
                onClick={() => {
                  setSelectedAlert(alert);
                  setShowAlertDetail(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex flex-col items-center gap-2">
                      {getSeverityIcon(alert.severity)}
                      {getAlertTypeIcon(alert.alertType)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{alert.clientName}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{getTimeAgo(alert.createdAt)}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Trigger</p>
                          <p className="text-sm font-medium">
                            {alert.alertType.replace('_', ' ')} by {alert.triggeredBy}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">AI Confidence</p>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  alert.aiConfidence >= 0.8 ? 'bg-red-500' :
                                  alert.aiConfidence >= 0.6 ? 'bg-orange-500' :
                                  alert.aiConfidence >= 0.4 ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${alert.aiConfidence * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{Math.round(alert.aiConfidence * 100)}%</span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Escalation Level</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div 
                                key={level}
                                className={`w-2 h-4 rounded-sm ${
                                  level <= alert.escalationLevel ? 'bg-red-500' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm font-medium">{alert.escalationLevel}/5</span>
                          </div>
                        </div>
                      </div>
                      
                      {alert.triggerDetails.message && (
                        <div className="bg-gray-100 p-3 rounded-lg mb-3">
                          <p className="text-sm text-gray-700">"{alert.triggerDetails.message}"</p>
                        </div>
                      )}
                      
                      {alert.riskFactors.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">Risk Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {alert.riskFactors.slice(0, 3).map((factor, index) => (
                              <span key={index} className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                {factor}
                              </span>
                            ))}
                            {alert.riskFactors.length > 3 && (
                              <span className="text-xs text-gray-500">+{alert.riskFactors.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {alert.recommendedActions.slice(0, 2).map((action, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {alert.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeAlertMutation.mutate({ alertId: alert.id });
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                        
                        {alert.severity === 'critical' && (
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              escalateAlertMutation.mutate({ alertId: alert.id, reason: 'Critical severity requires immediate escalation' });
                            }}
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            Escalate
                          </Button>
                        )}
                      </>
                    )}
                    
                    {alert.clientPhone && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${alert.clientPhone}`);
                        }}
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalAlerts)} of {totalAlerts} alerts
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

      {/* Alert Detail Dialog */}
      {showAlertDetail && selectedAlert && (
        <Dialog open={showAlertDetail} onOpenChange={setShowAlertDetail}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {getSeverityIcon(selectedAlert.severity)}
                Crisis Alert: {selectedAlert.clientName}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(selectedAlert.severity)}`}>
                  {selectedAlert.severity.toUpperCase()}
                </span>
              </DialogTitle>
            </DialogHeader>
            <CrisisAlertDetail 
              alert={selectedAlert}
              onAcknowledge={(notes) => acknowledgeAlertMutation.mutate({ alertId: selectedAlert.id, notes })}
              onResolve={(intervention, notes) => resolveAlertMutation.mutate({ 
                alertId: selectedAlert.id, 
                intervention, 
                notes 
              })}
              onEscalate={(reason) => escalateAlertMutation.mutate({ alertId: selectedAlert.id, reason })}
              onClose={() => setShowAlertDetail(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Crisis Alert Detail Component
function CrisisAlertDetail({ 
  alert, 
  onAcknowledge, 
  onResolve, 
  onEscalate, 
  onClose 
}: { 
  alert: CrisisAlert;
  onAcknowledge: (notes?: string) => void;
  onResolve: (intervention: string, notes: string) => void;
  onEscalate: (reason: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [intervention, setIntervention] = useState('');
  const [escalationReason] = useState('');

  return (
    <div className="space-y-6">
      {/* Alert Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Alert Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Type</span>
                <span className="text-sm font-medium">{alert.alertType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Triggered By</span>
                <span className="text-sm font-medium">{alert.triggeredBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">AI Confidence</span>
                <span className="text-sm font-medium">{Math.round(alert.aiConfidence * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium">{new Date(alert.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Client Information</h4>
            <div className="space-y-2">
              <p className="font-medium">{alert.clientName}</p>
              {alert.clientPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{alert.clientPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Therapist: {alert.assignedTherapist}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Status</h4>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(alert.status)}`}>
              {alert.status.replace('_', ' ')}
            </span>
            <div className="mt-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm text-gray-600">Escalation Level:</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div 
                    key={level}
                    className={`w-3 h-5 rounded-sm ${
                      level <= alert.escalationLevel ? 'bg-red-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium">{alert.escalationLevel}/5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trigger Details */}
      {alert.triggerDetails.message && (
        <Card>
          <CardHeader>
            <CardTitle>Trigger Message</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-gray-900">"{alert.triggerDetails.message}"</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {alert.riskFactors.map((factor, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  {factor}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {alert.recommendedActions.map((action, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  {action}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Contacts */}
      {alert.emergencyContacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-500" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alert.emergencyContacts.map((contact, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">{contact.name}</h4>
                  <p className="text-sm text-gray-600">{contact.relationship}</p>
                  <a 
                    href={`tel:${contact.phone}`}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    <Phone className="w-3 h-3" />
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t">
        {alert.status === 'active' && (
          <>
            <Button
              onClick={() => onAcknowledge(notes)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Acknowledge Alert
            </Button>
            
            <Button
              onClick={() => onEscalate(escalationReason || 'Manual escalation by therapist')}
              className="bg-red-600 hover:bg-red-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Escalate to Crisis Team
            </Button>
          </>
        )}
        
        {(alert.status === 'acknowledged' || alert.status === 'in_progress') && (
          <Button
            onClick={() => onResolve(intervention, notes)}
            className="bg-green-600 hover:bg-green-700"
            disabled={!intervention.trim()}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Resolved
          </Button>
        )}
        
        {alert.clientPhone && (
          <Button
            variant="outline"
            onClick={() => window.open(`tel:${alert.clientPhone}`)}
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Client
          </Button>
        )}
        
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Intervention Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(alert.status === 'acknowledged' || alert.status === 'in_progress') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intervention Taken</label>
              <textarea
                value={intervention}
                onChange={(e) => setIntervention(e.target.value)}
                placeholder="Describe the intervention actions taken..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional observations or notes..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'bg-red-100 text-red-800';
    case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'resolved': return 'bg-green-100 text-green-800';
    case 'false_positive': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}