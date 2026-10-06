import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AddEditTemplateModal = ({ open, onOpenChange, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    template_name: '',
    senderid: '',
    template_content: '',
    status: 'Pending',
    dlt_template_id: '',
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          template_name: initialData.template_name || '',
          senderid: initialData.senderid || '',
          template_content: initialData.template_content || '',
          status: initialData.status || 'Pending',
          dlt_template_id: initialData.dlt_template_id || '',
          remarks: initialData.remarks || ''
        });
      } else {
        setFormData({
          template_name: '',
          senderid: '',
          template_content: '',
          status: 'Pending',
          dlt_template_id: '',
          remarks: ''
        });
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      // Error handled in parent/hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-navy">{initialData ? 'Edit Template' : 'Add New Template'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name <span className="text-destructive">*</span></label>
              <Input 
                required 
                value={formData.template_name}
                onChange={e => setFormData({...formData, template_name: e.target.value})}
                placeholder="e.g. OTP Verification"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sender ID <span className="text-destructive">*</span></label>
              <Input 
                required 
                value={formData.senderid}
                onChange={e => setFormData({...formData, senderid: e.target.value.toUpperCase()})}
                placeholder="e.g. BHARAT"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Template Content <span className="text-destructive">*</span></label>
            <Textarea 
              required 
              rows={4}
              value={formData.template_content}
              onChange={e => setFormData({...formData, template_content: e.target.value})}
              placeholder="Your OTP is {#var#}. Do not share it."
            />
            <p className="text-xs text-muted-foreground">Use {'{#var#}'} for variables.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">DLT Template ID</label>
              <Input 
                value={formData.dlt_template_id}
                onChange={e => setFormData({...formData, dlt_template_id: e.target.value})}
                placeholder="19-digit DLT Template ID"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Remarks</label>
            <Input 
              value={formData.remarks}
              onChange={e => setFormData({...formData, remarks: e.target.value})}
              placeholder="Any additional notes"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-navy text-navy-foreground hover:bg-navy/90">
              {isSubmitting ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditTemplateModal;