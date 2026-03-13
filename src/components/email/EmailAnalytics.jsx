import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Mail, CheckCircle, Eye, MousePointer, XCircle, TrendingUp } from "lucide-react";

export default function EmailAnalytics() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => base44.entities.EmailCampaign.list()
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => base44.entities.EmailLog.list()
  });

  // Calculate overall stats
  const totalSent = logs.length;
  const totalDelivered = logs.filter(l => ['delivered', 'opened', 'clicked'].includes(l.status)).length;
  const totalOpened = logs.filter(l => ['opened', 'clicked'].includes(l.status)).length;
  const totalClicked = logs.filter(l => l.status === 'clicked').length;
  const totalBounced = logs.filter(l => l.status === 'bounced').length;
  const totalFailed = logs.filter(l => l.status === 'failed').length;

  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0;
  const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : 0;
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0;

  const stats = [
    {
      title: "Total Sent",
      value: totalSent,
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Delivered",
      value: totalDelivered,
      subtitle: `${deliveryRate}% rate`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Opened",
      value: totalOpened,
      subtitle: `${openRate}% rate`,
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Clicked",
      value: totalClicked,
      subtitle: `${clickRate}% rate`,
      icon: MousePointer,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100"
    },
    {
      title: "Bounced",
      value: totalBounced,
      icon: XCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Failed",
      value: totalFailed,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">{stat.title}</p>
              {stat.subtitle && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{stat.subtitle}</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Campaign Performance */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />
          <h3 className="text-lg font-bold">Campaign Performance</h3>
        </div>
        
        <div className="space-y-4">
          {campaigns
            .filter(c => c.sent_count > 0)
            .sort((a, b) => b.sent_count - a.sent_count)
            .slice(0, 10)
            .map(campaign => {
              const deliveryPct = campaign.sent_count > 0 
                ? ((campaign.delivered_count / campaign.sent_count) * 100).toFixed(1) 
                : 0;
              const openPct = campaign.delivered_count > 0 
                ? ((campaign.opened_count / campaign.delivered_count) * 100).toFixed(1) 
                : 0;
              const clickPct = campaign.opened_count > 0 
                ? ((campaign.clicked_count / campaign.opened_count) * 100).toFixed(1) 
                : 0;

              return (
                <div key={campaign.id} className="border-b pb-4 last:border-0">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">
                    {campaign.name}
                  </h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--text-tertiary)]">Sent</p>
                      <p className="font-semibold">{campaign.sent_count}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-tertiary)]">Delivery</p>
                      <p className="font-semibold text-green-600">{deliveryPct}%</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-tertiary)]">Open Rate</p>
                      <p className="font-semibold text-blue-600">{openPct}%</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-tertiary)]">Click Rate</p>
                      <p className="font-semibold text-purple-600">{clickPct}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}