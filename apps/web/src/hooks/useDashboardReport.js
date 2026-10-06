import { useState, useEffect, useCallback, useRef } from 'react';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';

// Live dashboard report — fetches credits_left + owner-scoped sms_logs from the
// backend-mediated /dashboard/report route (JWT auth, never exposes the API
// key). Auto-refreshes every 10 seconds and surfaces a lowBalance flag when
// the API responds with HTTP 402 so the UI can show a Low Balance modal.
//
// `enabled` gates the fetch (e.g. only for International-enabled users) so
// domestic-only accounts don't get spurious 402s.
export const useDashboardReport = (enabled = true) => {
  const [creditsLeft, setCreditsLeft] = useState(0);
  const [creditsUnlimited, setCreditsUnlimited] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowBalance, setLowBalance] = useState(false);
  const [error, setError] = useState(null);
  const dismissedRef = useRef(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/dashboard/report', {
        headers: { Authorization: pb.authStore.token },
      });
      const data = await res.json().catch(() => ({}));
      // 402 is a valid low-balance signal, not a hard error. Anything else
      // non-2xx is a real failure.
      if (!res.ok && res.status !== 402) {
        throw new Error(data.error || 'Failed to load report');
      }
      setCreditsLeft(Number(data.credits_left) || 0);
      setCreditsUnlimited(!!data.credits_unlimited);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      const isLow = res.status === 402;
      setLowBalance(isLow);
      // If the balance recovers above zero, allow the modal to show again
      // next time it drops.
      if (!isLow) dismissedRef.current = false;
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    fetchReport();
    const id = setInterval(fetchReport, 10000);
    return () => clearInterval(id);
  }, [enabled, fetchReport]);

  const dismissLowBalance = useCallback(() => {
    dismissedRef.current = true;
    setLowBalance(false);
  }, []);

  return {
    creditsLeft,
    creditsUnlimited,
    logs,
    loading,
    lowBalance: lowBalance && !dismissedRef.current,
    error,
    refresh: fetchReport,
    dismissLowBalance,
  };
};
