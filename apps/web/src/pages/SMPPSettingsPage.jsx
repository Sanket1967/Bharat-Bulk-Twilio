import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Save, RefreshCcw, Trash2, Eye, EyeOff, Shield, Server, Plug, PlugZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useSmppSettings } from '@/hooks/useSmppSettings.js';
import SMPPStatusDisplay from '@/components/SMPPStatusDisplay.jsx';
import SMPPConnectionTest from '@/components/SMPPConnectionTest.jsx';

const TON_OPTIONS = ['Unknown', 'International', 'National', 'Network', 'Subscriber', 'Alphanumeric', 'Abbreviated', 'Reserved'];
const NPI_OPTIONS = ['Unknown', 'ISDN', 'Data', 'Telex', 'LandMobile', 'MaritimeMobile'];
const BIND_OPTIONS = ['Transmitter', 'Receiver', 'Transceiver'];

const SMPPSettingsPage = () => {
  const {
    settings,
    loading,
    saving,
    liveStatus,
    connecting,
    fetchSmppSettings,
    saveSmppSettings,
    testConnection,
    connectSmpp,
    startStatusPolling,
    stopStatusPolling,
    resetToDefault,
    clearConfiguration
  } = useSmppSettings();

  const [formData, setFormData] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    fetchSmppSettings();
    startStatusPolling();
    return () => stopStatusPolling();
  }, [fetchSmppSettings, startStatusPolling, stopStatusPolling]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, value) => {
    const num = parseInt(value, 10);
    handleChange(field, isNaN(num) ? '' : num);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveSmppSettings(formData);
  };

  const handleClearConfirm = async () => {
    await clearConfiguration();
    setClearDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <RefreshCcw className="h-8 w-8 animate-spin" />
            <p>Loading SMPP Configuration...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>SMPP Settings - Admin - Bharat Bulk SMS</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <div className="bg-navy text-navy-foreground py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-sm text-navy-foreground/70 mb-4 flex items-center gap-2">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <span>/</span>
              <Link to="/admin" className="hover:text-white transition-colors">Settings</Link>
              <span>/</span>
              <span className="text-white font-medium">SMPP Configuration</span>
            </div>
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">SMPP Configuration</h1>
            </div>
          </div>
        </div>

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            
            {/* Live SMPP connection status + Connect/Reconnect control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-xl shadow-sm p-5 mb-6">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3.5 w-3.5 rounded-full shrink-0 ${
                    liveStatus.connected
                      ? 'bg-success shadow-[0_0_0_4px_hsl(var(--success)/0.2)]'
                      : liveStatus.state === 'BINDING'
                        ? 'bg-warning shadow-[0_0_0_4px_hsl(var(--warning)/0.2)] animate-pulse'
                        : 'bg-destructive shadow-[0_0_0_4px_hsl(var(--destructive)/0.2)]'
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold text-navy">
                    SMPP: {liveStatus.connected ? 'CONNECTED' : liveStatus.state || 'DISCONNECTED'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {liveStatus.connected
                      ? `Uptime ${Math.floor(liveStatus.uptimeSeconds / 60)}m ${liveStatus.uptimeSeconds % 60}s · TPS ${liveStatus.tps}`
                      : liveStatus.configured
                        ? `Configured · TPS ${liveStatus.tps} · click Connect to bind`
                        : 'Not configured — save credentials below, then Connect'}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                onClick={connectSmpp}
                disabled={connecting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {connecting ? (
                  <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" /> Connecting…</>
                ) : liveStatus.connected ? (
                  <><PlugZap className="h-4 w-4 mr-2" /> Reconnect SMPP</>
                ) : (
                  <><Plug className="h-4 w-4 mr-2" /> Connect SMPP</>
                )}
              </Button>
            </div>

            <SMPPStatusDisplay 
              status={settings?.lastConnectionStatus}
              lastConnectionTime={settings?.lastConnectionTime}
              lastError={settings?.lastConnectionError}
              uptime={settings?.connectionUptime}
            />

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Connection */}
              <div className="form-section">
                <h2 className="form-section-title">Basic Connection Parameters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="serverHost">Server Host / IP <span className="text-destructive">*</span></Label>
                    <Input 
                      id="serverHost" 
                      required 
                      value={formData.serverHost || ''} 
                      onChange={(e) => handleChange('serverHost', e.target.value)}
                      placeholder="smpp.provider.com"
                      className="focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serverPort">Server Port <span className="text-destructive">*</span></Label>
                    <Input 
                      id="serverPort" 
                      type="number" 
                      required 
                      value={formData.serverPort || ''} 
                      onChange={(e) => handleNumberChange('serverPort', e.target.value)}
                      placeholder="2775"
                      className="focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="systemId">System ID (Username) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="systemId" 
                      required 
                      value={formData.systemId || ''} 
                      onChange={(e) => handleChange('systemId', e.target.value)}
                      className="focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? 'text' : 'password'} 
                        required 
                        value={formData.password || ''} 
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="focus-visible:ring-primary pr-10"
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
                    <Label htmlFor="systemType">System Type</Label>
                    <Input 
                      id="systemType" 
                      value={formData.systemType || ''} 
                      onChange={(e) => handleChange('systemType', e.target.value)}
                      placeholder="e.g. VMA"
                      className="focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Address Configuration */}
              <div className="form-section">
                <h2 className="form-section-title">Address Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="sourceAddress">Default Source Address (Sender ID)</Label>
                    <Input 
                      id="sourceAddress" 
                      value={formData.sourceAddress || ''} 
                      onChange={(e) => handleChange('sourceAddress', e.target.value)}
                      placeholder="e.g. BHARAT"
                      className="focus-visible:ring-primary md:w-1/2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source Address TON</Label>
                    <Select value={formData.sourceAddressTON || 'Unknown'} onValueChange={(v) => handleChange('sourceAddressTON', v)}>
                      <SelectTrigger className="focus:ring-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TON_OPTIONS.map(opt => <SelectItem key={`s-ton-${opt}`} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source Address NPI</Label>
                    <Select value={formData.sourceAddressNPI || 'Unknown'} onValueChange={(v) => handleChange('sourceAddressNPI', v)}>
                      <SelectTrigger className="focus:ring-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NPI_OPTIONS.map(opt => <SelectItem key={`s-npi-${opt}`} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Destination Address TON</Label>
                    <Select value={formData.destinationAddressTON || 'Unknown'} onValueChange={(v) => handleChange('destinationAddressTON', v)}>
                      <SelectTrigger className="focus:ring-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TON_OPTIONS.map(opt => <SelectItem key={`d-ton-${opt}`} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Destination Address NPI</Label>
                    <Select value={formData.destinationAddressNPI || 'Unknown'} onValueChange={(v) => handleChange('destinationAddressNPI', v)}>
                      <SelectTrigger className="focus:ring-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NPI_OPTIONS.map(opt => <SelectItem key={`d-npi-${opt}`} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Timeouts & Connections */}
              <div className="form-section">
                <h2 className="form-section-title">Timeouts & Connections</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="connectionTimeout">Connection Timeout (sec)</Label>
                    <Input 
                      id="connectionTimeout" 
                      type="number" 
                      value={formData.connectionTimeout || ''} 
                      onChange={(e) => handleNumberChange('connectionTimeout', e.target.value)}
                      className="focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requestTimeout">Request Timeout (sec)</Label>
                    <Input 
                      id="requestTimeout" 
                      type="number" 
                      value={formData.requestTimeout || ''} 
                      onChange={(e) => handleNumberChange('requestTimeout', e.target.value)}
                      className="focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxConnections">Max Connections (Binds)</Label>
                    <Input 
                      id="maxConnections" 
                      type="number" 
                      value={formData.maxConnections || ''} 
                      onChange={(e) => handleNumberChange('maxConnections', e.target.value)}
                      className="focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* SSL Settings */}
              <div className="form-section bg-muted/30">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-navy" />
                    <h2 className="text-lg font-semibold text-navy">SSL/TLS Settings</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="enableSSL" className="cursor-pointer">Enable SSL/TLS</Label>
                    <Switch 
                      id="enableSSL" 
                      checked={formData.enableSSL || false} 
                      onCheckedChange={(checked) => handleChange('enableSSL', checked)}
                    />
                  </div>
                </div>
                
                {formData.enableSSL && (
                  <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="sslCertificatePath">SSL Certificate Path (Optional)</Label>
                    <Input 
                      id="sslCertificatePath" 
                      value={formData.sslCertificatePath || ''} 
                      onChange={(e) => handleChange('sslCertificatePath', e.target.value)}
                      placeholder="/etc/ssl/certs/smpp.crt"
                      className="focus-visible:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to use default system certificates.</p>
                  </div>
                )}
              </div>

              {/* Advanced Settings */}
              <div className="form-section">
                <h2 className="form-section-title">Advanced Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Bind Type</Label>
                    <Select value={formData.bindType || 'Transceiver'} onValueChange={(v) => handleChange('bindType', v)}>
                      <SelectTrigger className="focus:ring-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BIND_OPTIONS.map(opt => <SelectItem key={`bind-${opt}`} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enquireLinkInterval">Enquire Link Interval (sec)</Label>
                    <Input 
                      id="enquireLinkInterval" 
                      type="number" 
                      value={formData.enquireLinkInterval || ''} 
                      onChange={(e) => handleNumberChange('enquireLinkInterval', e.target.value)}
                      className="focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reconnectInterval">Reconnect Interval (sec)</Label>
                    <Input 
                      id="reconnectInterval" 
                      type="number" 
                      value={formData.reconnectInterval || ''} 
                      onChange={(e) => handleNumberChange('reconnectInterval', e.target.value)}
                      className="focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="enableAutoReconnect" 
                      checked={formData.enableAutoReconnect || false} 
                      onCheckedChange={(c) => handleChange('enableAutoReconnect', c)}
                    />
                    <Label htmlFor="enableAutoReconnect" className="cursor-pointer">Auto-Reconnect</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="enableConnectionPooling" 
                      checked={formData.enableConnectionPooling || false} 
                      onCheckedChange={(c) => handleChange('enableConnectionPooling', c)}
                    />
                    <Label htmlFor="enableConnectionPooling" className="cursor-pointer">Connection Pooling</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="logSMPPMessages" 
                      checked={formData.logSMPPMessages || false} 
                      onCheckedChange={(c) => handleChange('logSMPPMessages', c)}
                    />
                    <Label htmlFor="logSMPPMessages" className="cursor-pointer">Log PDU Messages</Label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
                <div className="w-full sm:w-auto">
                  <SMPPConnectionTest formData={formData} onTest={testConnection} />
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setClearDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Clear
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetToDefault}
                  >
                    Reset Defaults
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-navy text-navy-foreground hover:bg-navy/90"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : (
                      <><Save className="h-4 w-4 mr-2" /> Save Configuration</>
                    )}
                  </Button>
                </div>
              </div>

            </form>
          </div>
        </main>

        <Footer />
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-destructive/20">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Clear Configuration
            </DialogTitle>
            <DialogDescription className="pt-3 text-base">
              Are you sure you want to completely clear the SMPP configuration? This will disconnect the server and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearConfirm}>
              Yes, Clear Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SMPPSettingsPage;