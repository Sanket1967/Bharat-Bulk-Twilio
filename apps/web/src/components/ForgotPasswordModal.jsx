import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePasswordReset } from '@/hooks/usePasswordReset.js';

const ForgotPasswordModal = ({ open, onOpenChange }) => {
  const [email, setEmail] = useState('');
  const { requestPasswordReset, loading } = usePasswordReset();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    try {
      await requestPasswordReset(email);
      onOpenChange(false);
      setEmail('');
    } catch (error) {
      // Error handling is managed inside the hook (toast)
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-navy">Reset Password</DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email Address <span className="text-destructive">*</span></Label>
            <Input 
              id="reset-email"
              type="email"
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="focus-visible:ring-primary"
            />
          </div>

          <div className="pt-4 space-y-3">
            <Button type="submit" disabled={loading || !email} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-navy" onClick={() => onOpenChange(false)}>
              Back to Login
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;