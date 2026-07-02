import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ClipboardList, User, Ban, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { timeAgo } from "@/utils/timeUtils";

export default function OpenTicketsPanel({ user, onResume }) {
  const queryClient = useQueryClient();
  const canVoid = ["manager", "admin", "super_admin"].includes(user?.role);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["open-tickets"],
    queryFn: () => base44.entities.OpenTicket.filter({ status: "Open" }, "-created_date"),
    refetchInterval: 15000
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["open-ticket-items-all"],
    queryFn: () => base44.entities.OpenTicketItem.list(),
    refetchInterval: 15000
  });

  const handleVoid = async (ticket) => {
    if (!window.confirm(`Void ticket ${ticket.ticket_number}? This cannot be undone.`)) return;
    try {
      const res = await base44.functions.invoke("voidOpenTicket", { ticket_id: ticket.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Ticket ${ticket.ticket_number} voided`);
      queryClient.invalidateQueries({ queryKey: ["open-tickets"] });
    } catch (err) {
      toast.error("Failed to void ticket: " + (err?.message || "Unknown error"));
    }
  };

  if (isLoading) {
    return <p className="text-[#8B7355] text-sm text-center py-12">Loading open tickets...</p>;
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardList className="h-10 w-10 text-[#C9B8A6] mx-auto mb-3" />
        <p className="text-[#8B7355] text-sm">No open tickets right now</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tickets.map(ticket => {
        const items = allItems.filter(i => i.ticket_id === ticket.id && i.status !== "Voided");
        const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

        return (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#E8DED8] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-lg bg-[#F5EBE8] text-[#5C4A3A] text-xs font-bold">
                {ticket.ticket_number}
              </span>
              <span className="text-xs text-[#8B7355]">
                {timeAgo(ticket.created_date)}
              </span>
            </div>

            <p className="font-semibold text-[#5C4A3A] text-sm">
              {ticket.customer_name || "Walk-in Customer"}
            </p>
            <p className="text-xs text-[#8B7355] mb-3">
              {ticket.order_type === "takeaway" ? "🛍 Takeaway" : "🪑 Dine In"} · {ticket.counter === "counter_2" ? "Counter 2" : "Counter 1"}
            </p>

            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-[#8B7355]">{itemCount} item{itemCount === 1 ? "" : "s"}</span>
              <span className="font-bold text-[#5C4A3A]">PKR {total.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#C9B8A6] mb-4">
              <User className="h-3 w-3" />
              {ticket.opened_by_name || ticket.opened_by}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => onResume(ticket)}
                className="flex-1 bg-[#8B7355] hover:bg-[#6B5744] rounded-xl text-sm"
              >
                <PlayCircle className="h-4 w-4 mr-1.5" />
                Resume
              </Button>
              {canVoid && (
                <Button
                  onClick={() => handleVoid(ticket)}
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Ban className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}