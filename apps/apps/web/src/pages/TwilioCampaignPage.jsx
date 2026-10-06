import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Upload, Send, Phone, MessageSquare, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

// Extract phone numbers from CSV/text. Accepts comma/newline/semicolon
// separated values and normalizes to E.164-ish (digits only).
const extractNumbers = (text) =>
  String(text || '')
    .split(/[\n,;\s]+/)
    .map((s) => s.trim().replace(/\D/g, ''))
    .filter((n) => n.length >= 10);

const TwilioCampaignPage = () => {
  const { currentUser } = useAuth();
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [credits, setCredits] = useState(null);
  const [creditsUnlimited, setCreditsUnlimited] = useState(false);
  const [provisioned, setProvisioned] = useState(true);

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, sent: 0, failed: 0 });
  const [fileName, setFileName] = useState('');

  const cancelRef = useRef(false);

  const parsedNumbers = extractNumbers(numbers);
  const requiredCredits = parsedNumbers.length;

  const loadNumbers = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/twilio/numbers', {
        headers: { Authorization: pb.authStore.token },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAvailableNumbers(data.numbers || []);
        if (data.numbers?.length && !fromNumber) {
          setFromNumber(data.numbers[0].phoneNumber);
        }
      }
    } catch (_) { /* ignore */ }
  }, [fromNumber]);

  const loadCredits = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/twilio/reports', {
        headers: { Authorization: pb.authStore.token },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCredits(data.sms_credits ?? 0);
        setCreditsUnlimited(!!data.credits_unlimited);
        setProvisioned(!!data.sub_account_provisioned);
      }
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    loadNumbers();
    loadCredits();
  }, [loadNumbers, loadCredits]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error('File must be under 1MB');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const nums = extractNumbers(ev.target.result);
      setNumbers((prev) => {
        const existing = extractNumbers(prev);
        const merged = Array.from(new Set([...existing, ...nums]));
        return merged.join(', ');
      });
      toast.success(`${nums.length} numbers loaded from ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleSend = async () => {
    if (!provisioned) {
      toast.error('Your account has no Twilio sub-account. Ask an admin to provision one.');
      return;
    }
    if (parsedNumbers.length === 0) {
      toast.error('Enter at least one valid phone number');
      return;
    }
    if (!message.trim()) {
      toast.error('Message is required');
      return;
    }
    if (!fromNumber) {
      toast.error('Select a from number');
      return;
    }
    if (!creditsUnlimited && credits !== null && requiredCredits > credits) {
      toast.error(`Insufficient credits. Need ${requiredCredits}, have ${credits}.`);
      return;
    }

    setSending(true);
    cancelRef.current = false;
    setProgress({ done: 0, total: parsedNumbers.length, sent: 0, failed: 0 });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < parsedNumbers.length; i++) {
      if (cancelRef.current) break;
      const to = parsedNumbers[i];
      try {
        const res = await apiServerClient.fetch('/twilio/send-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({ to, message, fromNumber }),
        });
        if (res.ok) {
          sent++;
        } else {
          failed++;
          const body = await res.json().catch(() => ({}));
          // Stop the whole campaign if credits run out or window closes.
          if (body?.error && /credit|timing|10AM/i.test(body.error)) {
            toast.error(body.error);
            setProgress((p) => ({ ...p, done: i + 1, sent, failed }));
            break;
          }
        }
      } catch (_) {
        failed++;
      }
      setProgress({ done: i + 1, total: parsedNumbers.length, sent, failed });
      // 1 second delay between each send to avoid filtering (skip after last).
      if (i < parsedNumbers.length - 1 && !cancelRef.current) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setSending(false);
    if (!cancelRef.current) {
      toast.success(`Campaign complete: ${sent} sent, ${failed} failed`);
    }
    loadCredits();
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setSending(false);
    toast.message('Campaign stopped');
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  // Admins have unlimited International SMS credits (server-side bypass), so
  // mirror the domestic credit balance for the display instead of showing 0.
  // The actual credit gate below still uses `credits` / `creditsUnlimited`.
  const displayCredits = creditsUnlimited ? (currentUser?.credits || 0) : credits;

  return (
    <>
      <Helmet>
        <title>International SMS Campaign - Bharat Bulk SMS</title>
        <meta name="description" content="Send international SMS campaigns with CSV upload and live progress." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Link to="/dashboard" className="hover:text-sms-navy transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-sms-navy font-medium">International SMS</span>
            </div>

            <h1 className="text-3xl font-bold text-sms-navy mb-6">International SMS Campaign</h1>

            {!provisioned && (
              <div className="flex items-start gap-3 rounded-lg border border-sms-orange/30 bg-[#FFF8F0] p-4 mb-6 text-sm text-sms-navy">
                <AlertTriangle className="h-5 w-5 shrink-0 text-sms-orange mt-0.5" />
                <div>
                  Your account has no Twilio sub-account yet. Ask an admin to provision one before sending.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border border-border shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-sms-navy border-b pb-3 mb-4">Compose Campaign</h2>

                  <div className="space-y-5">
                    {/* From number */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-sms-navy">From Number (Toll-Free)</Label>
                      {availableNumbers.length > 0 ? (
                        <Select value={fromNumber} onValueChange={setFromNumber}>
                          <SelectTrigger className="border-border focus:ring-sms-orange">
                            <SelectValue placeholder="Select a number" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableNumbers.map((n) => (
                              <SelectItem key={n.phoneNumber} value={n.phoneNumber}>
                                {n.phoneNumber} {n.friendlyName ? `(${n.friendlyName})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="e.g. +12345678901"
                          value={fromNumber}
                          onChange={(e) => setFromNumber(e.target.value)}
                          className="border-border focus-visible:ring-sms-orange"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Use a toll-free number provisioned on your Twilio sub-account.
                      </p>
                    </div>

                    {/* Numbers / CSV */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-sms-navy">Recipient Numbers</Label>
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sms-orange hover:underline">
                            <Upload className="h-3.5 w-3.5" /> Upload CSV
                          </span>
                          <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
                        </label>
                      </div>
                      <Textarea
                        value={numbers}
                        onChange={(e) => setNumbers(e.target.value)}
                        placeholder="Paste numbers or upload a CSV. Comma/newline separated."
                        className="min-h-[120px] resize-y border-border focus-visible:ring-sms-orange font-mono text-sm"
                      />
                      {fileName && <p className="text-xs text-sms-green">Loaded: {fileName}</p>}
                      <div className="text-xs font-medium text-sms-navy">
                        ({parsedNumbers.length}) valid numbers
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-sms-navy">Message</Label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="min-h-[120px] resize-y border-border focus-visible:ring-sms-orange"
                      />
                      <div className="text-xs text-muted-foreground">{message.length} characters</div>
                    </div>

                    {/* Credit summary */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="font-semibold text-sms-navy">Available credits: </span>
                        <span className="font-bold text-sms-navy">{creditsUnlimited ? displayCredits : (credits === null ? '…' : credits)}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-sms-navy">Required: </span>
                        <span className={`font-bold ${creditsUnlimited || credits === null || requiredCredits <= credits ? 'text-sms-green' : 'text-destructive'}`}>{requiredCredits}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-sms-navy">After send: </span>
                        <span className="font-bold text-sms-navy">{creditsUnlimited ? displayCredits : (credits === null ? '…' : Math.max(0, credits - requiredCredits))}</span>
                      </div>
                    </div>

                    {/* Action */}
                    {!sending ? (
                      <Button
                        onClick={handleSend}
                        disabled={parsedNumbers.length === 0 || !message.trim() || !fromNumber}
                        className="bg-sms-orange text-white hover:bg-sms-orange/90 min-w-[160px]"
                      >
                        <Send className="h-4 w-4 mr-2" /> Send Campaign
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-sms-navy">
                            Sending... {progress.done}/{progress.total}
                          </span>
                          <Button variant="destructive" size="sm" onClick={handleCancel}>
                            Stop
                          </Button>
                        </div>
                        <Progress value={pct} className="h-2.5" />
                        <div className="flex gap-4 text-sm">
                          <span className="flex items-center gap-1 text-sms-green"><CheckCircle2 className="h-4 w-4" /> {progress.sent} sent</span>
                          <span className="flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" /> {progress.failed} failed</span>
                          <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> 1s delay between sends</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <Card className="border border-border shadow-sm p-5 sticky top-24">
                  <h3 className="font-semibold text-sms-navy mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-sms-orange" /> How it works
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-sms-navy mt-0.5" /> Upload a CSV or paste numbers.</li>
                    <li className="flex gap-2"><MessageSquare className="h-4 w-4 shrink-0 text-sms-navy mt-0.5" /> Write your message and pick a from number.</li>
                    <li className="flex gap-2"><Send className="h-4 w-4 shrink-0 text-sms-navy mt-0.5" /> Sends run with a 1-second delay between each to avoid filtering.</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-sms-navy mt-0.5" /> 1 credit is deducted per SMS. Live status appears in Reports.</li>
                  </ul>

                </Card>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TwilioCampaignPage;
