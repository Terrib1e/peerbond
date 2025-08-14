import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  User,
  Settings,
  Shield,
  AlertTriangle,
  Eye,
  Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AuditLog {
  id: string;
  memberId: string;
  memberName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress: string;
  memberAgent: string;
  createdAt: string;
  metadata?: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface AuditFilters {
  search: string;
  memberId: string;
  action: string;
  resource: string;
  severity: string;
  dateRange: string;
  startDate: string;
  endDate: string;
}

export default function AuditLogs() {
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    memberId: '',
    action: '',
    resource: '',
    severity: '',
    dateRange: '7d',
    startDate: '',
    endDate: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch audit logs
  const { data: logsData, refetch } = useQuery({
    queryKey: ['audit-logs', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.memberId && { memberId: filters.memberId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      await api.get(`/admin/audit-logs?${params}`);

      // Mock data for demonstration
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          memberId: 'admin-1',
          memberName: 'Admin Member',
          action: 'member_create',
          resource: 'member',
          resourceId: 'member-123',
          details: { email: 'newmember@example.com', role: 'member' },
          ipAddress: '192.168.1.100',
          memberAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          severity: 'info'
        },
        {
          id: '2',
          memberId: 'admin-1',
          memberName: 'Admin Member',
          action: 'config_update',
          resource: 'system',
          details: { feature: 'aiEnabled', oldValue: false, newValue: true },
          ipAddress: '192.168.1.100',
          memberAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          severity: 'warning'
        },
        {
          id: '3',
          memberId: 'therapist-1',
          memberName: 'Dr. Smith',
          action: 'crisis_escalation',
          resource: 'member',
          resourceId: 'member-456',
          details: { reason: 'suicide_ideation', severity: 'high' },
          ipAddress: '10.0.1.50',
          memberAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          severity: 'critical'
        },
        {
          id: '4',
          memberId: 'admin-1',
          memberName: 'Admin Member',
          action: 'bulk_member_deactivate',
          resource: 'member',
          details: { memberIds: ['member-789', 'member-101'], succeeded: 2, failed: 0 },
          ipAddress: '192.168.1.100',
          memberAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          severity: 'warning'
        },
        {
          id: '5',
          memberId: 'system',
          memberName: 'System',
          action: 'backup_completed',
          resource: 'system',
          details: { size: '2.5GB', duration: '15m 32s' },
          ipAddress: '127.0.0.1',
          memberAgent: 'System/1.0',
          createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          severity: 'info'
        }
      ];

      return {
        logs: mockLogs,
        total: mockLogs.length,
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: mockLogs.length,
          pages: Math.ceil(mockLogs.length / pageSize)
        }
      };
    },
    refetchInterval: 30000
  });

  const logs = logsData?.logs || [];
  const totalLogs = logsData?.total || 0;
  const totalPages = Math.ceil(totalLogs / pageSize);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('member')) return <User className="w-4 h-4" />;
    if (action.includes('config') || action.includes('system')) return <Settings className="w-4 h-4" />;
    if (action.includes('crisis') || action.includes('security')) return <Shield className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Member', 'Action', 'Resource', 'Severity', 'IP Address'].join(','),
      ...logs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.memberName,
        formatAction(log.action),
        log.resource,
        log.severity,
        log.ipAddress
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-gray-600 mt-1">Security and compliance audit trail</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <select
              title="Action Filter"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Actions</option>
              <option value="member_create">Member Create</option>
              <option value="member_update">Member Update</option>
              <option value="member_delete">Member Delete</option>
              <option value="config_update">Config Update</option>
              <option value="crisis_escalation">Crisis Escalation</option>
              <option value="backup_completed">Backup</option>
            </select>

            <select
              title="Resource Filter"
              value={filters.resource}
              onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Resources</option>
              <option value="member">Member</option>
              <option value="group">Group</option>
              <option value="system">System</option>
              <option value="message">Message</option>
            </select>

            <select
              title="Severity Filter"
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>

            <select
              title="Date Range"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>

            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail ({totalLogs} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {log.memberName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.memberName}</div>
                          <div className="text-xs text-gray-500">{log.memberId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm text-gray-900">{formatAction(log.action)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{log.resource}</div>
                      {log.resourceId && (
                        <div className="text-xs text-gray-500">{log.resourceId}</div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(log.severity)}`}>
                        {getSeverityIcon(log.severity)}
                        <span className="capitalize">{log.severity}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.ipAddress}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalLogs)} of {totalLogs} entries
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

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="text-sm text-gray-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member</label>
                    <p className="text-sm text-gray-900">{selectedLog.memberName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <p className="text-sm text-gray-900">{formatAction(selectedLog.action)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource</label>
                    <p className="text-sm text-gray-900">{selectedLog.resource}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedLog.severity}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="text-sm text-gray-900">{selectedLog.ipAddress}</p>
                  </div>
                </div>

                {selectedLog.details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                    <pre className="bg-gray-100 p-3 rounded-md text-xs text-gray-900 overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User Agent</label>
                  <p className="text-xs text-gray-600 break-all">{selectedLog.memberAgent}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}