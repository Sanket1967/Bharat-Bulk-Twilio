import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, Save } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

const UserProfileForm = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    email: '',
    password: '',
    promo_cutting_limit: '',
    promo_cutting_percent: '',
    trans_cutting_limit: '',
    trans_cutting_percent: '',
    voice_cutting_limit_percent: '',
    voice_cutting_percent: '',
    account_type: 'User',
    last_login_date: '',
    account_expiry_date: '',
    last_login_ip: '',
    peid: '',
    tmid: '',
    delivery_percentage: 100,
    account_enabled: true,
    can_use_international: false,
    can_use_domestic: true,
    is_api_enabled: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        mobile_number: user.mobile_number || '',
        email: user.email || '',
        password: '',
        promo_cutting_limit: user.promo_cutting_limit || '',
        promo_cutting_percent: user.promo_cutting_percent || '',
        trans_cutting_limit: user.trans_cutting_limit || '',
        trans_cutting_percent: user.trans_cutting_percent || '',
        voice_cutting_limit_percent: user.voice_cutting_limit_percent || '',
        voice_cutting_percent: user.voice_cutting_percent || '',
        account_type: user.account_type || 'User',
        last_login_date: user.last_login_date ? user.last_login_date.split(' ')[0] : '',
        account_expiry_date: user.account_expiry_date ? user.account_expiry_date.split(' ')[0] : '',
        last_login_ip: user.last_login_ip || '',
        peid: user.peid || '',
        tmid: user.tmid || '',
        delivery_percentage: user.delivery_percentage != null ? user.delivery_percentage : 100,
        account_enabled: user.account_enabled !== false,
        can_use_international: user.can_use_international === true,
        can_use_domestic: user.can_use_domestic !== false,
        is_api_enabled: user.is_api_enabled === true,
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, value) => {
    const num = value === '' ? '' : Number(value);
    handleChange(field, num);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave = { ...formData };
      
      if (!dataToSave.password) {
        delete dataToSave.password;
      } else {
        dataToSave.passwordConfirm = dataToSave.password;
      }
      
      dataToSave.last_login_date = dataToSave.last_login_date ? `${dataToSave.last_login_date} 00:00:00.000Z` : null;
      dataToSave.account_expiry_date = dataToSave.account_expiry_date ? `${dataToSave.account_expiry_date} 00:00:00.000Z` : null;

      await pb.collection('users').update(user.id, dataToSave, { $autoCancel: false });
      
      toast.success('User profile updated successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update user profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-semibold text-muted-foreground">Account Status</Label>
          <Switch 
            checked={formData.account_enabled} 
            onCheckedChange={(v) => handleChange('account_enabled', v)} 
          />
          <span className={`text-sm font-medium ${formData.account_enabled ? 'text-success' : 'text-destructive'}`}>
            {formData.account_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <Label className="text-sm font-semibold text-navy block mb-3">Service Access</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">International SMS</p>
              <p className="text-xs text-muted-foreground">Twilio route · 24/7</p>
            </div>
            <Switch
              checked={formData.can_use_international}
              onCheckedChange={(v) => handleChange('can_use_international', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Domestic SMS</p>
              <p className="text-xs text-muted-foreground">SIM Base · 10AM–6PM</p>
            </div>
            <Switch
              checked={formData.can_use_domestic}
              onCheckedChange={(v) => handleChange('can_use_domestic', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">API Access</p>
              <p className="text-xs text-muted-foreground">API Keys & Docs</p>
            </div>
            <Switch
              checked={formData.is_api_enabled}
              onCheckedChange={(v) => handleChange('is_api_enabled', v)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            User Name (ID: {user.id})
          </Label>
          <Input 
            id="name" 
            value={formData.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Password
          </Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? 'text' : 'password'}
              placeholder="Leave empty to keep unchanged"
              value={formData.password} 
              onChange={(e) => handleChange('password', e.target.value)} 
              className="pr-10"
            />
            <button 
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="promo_cutting_limit" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Promo Cutting Limit
          </Label>
          <Input 
            id="promo_cutting_limit" 
            type="number"
            value={formData.promo_cutting_limit} 
            onChange={(e) => handleNumberChange('promo_cutting_limit', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile_number" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Mobile Number
          </Label>
          <Input 
            id="mobile_number" 
            value={formData.mobile_number} 
            onChange={(e) => handleChange('mobile_number', e.target.value)} 
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Email
          </Label>
          <Input 
            id="email" 
            type="email"
            value={formData.email} 
            onChange={(e) => handleChange('email', e.target.value)} 
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="promo_cutting_percent" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Promo Cutting %
          </Label>
          <Input 
            id="promo_cutting_percent" 
            type="number"
            step="0.01"
            value={formData.promo_cutting_percent} 
            onChange={(e) => handleNumberChange('promo_cutting_percent', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account_type" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Account Type
          </Label>
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

        <div className="space-y-2">
          <Label htmlFor="last_login_date" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Last Login Date
          </Label>
          <Input 
            id="last_login_date" 
            type="date"
            value={formData.last_login_date} 
            disabled
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trans_cutting_limit" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Trans Cutting Limit
          </Label>
          <Input 
            id="trans_cutting_limit" 
            type="number"
            value={formData.trans_cutting_limit} 
            onChange={(e) => handleNumberChange('trans_cutting_limit', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account_expiry_date" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Account Expiry Date
          </Label>
          <Input 
            id="account_expiry_date" 
            type="date"
            value={formData.account_expiry_date} 
            onChange={(e) => handleChange('account_expiry_date', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_login_ip" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Last Login IP
          </Label>
          <Input 
            id="last_login_ip" 
            value={formData.last_login_ip} 
            disabled
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trans_cutting_percent" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Trans Cutting %
          </Label>
          <Input 
            id="trans_cutting_percent" 
            type="number"
            step="0.01"
            value={formData.trans_cutting_percent} 
            onChange={(e) => handleNumberChange('trans_cutting_percent', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice_cutting_limit_percent" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Voice Cutting Limit %
          </Label>
          <Input 
            id="voice_cutting_limit_percent" 
            type="number"
            step="0.01"
            value={formData.voice_cutting_limit_percent} 
            onChange={(e) => handleNumberChange('voice_cutting_limit_percent', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice_cutting_percent" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Voice Cutting %
          </Label>
          <Input 
            id="voice_cutting_percent" 
            type="number"
            step="0.01"
            value={formData.voice_cutting_percent} 
            onChange={(e) => handleNumberChange('voice_cutting_percent', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="peid" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            PEID
          </Label>
          <Input 
            id="peid" 
            value={formData.peid} 
            onChange={(e) => handleChange('peid', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tmid" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            TMID
          </Label>
          <Input 
            id="tmid" 
            value={formData.tmid} 
            onChange={(e) => handleChange('tmid', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="delivery_percentage" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Delivery % (1-100)
          </Label>
          <Input
            id="delivery_percentage"
            type="number"
            min="1"
            max="100"
            value={formData.delivery_percentage}
            onChange={(e) => {
              let val = parseInt(e.target.value, 10);
              if (isNaN(val)) val = '';
              else val = Math.max(1, Math.min(100, val));
              handleChange('delivery_percentage', val);
            }}
          />
          <p className="text-xs text-muted-foreground">Cap on how many recipient numbers are actually sent via SMPP per campaign.</p>
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-end">
        <Button 
          type="submit" 
          disabled={saving}
          className="bg-navy text-navy-foreground hover:bg-navy/90 px-8"
        >
          {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Update Settings</>}
        </Button>
      </div>
    </form>
  );
};

export default UserProfileForm;