import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Mail, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";

export default function EmailLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => base44.entities.EmailLog.list('-created_date', 100)
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'opened': return <Eye className="h-4 w-4 text-purple-500" />;
      case 'clicked': return <Mail className="h-4 w-4 text-indigo-500" />;
      case 'bounced': return <XCircle className="h-4 w-4 text-orange-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      sent: "bg-blue-100 text-blue-700",
      delivered: "bg-green-100 text-green-700",
      opened: "bg-purple-100 text-purple-700",
      clicked: "bg-indigo-100 text-indigo-700",
      bounced: "bg-orange-100 text-orange-700",
      failed: "bg-red-100 text-red-700"
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by email or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="clicked">Clicked</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs List */}
      {isLoading ? (
        <div className="text-center py-12">Loading email logs...</div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No email logs found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map(log => (
            <Card key={log.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {log.recipient_email}
                      </p>
                      {log.recipient_name && (
                        <p className="text-sm text-[var(--text-tertiary)]">
                          {log.recipient_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    <strong>Subject:</strong> {log.subject}
                  </p>
                  {log.campaign_name && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Campaign: {log.campaign_name}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-tertiary)]">
                    <span>Sent: {format(new Date(log.sent_at || log.created_date), 'PPp')}</span>
                    {log.opened_at && (
                      <span>Opened: {format(new Date(log.opened_at), 'PPp')}</span>
                    )}
                    {log.clicked_at && (
                      <span>Clicked: {format(new Date(log.clicked_at), 'PPp')}</span>
                    )}
                  </div>
                  {log.error_message && (
                    <p className="text-xs text-red-600 mt-2">
                      Error: {log.error_message}
                    </p>
                  )}
                </div>
                <div>
                  {getStatusBadge(log.status)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}