import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Play, Pause, Calendar, Users, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CampaignsList({ onEdit }) {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => base44.entities.EmailCampaign.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campaign deleted');
    }
  });

  const getStatusBadge = (status) => {
    const variants = {
      draft: "bg-gray-100 text-gray-700",
      scheduled: "bg-blue-100 text-blue-700",
      sending: "bg-yellow-100 text-yellow-700",
      sent: "bg-green-100 text-green-700",
      paused: "bg-red-100 text-red-700"
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const getStats = (campaign) => {
    const deliveryRate = campaign.sent_count > 0 
      ? ((campaign.delivered_count / campaign.sent_count) * 100).toFixed(1) 
      : 0;
    const openRate = campaign.delivered_count > 0 
      ? ((campaign.opened_count / campaign.delivered_count) * 100).toFixed(1) 
      : 0;
    const clickRate = campaign.opened_count > 0 
      ? ((campaign.clicked_count / campaign.opened_count) * 100).toFixed(1) 
      : 0;

    return { deliveryRate, openRate, clickRate };
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-4">
      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-4">Create your first email campaign to get started</p>
        </Card>
      ) : (
        campaigns.map(campaign => {
          const stats = getStats(campaign);
          
          return (
            <Card key={campaign.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                      {campaign.name}
                    </h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    <strong>Subject:</strong> {campaign.subject}
                  </p>
                  {campaign.scheduled_for && (
                    <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Scheduled: {format(new Date(campaign.scheduled_for), 'PPp')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(campaign)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Delete this campaign?')) {
                        deleteMutation.mutate(campaign.id);
                      }
                    }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Recipients</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {campaign.total_recipients || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Sent</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {campaign.sent_count || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Delivery Rate</p>
                  <p className="text-lg font-bold text-green-600">
                    {stats.deliveryRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Open Rate</p>
                  <p className="text-lg font-bold text-blue-600">
                    {stats.openRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Click Rate</p>
                  <p className="text-lg font-bold text-purple-600">
                    {stats.clickRate}%
                  </p>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}