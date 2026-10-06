import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import pb from '@/lib/pocketbaseClient';

const AddEditSenderIDModal = ({ open, onOpenChange, onSubmit, initialData }) => {
  const isAdmin = pb.authStore.model?.role === 'admin';
  const [formData, setFormData] = useState({
    senderid: '',
    purpose: 'Promotional',
    type: 'Transactional',
    status: 'Pending',
    is_default: false,
    dlt_entity_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          senderid: initialData.senderid || '',
          purpose: initialData.purpose || 'Promotional',
          type: initialData.type || 'Transactional',
          status: initialData.status || 'Pending',
          is_default: initialData.is_default || false,
          dlt_entity_id: initialData.dlt_entity_id || ''
        });
      } else {
        setFormData({
          senderid: '',
          purpose: 'Promotional',
          type: 'Transactional',
          status: 'Pending',
          is_default: false,
          dlt_entity_id: ''
        });
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (!isAdmin) {
        payload.status = 'Pending';
      }
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error) {
      // Error handled in parent/hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-navy">{initialData ? 'Edit Sender ID' : 'Add New Sender ID'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sender ID <span className="text-destructive">*</span></label>
            <Input 
              required 
              maxLength={6}
              value={formData.senderid}
              onChange={e => setFormData({...formData, senderid: e.target.value.toUpperCase()})}
              placeholder="e.g. BHARAT"
            />
            <p className="text-xs text-muted-foreground">Must be exactly 6 alphabetic characters for promotional/transactional.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Purpose <span className="text-destructive">*</span></label>
              <Select value={formData.purpose} onValueChange={v => setFormData({...formData, purpose: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Promotional">Promotional</SelectItem>
                  <SelectItem value="Transactional">Transactional</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type <span className="text-destructive">*</span></label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transactional">Transactional</SelectItem>
                  <SelectItem value="Promotional">Promotional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isAdmin ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {initialData
                ? `Current status: ${initialData.status || 'Pending'}. Only an admin can approve this Sender ID.`
                : 'New Sender IDs are submitted as Pending. An admin must approve before you can use it in campaigns.'}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">DLT Entity ID</label>
            <Input 
              value={formData.dlt_entity_id}
              onChange={e => setFormData({...formData, dlt_entity_id: e.target.value})}
              placeholder="19-digit DLT Entity ID"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="is_default"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={formData.is_default}
              onChange={e => setFormData({...formData, is_default: e.target.checked})}
            />
            <label htmlFor="is_default" className="text-sm font-medium cursor-pointer">
              Set as default Sender ID
            </label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-navy text-navy-foreground hover:bg-navy/90">
              {isSubmitting ? 'Saving...' : initialData ? 'Save Sender ID' : isAdmin ? 'Save Sender ID' : 'Submit for Approval'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditSenderIDModal;
