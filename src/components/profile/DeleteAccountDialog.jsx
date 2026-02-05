import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DeleteAccountDialog({ open, onOpenChange, userEmail }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      // Delete user data
      const customers = await base44.entities.Customer.filter({ created_by: userEmail });
      if (customers.length > 0) {
        await base44.entities.Customer.delete(customers[0].id);
      }

      const wallets = await base44.entities.Wallet.filter({ created_by: userEmail });
      if (wallets.length > 0) {
        await base44.entities.Wallet.delete(wallets[0].id);
      }

      // Logout and redirect
      base44.auth.logout(window.location.origin);
    } catch (error) {
      toast.error("Failed to delete account");
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl select-none bg-white dark:bg-[var(--bg-card)] border-[#E8DED8] dark:border-[var(--border-light)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#5C4A3A] dark:text-[var(--text-primary)]">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Account
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-4">
              <p className="text-sm text-red-900 dark:text-red-400 leading-relaxed">
                This action is <strong>permanent</strong> and cannot be undone. All your:
              </p>
              <ul className="mt-2 text-sm text-red-800 dark:text-red-500 space-y-1 ml-4 list-disc">
                <li>Loyalty points</li>
                <li>Wallet balance</li>
                <li>Order history</li>
                <li>Community posts</li>
                <li>Account data</li>
              </ul>
              <p className="mt-2 text-sm text-red-900 dark:text-red-400">
                will be <strong>permanently deleted</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 rounded-xl border-[#E8DED8] dark:border-[var(--border-light)] dark:text-[var(--text-primary)]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#8B7355] dark:text-[var(--text-secondary)]">
              Type <strong>DELETE</strong> to confirm account deletion:
            </p>

            <div>
              <Label htmlFor="confirm" className="text-[#5C4A3A] dark:text-[var(--text-primary)]">
                Confirmation
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="mt-1 border-[#E8DED8] dark:border-[var(--border-light)] dark:bg-[var(--bg-elevated)] dark:text-[var(--text-primary)]"
                autoComplete="off"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1 rounded-xl border-[#E8DED8] dark:border-[var(--border-light)] dark:text-[var(--text-primary)]"
                disabled={isDeleting}
              >
                Back
              </Button>
              <Button
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || isDeleting}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete Forever"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}