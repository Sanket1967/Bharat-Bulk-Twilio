import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

// Domestic credit types update the user's `credits` balance (SIM Base /
// domestic SMS). The "international" type updates `sms_credits` (Twilio /
// International SMS) and leaves the domestic balance untouched.
const DOMESTIC_TYPES = ['sms', 'transactional', 'promotional', 'voice', 'misscall'];

const TransferFundModal = ({ open, onOpenChange, userId, onTransferComplete }) => {
  const [formData, setFormData] = useState({
    amount: '',
    creditType: 'sms',
    remarks: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isInternational = formData.creditType === 'international';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const amount = Number(formData.amount);

      // Load the user fresh so we read the correct current balance for the
      // targeted credit pool (domestic `credits` vs international
      // `sms_credits`). Only the selected pool is changed.
      const user = await pb.collection('users').getOne(userId, { $autoCancel: false });

      const updatePayload = {};
      let balanceField;
      if (isInternational) {
        balanceField = 'sms_credits';
        updatePayload.sms_credits = (Number(user.sms_credits) || 0) + amount;
      } else {
        balanceField = 'credits';
        updatePayload.credits = (Number(user.credits) || 0) + amount;
      }

      // Audit log entry. credit_type records which pool was topped up so the
      // transaction history can distinguish domestic vs international.
      await pb.collection('user_credits_log').create({
        user_id: userId,
        action: 'added',
        amount: amount,
        credit_type: formData.creditType,
        remarks: formData.remarks || (isInternational
          ? 'International SMS credit transfer by admin'
          : 'Fund transfer by admin'),
        unit_per_sms: isInternational ? 4 : 1,
      }, { $autoCancel: false });

      await pb.collection('users').update(userId, updatePayload, { $autoCancel: false });

      toast.success(
        `Successfully transferred ${amount} ${isInternational ? 'International SMS' : 'domestic'} credits`
      );
      setFormData({ amount: '', creditType: 'sms', remarks: '' });
      onOpenChange(false);
      if (onTransferComplete) onTransferComplete();
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('Failed to transfer funds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-navy">Transfer Fund</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Transfer <span className="text-destructive">*</span></Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              required
              placeholder="Enter amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditType">Credit Type <span className="text-destructive">*</span></Label>
            <Select value={formData.creditType} onValueChange={(v) => handleChange('creditType', v)}>
              <SelectTrigger id="creditType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS (Domestic)</SelectItem>
                <SelectItem value="transactional">Transactional (Domestic)</SelectItem>
                <SelectItem value="promotional">Promotional (Domestic)</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="misscall">MissCall</SelectItem>
                <SelectItem value="international">International SMS</SelectItem>
              </SelectContent>
            </Select>
            {isInternational ? (
              <p className="text-xs text-muted-foreground">
                Adds to the user&apos;s <strong>International SMS</strong> balance (Twilio credits). The
                Domestic balance is not changed.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Adds to the user&apos;s <strong>Domestic</strong> credit balance (SIM Base).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks / Notes</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              placeholder="Optional notes about this transfer"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
            >
              {loading ? 'Transferring...' : 'Transfer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferFundModal;
