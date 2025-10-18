import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  User,
  Building,
  Calendar,
  Settings,
  Shield,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: 'venue' | 'user' | 'booking' | 'review' | 'service' | 'notification';
  entityId: string;
  entityName?: string;
  ipAddress: string;
  userAgent: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

const AuditLogs: React.FC = () => {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        timestamp: row.created_at,
        userId: row.user_id || '',
        userEmail: row.metadata?.user_email || '',
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityName: row.entity_name || undefined,
        ipAddress: row.metadata?.ip || '',
        userAgent: row.metadata?.user_agent || '',
        changes: row.diff ? { before: row.diff.before, after: row.diff.after } : undefined,
        metadata: row.metadata || undefined,
      })) as AuditLog[];
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'venue': return <Building className="h-4 w-4 text-blue-400" />;
      case 'user': return <User className="h-4 w-4 text-green-400" />;
      case 'booking': return <Calendar className="h-4 w-4 text-purple-400" />;
      case 'review': return <MessageSquare className="h-4 w-4 text-yellow-400" />;

      case 'service': return <Settings className="h-4 w-4 text-indigo-400" />;
      case 'notification': return <Shield className="h-4 w-4 text-orange-400" />;
      default: return <Settings className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionBadge = (action: string) => {
    const actionTypes = {
      create: 'bg-green-500/20 text-green-400 border-green-500',
      update: 'bg-blue-500/20 text-blue-400 border-blue-500',
      delete: 'bg-red-500/20 text-red-400 border-red-500',
      approve: 'bg-green-500/20 text-green-400 border-green-500',
      reject: 'bg-red-500/20 text-red-400 border-red-500',
      block: 'bg-red-500/20 text-red-400 border-red-500',
      unblock: 'bg-green-500/20 text-green-400 border-green-500',
      send: 'bg-blue-500/20 text-blue-400 border-blue-500',
      edit: 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
    };
    
    const actionKey = action.split('.')[1] || action;
    const colorClass = actionTypes[actionKey as keyof typeof actionTypes] || 'bg-gray-500/20 text-gray-400 border-gray-500';
    
    return (
      <Badge variant="outline" className={colorClass}>
        {action}
      </Badge>
    );
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm);
    
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter);
    
    return matchesSearch && matchesEntity && matchesAction;
  });

  const formatJsonDiff = (before: any, after: any) => {
    const changes: string[] = [];
    
    // Find changed fields
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    
    allKeys.forEach(key => {
      const beforeValue = before?.[key];
      const afterValue = after?.[key];
      
      if (beforeValue !== afterValue) {
        changes.push(`${key}: ${JSON.stringify(beforeValue)} → ${JSON.stringify(afterValue)}`);
      }
    });
    
    return changes;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400">Track all administrative actions and changes</p>
        </div>
        
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by user, action, entity, or IP address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="venue">Venues</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="booking">Bookings</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>

                <SelectItem value="service">Services</SelectItem>
                <SelectItem value="notification">Notifications</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="block">Block/Unblock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Activity Log ({filteredLogs.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Timestamp</TableHead>
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Action</TableHead>
                <TableHead className="text-gray-300">Entity</TableHead>
                <TableHead className="text-gray-300">IP Address</TableHead>
                <TableHead className="text-gray-300">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <p className="text-gray-300 text-sm">
                        {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="text-white text-sm">{log.userEmail}</p>
                        <p className="text-gray-400 text-xs">ID: {log.userId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getEntityIcon(log.entityType)}
                      <div>
                        <p className="text-white text-sm">{log.entityName || log.entityId}</p>
                        <p className="text-gray-400 text-xs capitalize">{log.entityType}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-gray-300 text-sm font-mono">{log.ipAddress}</p>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-white">Audit Log Details</DialogTitle>
                        </DialogHeader>
                        {selectedLog && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-300">Timestamp</h4>
                                <p className="text-white">{format(new Date(selectedLog.timestamp), 'PPpp')}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-300">User</h4>
                                <p className="text-white">{selectedLog.userEmail}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-300">Action</h4>
                                <p className="text-white">{selectedLog.action}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-300">Entity</h4>
                                <p className="text-white">{selectedLog.entityType}: {selectedLog.entityName || selectedLog.entityId}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-300">IP Address</h4>
                                <p className="text-white font-mono">{selectedLog.ipAddress}</p>
                              </div>
                            </div>
                            
                            {selectedLog.changes && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Changes</h4>
                                <div className="bg-gray-700 p-4 rounded-md">
                                  {formatJsonDiff(selectedLog.changes.before, selectedLog.changes.after).map((change, index) => (
                                    <p key={index} className="text-white text-sm font-mono mb-1">{change}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {selectedLog.metadata && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Metadata</h4>
                                <div className="bg-gray-700 p-4 rounded-md">
                                  <pre className="text-white text-sm font-mono">
                                    {JSON.stringify(selectedLog.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">User Agent</h4>
                              <p className="text-gray-300 text-sm bg-gray-700 p-2 rounded font-mono break-all">
                                {selectedLog.userAgent}
                              </p>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No audit logs found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;