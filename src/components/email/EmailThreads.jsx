import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Send, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function EmailThreads() {
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const queryClient = useQueryClient();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['email-threads'],
    queryFn: () => base44.entities.EmailThread.list('-last_reply_at')
  });

  const replyMutation = useMutation({
    mutationFn: async ({ threadId, message }) => {
      const thread = threads.find(t => t.id === threadId);
      const updatedMessages = [
        ...(thread.messages || []),
        {
          from: 'admin@beancoffee.com',
          to: thread.recipient_email,
          body: message,
          sent_at: new Date().toISOString(),
          is_admin: true
        }
      ];
      
      await base44.entities.EmailThread.update(threadId, {
        messages: updatedMessages,
        status: 'replied',
        last_reply_at: new Date().toISOString()
      });

      // Send actual email
      await base44.integrations.Core.SendEmail({
        to: thread.recipient_email,
        subject: `Re: ${thread.subject}`,
        body: message,
        from_name: 'BEAN Support'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-threads'] });
      toast.success('Reply sent');
      setReplyText('');
      setSelectedThread(null);
    }
  });

  const closeMutation = useMutation({
    mutationFn: (threadId) => base44.entities.EmailThread.update(threadId, { status: 'closed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-threads'] });
      toast.success('Thread closed');
    }
  });

  const handleSendReply = () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    replyMutation.mutate({
      threadId: selectedThread.id,
      message: replyText
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: "bg-blue-100 text-blue-700",
      replied: "bg-green-100 text-green-700",
      closed: "bg-gray-100 text-gray-700"
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  return (
    <>
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">Loading conversations...</div>
        ) : threads.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No email conversations yet</p>
          </Card>
        ) : (
          threads.map(thread => (
            <Card key={thread.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="h-5 w-5 text-[var(--accent-primary)]" />
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {thread.recipient_email}
                      </p>
                      {thread.recipient_name && (
                        <p className="text-sm text-[var(--text-tertiary)]">
                          {thread.recipient_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    <strong>Subject:</strong> {thread.subject}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Last activity: {format(new Date(thread.last_reply_at || thread.created_date), 'PPp')}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {(thread.messages || []).length} messages
                  </p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(thread.status)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setSelectedThread(thread)}
                  className="bg-[#8B7355] hover:bg-[#6B5744]">
                  View & Reply
                </Button>
                {thread.status !== 'closed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => closeMutation.mutate(thread.id)}>
                    Close Thread
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Thread Dialog */}
      <Dialog open={!!selectedThread} onOpenChange={() => setSelectedThread(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Conversation with {selectedThread?.recipient_email}
            </DialogTitle>
          </DialogHeader>
          
          {selectedThread && (
            <div className="space-y-4">
              {/* Messages */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(selectedThread.messages || []).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      msg.is_admin 
                        ? 'bg-[#8B7355]/10 ml-8' 
                        : 'bg-gray-100 mr-8'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">
                        {msg.is_admin ? 'You' : selectedThread.recipient_name || msg.from}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(msg.sent_at), 'PPp')}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {selectedThread.status !== 'closed' && (
                <div className="border-t pt-4">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                  />
                  <Button
                    onClick={handleSendReply}
                    className="mt-3 bg-[#8B7355] hover:bg-[#6B5744]"
                    disabled={replyMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}