import React, { useEffect } from 'react';
import { X, CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertProps } from '@/components/ui/alert';
import { useCredits } from '@/hooks/useCredits';

interface LeadPaymentModalProps {
  leadId: string;
  creditCost: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LeadPaymentModal({
  leadId,
  creditCost,
  open,
  onClose,
  onSuccess
}: LeadPaymentModalProps) {
  const { deductCredits, hasEnoughCredits } = useCredits();
  const { user } = useUser();
  const [loading, setLoading] = React.useState(false);

  const handlePurchase = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Check if already purchased
      const { data: existingPurchase } = await supabase
        .from('lead_purchases')
        .select('*')
        .eq('lead_id', leadId)
        .eq('user_id', user.id)
        .single();

      if (existingPurchase) {
        toast.error('Je hebt deze lead al gekocht');
        return;
      }

      // Check purchase limit
      const { count: purchaseCount } = await supabase
        .from('lead_purchases')
        .select('*', { count: 'exact', head: true });

      if (purchaseCount && purchaseCount >= 4) {
        toast.error('Deze lead heeft het maximum aantal kopers bereikt');
        return;
      }

      // Deduct credits
      const result = await deductCredits(creditCost);
      if (result !== 'success') {
        toast.error('Niet genoeg credits');
        return;
      }

      // Create purchase record
      const { error: purchaseError } = await supabase
        .from('lead_purchases')
        .insert({
          lead_id: leadId,
          user_id: user.id,
          credits_spent: creditCost,
          credit_cost: creditCost,
          status: 'active'
        });

      if (purchaseError) throw purchaseError;

      toast.success('Lead succesvol gekocht!');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Er is iets misgegaan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Weet je het zeker?</DialogTitle>
          <DialogDescription>
            Je staat op het punt deze lead te kopen voor {creditCost} credits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="font-medium">Kosten</span>
            <span className="text-xl font-bold">{creditCost} Credits</span>
          </div>

          {!hasEnoughCredits(creditCost) && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>Je hebt niet genoeg credits</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button 
            onClick={handlePurchase}
            disabled={loading || !hasEnoughCredits(creditCost)}
          >
            {loading ? 'Bezig met kopen...' : 'Koop nu'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}