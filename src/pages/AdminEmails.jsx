import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Mail, BarChart3, MessageSquare } from "lucide-react";
import CampaignsList from "@/components/email/CampaignsList";
import EmailLogs from "@/components/email/EmailLogs";
import EmailThreads from "@/components/email/EmailThreads";
import CampaignEditor from "@/components/email/CampaignEditor";
import EmailAnalytics from "@/components/email/EmailAnalytics";

export default function AdminEmails() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [showEditor, setShowEditor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const handleNewCampaign = () => {
    setEditingCampaign(null);
    setShowEditor(true);
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingCampaign(null);
  };

  if (showEditor) {
    return (
      <CampaignEditor
        campaign={editingCampaign}
        onClose={handleCloseEditor}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white px-6 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Email Marketing</h1>
              <p className="text-white/80">Manage campaigns, track deliverability, and engage with customers</p>
            </div>
            <Button
              onClick={handleNewCampaign}
              className="bg-white text-[#8B7355] hover:bg-white/90">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Logs
            </TabsTrigger>
            <TabsTrigger value="threads" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <CampaignsList onEdit={handleEditCampaign} />
          </TabsContent>

          <TabsContent value="logs">
            <EmailLogs />
          </TabsContent>

          <TabsContent value="threads">
            <EmailThreads />
          </TabsContent>

          <TabsContent value="analytics">
            <EmailAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}