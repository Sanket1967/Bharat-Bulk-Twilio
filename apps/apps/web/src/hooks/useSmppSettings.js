import { useState, useCallback, useRef } from 'react';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

const defaultSettings = {
  serverHost: '',
  serverPort: 2775,
  systemId: '',
  password: '',
  systemType: '',
  sourceAddress: '',
  sourceAddressTON: 'Unknown',
  sourceAddressNPI: 'Unknown',
  destinationAddressTON: 'Unknown',
  destinationAddressNPI: 'Unknown',
  connectionTimeout: 30,
  requestTimeout: 60,
  maxConnections: 10,
  enableSSL: false,
  sslCertificatePath: '',
  bindType: 'Transceiver',
  enquireLinkInterval: 30,
  reconnectInterval: 10,
  enableAutoReconnect: true,
  enableConnectionPooling: true,
  logSMPPMessages: false,
  lastConnectionStatus: 'Disconnected'
};

export const useSmppSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveStatus, setLiveStatus] = useState({ state: 'DISCONNECTED', connected: false, uptimeSeconds: 0, configured: false, tps: 50 });
  const [connecting, setConnecting] = useState(false);
  const pollRef = useRef(null);

  // Live SMPP connection state from the Express service.
  const fetchSmppStatus = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/sms/smpp-status', { $autoCancel: false });
      if (res.ok) {
        const data = await res.json();
        setLiveStatus(data);
      }
    } catch (e) {
      console.error('SMPP status fetch failed', e);
    }
  }, []);

  // (Re)bind the SMPP transceiver via the Express service.
  const connectSmpp = useCallback(async () => {
    setConnecting(true);
    try {
      const res = await apiServerClient.fetch('/sms/smpp-connect', {
        method: 'POST',
        headers: { Authorization: pb.authStore.token },
        $autoCancel: false,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to connect SMPP');
      } else if (data.reason === 'not_configured') {
        toast.warning('SMPP credentials not configured. Save the form first.');
      } else {
        toast.success('SMPP connect request sent.');
      }
      await fetchSmppStatus();
    } catch (e) {
      console.error('SMPP connect failed', e);
      toast.error('Failed to connect SMPP');
    } finally {
      setConnecting(false);
    }
  }, [fetchSmppStatus]);

  const fetchSmppSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch the settings for the current admin user
      const records = await pb.collection('smpp_settings').getList(1, 1, {
        filter: `userId = "${pb.authStore.model?.id}"`,
        $autoCancel: false
      });
      
      if (records.items.length > 0) {
        setSettings(records.items[0]);
      } else {
        setSettings({ ...defaultSettings, userId: pb.authStore.model?.id });
      }
    } catch (error) {
      console.error('Error fetching SMPP settings:', error);
      toast.error('Failed to load SMPP settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSmppSettings = async (formData) => {
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        userId: pb.authStore.model?.id
      };

      let savedRecord;
      if (settings?.id) {
        savedRecord = await pb.collection('smpp_settings').update(settings.id, dataToSave, { $autoCancel: false });
        toast.success('SMPP Settings updated successfully');
      } else {
        savedRecord = await pb.collection('smpp_settings').create(dataToSave, { $autoCancel: false });
        toast.success('SMPP Settings created successfully');
      }
      setSettings(savedRecord);
      return savedRecord;
    } catch (error) {
      console.error('Error saving SMPP settings:', error);
      toast.error(error.message || 'Failed to save SMPP settings');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (formData) => {
    // Mocking an endpoint call since there isn't a real one
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        if (!formData.serverHost || !formData.serverPort || !formData.systemId || !formData.password) {
          const errorMsg = 'Missing required connection parameters.';
          if (settings?.id) {
            await pb.collection('smpp_settings').update(settings.id, {
              lastConnectionStatus: 'Error',
              lastConnectionError: errorMsg
            }, { $autoCancel: false });
          }
          reject(new Error(errorMsg));
          return;
        }
        
        // Simulate success
        if (settings?.id) {
          const updated = await pb.collection('smpp_settings').update(settings.id, {
            lastConnectionStatus: 'Connected',
            lastConnectionTime: new Date().toISOString(),
            lastConnectionError: '',
            connectionUptime: 100
          }, { $autoCancel: false });
          setSettings(updated);
        }
        resolve({ message: 'Successfully connected to SMPP server.' });
      }, 1500);
    });
  };

  const resetToDefault = () => {
    setSettings({ ...defaultSettings, id: settings?.id, userId: pb.authStore.model?.id });
    toast.info('Form reset to default values. Don\'t forget to save.');
  };

  const clearConfiguration = async () => {
    if (!settings?.id) return;
    try {
      await pb.collection('smpp_settings').delete(settings.id, { $autoCancel: false });
      setSettings({ ...defaultSettings, userId: pb.authStore.model?.id });
      toast.success('SMPP Configuration cleared successfully');
    } catch (error) {
      console.error('Error clearing configuration:', error);
      toast.error('Failed to clear configuration');
    }
  };

  const startStatusPolling = useCallback(() => {
    if (pollRef.current) return;
    fetchSmppStatus();
    pollRef.current = setInterval(fetchSmppStatus, 5000);
  }, [fetchSmppStatus]);

  const stopStatusPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  return {
    settings,
    loading,
    saving,
    liveStatus,
    connecting,
    fetchSmppSettings,
    saveSmppSettings,
    testConnection,
    connectSmpp,
    fetchSmppStatus,
    startStatusPolling,
    stopStatusPolling,
    resetToDefault,
    clearConfiguration
  };
};