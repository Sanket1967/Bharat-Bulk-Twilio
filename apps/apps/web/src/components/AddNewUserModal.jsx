import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

const AddNewUserModal = ({ open, onOpenChange, onUserCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile_number: '',
    password: '',
    account_type: 'User',
    account_expiry_date: '',
    credits: 0
  });
  const [userType, setUserType] = useState('domestic'); // 'domestic' | 'international'
  const [subAccounts, setSubAccounts] = useState([]);
  const [selectedSubAccount, setSelectedSubAccount] = useState('');
  const [subAccountsLoading, setSubAccountsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Fetch existing Twilio sub-accounts when the modal opens in international
  // mode. The backend returns sid + friendlyName + status only — no tokens.
  const fetchSubAccounts = async () => {
    setSubAccountsLoading(true);
    try {
      const res = await apiServerClient.fetch('/twilio/subaccounts', {
        headers: { Authorization: pb.authStore.token },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubAccounts(data.subaccounts || []);
        if ((data.subaccounts || []).length === 0) {
          toast.warning('No eligible Twilio sub-accounts found under your master account.');
        }
      } else {
        toast.error(data.error || 'Failed to load Twilio sub-accounts');
        setSubAccounts([]);
      }
    } catch (_) {
      toast.error('Failed to load Twilio sub-accounts');
      setSubAccounts([]);
    } finally {
      setSubAccountsLoading(false);
    }
  };

  useEffect(() => {
    if (open && userType === 'international') {
      fetchSubAccounts();
    }
    if (!open) {
      // reset international selection when modal closes
      setSelectedSubAccount('');
    }
  }, [open, userType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.mobile_number || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.mobile_number.length !== 10) {
      toast.error('Mobile number must be 10 digits');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (userType === 'international' && !selectedSubAccount) {
      toast.error('Please select a Twilio sub-account for the international user');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        mobile_number: formData.mobile_number,
        password: formData.password,
        passwordConfirm: formData.password,
        role: formData.account_type === 'Admin' ? 'admin' : 'user',
        account_type: formData.account_type,
        credits: Number(formData.credits) || 0,
        is_active: true,
        account_enabled: true,
        // Service-access flags. Admins get everything; regular users get the
        // flag matching the selected SMS user type.
        can_use_domestic: formData.account_type === 'Admin' ? true : userType === 'domestic',
        can_use_international: formData.account_type === 'Admin' ? true : userType === 'international',
        is_api_enabled: formData.account_type === 'Admin',
      };

      if (formData.account_expiry_date) {
        userData.account_expiry_date = `${formData.account_expiry_date} 00:00:00.000Z`;
      }

      const newUser = await pb.collection('users').create(userData, { $autoCancel: false });
      
      toast.success('User created successfully');

      if (userType === 'international') {
        // International SMS user: associate an already-existing Twilio
        // sub-account (selected by the admin) with the new user. The backend
        // fetches + stores the auth token server-side; it never reaches the
        // browser. A failure here does not block user creation.
        try {
          const assocRes = await apiServerClient.fetch('/twilio/associate-subaccount', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token,
            },
            body: JSON.stringify({
              userId: newUser.id,
              subAccountSid: selectedSubAccount,
            }),
          });
          if (assocRes.ok) {
            toast.success('Twilio sub-account associated');
          } else {
            const body = await assocRes.json().catch(() => ({}));
            toast.warning(
              body?.error
                ? `Twilio association failed: ${body.error}`
                : 'Twilio sub-account could not be associated. You can retry from User Management.',
            );
          }
        } catch (_) {
          toast.warning('Twilio sub-account could not be associated. You can retry from User Management.');
        }
      } else {
        // Domestic user: auto-provision a fresh Twilio sub-account (existing
        // behavior). Fire-and-forget; admin can retry from User Management.
        try {
          const subRes = await apiServerClient.fetch('/twilio/create-subaccount', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token,
            },
            body: JSON.stringify({
              userId: newUser.id,
              friendlyName: formData.name || formData.email,
            }),
          });
          if (subRes.ok) {
            toast.success('Twilio sub-account provisioned');
          } else {
            const body = await subRes.json().catch(() => ({}));
            toast.warning(
              body?.error
                ? `Twilio sub-account not created: ${body.error}`
                : 'Twilio sub-account not created. You can provision it later from User Management.',
            );
          }
        } catch (_) {
          toast.warning('Twilio sub-account not created. You can provision it later from User Management.');
        }
      }

      setFormData({
        name: '',
        email: '',
        mobile_number: '',
        password: '',
        account_type: 'User',
        account_expiry_date: '',
        credits: 0
      });
      setUserType('domestic');
      setSelectedSubAccount('');
      onOpenChange(false);
      if (onUserCreated) onUserCreated();
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.data?.data?.email) {
        toast.error('Email already exists');
      } else if (error.data?.data?.mobile_number) {
        toast.error('Mobile number already exists');
      } else {
        toast.error('Failed to create user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-navy">Add New User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Username <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_number">Mobile Number <span className="text-destructive">*</span></Label>
            <Input
              id="mobile_number"
              type="tel"
              maxLength={10}
              value={formData.mobile_number}
              onChange={(e) => handleChange('mobile_number', e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Account Type</Label>
            <Select value={formData.account_type} onValueChange={(v) => handleChange('account_type', v)}>
              <SelectTrigger id="account_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
            <Label className="text-sm font-semibold text-navy">SMS User Type</Label>
            <RadioGroup
              value={userType}
              onValueChange={setUserType}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label
                htmlFor="ut-domestic"
                className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer transition-colors ${userType === 'domestic' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
              >
                <RadioGroupItem value="domestic" id="ut-domestic" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-foreground">Domestic User</div>
                  <div className="text-xs text-muted-foreground">Auto-provisions a new Twilio sub-account for this user.</div>
                </div>
              </label>
              <label
                htmlFor="ut-international"
                className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer transition-colors ${userType === 'international' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
              >
                <RadioGroupItem value="international" id="ut-international" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-foreground">International SMS User</div>
                  <div className="text-xs text-muted-foreground">Link an existing Twilio sub-account under your master account.</div>
                </div>
              </label>
            </RadioGroup>

            {userType === 'international' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-navy">
                  Twilio Sub-Account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedSubAccount}
                  onValueChange={setSelectedSubAccount}
                  disabled={subAccountsLoading || subAccounts.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        subAccountsLoading
                          ? 'Loading sub-accounts...'
                          : subAccounts.length === 0
                            ? 'No eligible sub-accounts found'
                            : 'Select a sub-account'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {subAccounts.map((sa) => (
                      <SelectItem key={sa.sid} value={sa.sid}>
                        {sa.friendlyName ? `${sa.friendlyName} (${sa.sid})` : sa.sid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only active sub-accounts under your master Twilio account are listed. The auth token is fetched and stored server-side — it is never shown here.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_expiry_date">Account Expiry Date</Label>
            <Input
              id="account_expiry_date"
              type="date"
              value={formData.account_expiry_date}
              onChange={(e) => handleChange('account_expiry_date', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credits">Initial Credits</Label>
            <Input
              id="credits"
              type="number"
              min="0"
              value={formData.credits}
              onChange={(e) => handleChange('credits', e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-navy text-navy-foreground hover:bg-navy/90">
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewUserModal;