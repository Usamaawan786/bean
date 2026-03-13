import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Send, Calendar } from "lucide-react";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function CampaignEditor({ campaign, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    from_name: 'BEAN Coffee',
    recipient_type: 'all_users',
    status: 'draft',
    scheduled_for: '',
    custom_recipients: []
  });

  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
    }
  }, [campaign]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (campaign) {
        return base44.entities.EmailCampaign.update(campaign.id, data);
      }
      return base44.entities.EmailCampaign.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success(campaign ? 'Campaign updated' : 'Campaign created');
      onClose();
    }
  });

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast.error('Please fill in all required fields');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleSchedule = () => {
    if (!formData.scheduled_for) {
      toast.error('Please select a schedule date');
      return;
    }
    saveMutation.mutate({ ...formData, status: 'scheduled' });
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8B7355] to-[#6B5744] text-white px-6 pt-12 pb-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="text-white mb-4"
            onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <h1 className="text-3xl font-bold">
            {campaign ? 'Edit Campaign' : 'New Campaign'}
          </h1>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="p-6 space-y-6">
          <div>
            <Label>Campaign Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Welcome Series - Week 1"
            />
          </div>

          <div>
            <Label>From Name</Label>
            <Input
              value={formData.from_name}
              onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
              placeholder="BEAN Coffee"
            />
          </div>

          <div>
            <Label>Subject Line *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Your special offer awaits!"
            />
          </div>

          <div>
            <Label>Recipients *</Label>
            <Select
              value={formData.recipient_type}
              onValueChange={(value) => setFormData({ ...formData, recipient_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_users">All Users</SelectItem>
                <SelectItem value="waitlist">Waitlist Members</SelectItem>
                <SelectItem value="customers">Customers Only</SelectItem>
                <SelectItem value="custom">Custom List</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.recipient_type === 'custom' && (
            <div>
              <Label>Custom Email List (comma separated)</Label>
              <Textarea
                value={(formData.custom_recipients || []).join(', ')}
                onChange={(e) => {
                  const emails = e.target.value.split(',').map(email => email.trim()).filter(Boolean);
                  setFormData({ ...formData, custom_recipients: emails });
                }}
                placeholder="email1@example.com, email2@example.com"
                rows={3}
              />
            </div>
          )}

          <div>
            <Label>Email Content *</Label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <ReactQuill
                theme="snow"
                value={formData.body}
                onChange={(value) => setFormData({ ...formData, body: value })}
                modules={modules}
                placeholder="Write your email content here..."
                style={{ minHeight: '300px' }}
              />
            </div>
          </div>

          <div>
            <Label>Schedule (Optional)</Label>
            <Input
              type="datetime-local"
              value={formData.scheduled_for ? new Date(formData.scheduled_for).toISOString().slice(0, 16) : ''}
              onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : '' })}
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to save as draft</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              className="bg-gray-600 hover:bg-gray-700">
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!formData.scheduled_for}
              className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Campaign
            </Button>
            <Button
              onClick={() => {
                if (confirm('Send this campaign immediately?')) {
                  saveMutation.mutate({ ...formData, status: 'sending' });
                }
              }}
              className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}