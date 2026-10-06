import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { KeyRound, Plus, Copy, Check, RefreshCw, Trash2, Webhook, Loader2, ShieldAlert, Info } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ApiKeysPage() {
  const { currentUser } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null); // { id, api_key }
  const [copied, setCopied] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);
  // Plaintext keys exist only in this browser session, right after create/regenerate.
  const [sessionKeys, setSessionKeys] = useState({});
  const [viewing, setViewing] = useState(null); // { id, name, api_key | null }

  // Webhook URL setting
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const list = await pb.collection('api_keys').getFullList({
        sort: '-created',
        $autoCancel: false,
      });
      setKeys(list);
    } catch (e) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
    setWebhookUrl(currentUser?.webhook_url || '');
  }, [loadKeys, currentUser]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await apiServerClient.fetch('/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create key');
      setRevealedKey({ id: data.id, api_key: data.api_key, name: data.name });
      setSessionKeys((prev) => ({ ...prev, [data.id]: data.api_key }));
      setCreateOpen(false);
      setNewName('');
      await loadKeys();
      toast.success('API key created');
    } catch (e) {
      toast.error(e.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerate = async (id) => {
    if (!window.confirm('Regenerating will invalidate the old key immediately. Continue?')) return;
    setRegeneratingId(id);
    try {
      const res = await apiServerClient.fetch(`/api-keys/${id}/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate');
      setRevealedKey({ id: data.id, api_key: data.api_key, name: data.name });
      setSessionKeys((prev) => ({ ...prev, [data.id]: data.api_key }));
      await loadKeys();
      toast.success('API key regenerated');
    } catch (e) {
      toast.error(e.message || 'Failed to regenerate');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleToggle = async (id, val) => {
    try {
      await pb.collection('api_keys').update(id, { is_active: val }, { $autoCancel: false });
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, is_active: val } : k)));
    } catch (e) {
      toast.error('Failed to update key');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this API key permanently?')) return;
    try {
      await pb.collection('api_keys').delete(id, { $autoCancel: false });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key deleted');
    } catch (e) {
      toast.error('Failed to delete key');
    }
  };

  const copyKey = async (key) => {
    if (!key) {
      toast.error('Nothing to copy');
      return false;
    }
    // Preferred: async Clipboard API (requires secure context / focus).
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('API key copied to clipboard');
        return true;
      } catch (_) {
        // fall through to legacy path
      }
    }
    // Fallback: hidden textarea + execCommand for older / non-secure contexts.
    try {
      const ta = document.createElement('textarea');
      ta.value = key;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, key.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('API key copied to clipboard');
        return true;
      }
      toast.error('Copy failed — select the key manually and press Ctrl+C');
      return false;
    } catch (_) {
      toast.error('Copy failed — select the key manually and press Ctrl+C');
      return false;
    }
  };

  const saveWebhook = async () => {
    setSavingWebhook(true);
    try {
      await pb.collection('users').update(currentUser.id, { webhook_url: webhookUrl.trim() }, { $autoCancel: false });
      toast.success('Webhook URL saved');
    } catch (e) {
      toast.error('Failed to save webhook URL');
    } finally {
      setSavingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>API Keys — Bharat Bulk SMS</title>
        <meta name="description" content="Create and manage API keys for the Bharat Bulk SMS REST API." />
      </Helmet>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
              <KeyRound className="h-7 w-7 text-primary" />
              API Keys
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate keys to authenticate REST API requests. Keys are shown only once.
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Key
          </Button>
        </div>

        {/* Security notice — existing full keys cannot be recovered */}
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Existing keys cannot be viewed again</p>
            <p>
              For security, the full value of every API key is stored only as a one-way cryptographic hash.
              This means the full key shown when a key is first created or regenerated can never be retrieved
              again — not by you, not by support, not by anyone. The masked prefix below helps you identify
              which key is which.
            </p>
            <p className="mt-2">
              To get a viewable, copyable key, use <span className="font-semibold">Regenerate</span> on the
              row. A brand-new key is issued and shown once; the old key stops working immediately, so update
              any integration that used it.
            </p>
          </div>
        </div>

        {/* Webhook URL setting */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy">
              <Webhook className="h-5 w-5 text-primary" />
              Delivery Webhook
            </CardTitle>
            <CardDescription>
              When a message reaches a terminal status (delivered/failed), we POST a JSON payload to this URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="webhook" className="sr-only">Webhook URL</Label>
                <Input
                  id="webhook"
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
              <Button onClick={saveWebhook} disabled={savingWebhook} className="bg-navy text-navy-foreground hover:bg-navy/90">
                {savingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Keys list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : keys.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <KeyRound className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No API keys yet. Create your first key to start using the API.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <Card key={k.id} className="border-border">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-navy">{k.name || 'Default'}</span>
                      <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {k.key_prefix}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${k.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {k.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {k.created ? new Date(k.created).toLocaleString() : '—'}
                      {k.last_used ? ` · Last used ${new Date(k.last_used).toLocaleString()}` : ' · Never used'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCopied(false);
                        setViewing({
                          id: k.id,
                          name: k.name || 'Default',
                          api_key: sessionKeys[k.id] || null,
                        });
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                      <span className="ml-1.5">View full key</span>
                    </Button>
                    {!sessionKeys[k.id] && (
                      <span className="text-xs text-amber-600 hidden lg:inline-flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Not recoverable
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!sessionKeys[k.id]) {
                          toast.error('This key was shown only once. Regenerate it to view and copy a new key.');
                          return;
                        }
                        copyKey(sessionKeys[k.id]);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="ml-1.5">Copy</span>
                    </Button>
                    <div className="flex items-center gap-2">
                      <Switch checked={!!k.is_active} onCheckedChange={(v) => handleToggle(k.id, v)} />
                      <span className="text-xs text-muted-foreground">{k.is_active ? 'On' : 'Off'}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRegenerate(k.id)} disabled={regeneratingId === k.id}>
                      {regeneratingId === k.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      <span className="ml-1.5">Regenerate</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(k.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Give your key a label so you can identify it later.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="keyname">Label</Label>
            <Input id="keyname" placeholder="e.g. Production server" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Row view: session plaintext, or a clear regenerate explanation */}
      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Full API key</DialogTitle>
            <DialogDescription>
              {viewing?.name ? `${viewing.name}. ` : ''}
              {viewing?.api_key
                ? 'This key is available because it was created or regenerated in this session. It is not stored in full and will disappear after you reload the page.'
                : 'The full key is shown only once, when it is created or regenerated. We store only a secure hash, so this existing key cannot be displayed again.'}
            </DialogDescription>
          </DialogHeader>
          {viewing?.api_key ? (
            <div className="py-2 space-y-3">
              <textarea
                readOnly
                value={viewing.api_key}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
                className="w-full font-mono text-sm break-all text-navy bg-muted rounded-md p-3 border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Use Regenerate to issue a new key. The old key stops working immediately, and the new full key can be viewed and copied once.
            </p>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {viewing?.api_key ? (
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => copyKey(viewing.api_key)}>
                {copied ? <Check className="h-4 w-4 text-success mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy key'}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!viewing || regeneratingId === viewing.id}
                onClick={() => {
                  const id = viewing?.id;
                  setViewing(null);
                  if (id) handleRegenerate(id);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            )}
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto" onClick={() => setViewing(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal dialog (one-time) */}
      <Dialog open={!!revealedKey} onOpenChange={(o) => { if (!o) setRevealedKey(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Your API Key</DialogTitle>
            <DialogDescription>
              Copy this key now and store it somewhere safe. For security, the full key cannot be shown again after you close this dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Label htmlFor="revealed-key" className="text-xs font-medium text-muted-foreground">
              {revealedKey?.name ? `${revealedKey.name} — ` : ''}Full API key (shown once)
            </Label>
            <textarea
              id="revealed-key"
              readOnly
              value={revealedKey?.api_key || ''}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 w-full font-mono text-sm break-all text-navy bg-muted rounded-md p-3 border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              spellCheck={false}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {copied
                ? 'Copied — paste it somewhere secure now.'
                : 'Click the key to select it, or use the Copy button below.'}
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => copyKey(revealedKey?.api_key)}
            >
              {copied ? <Check className="h-4 w-4 text-success mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied' : 'Copy key'}
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto" onClick={() => setRevealedKey(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
