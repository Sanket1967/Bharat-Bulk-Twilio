import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Settings, Upload, ChevronDown, ChevronRight, AlertTriangle, Info, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SchedulePicker from '@/components/SchedulePicker.jsx';
import { useCampaigns } from '@/hooks/useCampaigns.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

const CampaignComposePage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    channel: 'Transactional',
    route: 'Airtel',
    senderId: 'SHMGRH',
    campaignName: '',
    numbers: '',
    language: 'ENGLISH',
    message: '',
    dltTemplateId: '',
    saveAsDraft: false
  });

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduleTime, setScheduleTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(null);
  const [approvedSenderIds, setApprovedSenderIds] = useState([]);

  const { currentUser } = useAuth();

  const [openSections, setOpenSections] = useState({
    groups: false,
    file: false,
    drafts: false,
    signature: false
  });

  const { createCampaign } = useCampaigns();

  // Derived state for counters
  const numberCount = formData.numbers.split(',').filter(n => n.trim().length > 0).length;
  const charCount = formData.message.length;

  // Required credits = valid (10-digit) recipients × SMS parts (160 chars each).
  // Invalid numbers are never charged.
  const validRecipientCount = formData.numbers
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter((n) => n.replace(/\D/g, '').length === 10).length;
  const smsParts = formData.message.length > 0 ? Math.ceil(formData.message.length / 160) : 1;
  const requiredCredits = validRecipientCount * smsParts;
  const insufficientCredits = availableCredits !== null && requiredCredits > availableCredits;

  useEffect(() => {
    const loadCredits = async () => {
      const userId = pb.authStore.model?.id || pb.authStore.record?.id;
      if (!userId) return;
      try {
        const userRec = await pb.collection('users').getOne(userId, { $autoCancel: false });
        setAvailableCredits(userRec.credits || 0);
      } catch (e) {
        console.error('Failed to load credits', e);
      }
    };
    loadCredits();

    const loadApprovedSenderIds = async () => {
      const userId = pb.authStore.model?.id || pb.authStore.record?.id;
      if (!userId) return;
      try {
        const list = await pb.collection('senderids').getFullList({
          filter: `userId = "${userId}" && status = "Approved"`,
          sort: '-is_default,senderid',
          $autoCancel: false,
        });
        setApprovedSenderIds(list);
        setFormData((prev) => {
          if (prev.route === 'SIM') return prev;
          const stillValid = list.some((s) => s.senderid === prev.senderId);
          if (stillValid) return prev;
          const def = list.find((s) => s.is_default) || list[0];
          return { ...prev, senderId: def ? def.senderid : 'none' };
        });
      } catch (e) {
        console.error('Failed to load sender IDs', e);
        setApprovedSenderIds([]);
      }
    };
    loadApprovedSenderIds();
  }, [currentUser]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (1MB)
    if (file.size > 1024 * 1024) {
      toast.error('File size must be less than 1MB');
      e.target.value = '';
      return;
    }

    // Validate type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast.error('Only CSV, XLS, and XLSX files are allowed');
      e.target.value = '';
      return;
    }

    toast.success(`File ${file.name} uploaded successfully`);
    // In a real app, we would parse the file and append to formData.numbers
  };

  const handleSubmit = async (isScheduled = false) => {
    if (!formData.campaignName) {
      toast.error('Campaign Name is required');
      return;
    }
    if (!formData.numbers && !formData.saveAsDraft) {
      toast.error('Please enter at least one recipient number');
      return;
    }
    if (!formData.message) {
      toast.error('Message text is required');
      return;
    }
    if (!formData.saveAsDraft && formData.route !== 'SIM') {
      if (!formData.senderId || formData.senderId === 'none') {
        toast.error('Select an approved Sender ID, or choose SIM Base Route (Sender ID None).');
        return;
      }
      if (
        approvedSenderIds.length > 0 &&
        !approvedSenderIds.some((s) => s.senderid === formData.senderId)
      ) {
        toast.error('That Sender ID is not approved yet. Wait for admin approval or pick an approved ID.');
        return;
      }
    }
    if (!formData.saveAsDraft && formData.route !== 'SIM' && !formData.dltTemplateId.trim()) {
      toast.error('Enter the DLT Template ID registered for this message. Operators reject unmapped SMS.');
      return;
    }

    setLoading(true);

    try {
      let scheduledDateTime = null;
      if (isScheduled && scheduleDate && scheduleTime) {
        const [hours, minutes] = scheduleTime.split(':');
        scheduledDateTime = new Date(scheduleDate);
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
      }

      const campaignData = {
        name: formData.campaignName,
        description: `Channel: ${formData.channel}, Route: ${formData.route}, Sender: ${formData.senderId === 'none' ? 'None' : formData.senderId}`,
        message: formData.message,
        scheduled_time: scheduledDateTime ? scheduledDateTime.toISOString() : null,
        status: formData.saveAsDraft ? 'draft' : (scheduledDateTime ? 'scheduled' : 'sent'),
        recipientNumbers: formData.numbers,
        dltTemplateId: formData.dltTemplateId.trim(),
        senderId: formData.senderId,
        channel: formData.channel,
        route: formData.route,
      };

      const created = await createCampaign(campaignData);
      // When the campaign was held due to insufficient credits, createCampaign
      // already showed the error toast — don't show a success toast here, and
      // send the user to the campaigns list (the held campaign is a draft).
      if (created?.heldForLowCredit) {
        navigate('/campaigns');
        return;
      }
      toast.success(formData.saveAsDraft ? 'Draft saved successfully' : (isScheduled ? 'Campaign scheduled successfully' : 'Campaign sent successfully'));
      if (created?.id && !formData.saveAsDraft) {
        navigate(`/campaigns/${created.id}`);
      } else {
        navigate('/campaigns');
      }
    } catch (error) {
      console.error('Create campaign error:', error);
      const detail = error?.userMessage || error?.message;
      toast.error(
        detail && !/password|token|secret/i.test(detail)
          ? detail
          : 'Failed to process campaign. Check Sender ID, DLT Template ID, numbers, and credits, then try again.',
      );
    } finally {
      setLoading(false);
      setScheduleDialogOpen(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Compose SMS - Bharat Bulk SMS</title>
        <meta name="description" content="Compose and send professional SMS campaigns" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <Button variant="ghost" onClick={() => navigate('/campaigns')} className="mb-6 text-sms-navy hover:text-sms-orange hover:bg-sms-orange/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to campaigns
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                  <h1 className="text-2xl font-bold mb-6 text-sms-navy border-b pb-4">Compose SMS</h1>
                  
                  <div className="space-y-5">
                    {/* Row 1: Channel, Route, SenderID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-sms-navy">Message Channel</Label>
                        <Select value={formData.channel} onValueChange={(v) => handleInputChange('channel', v)}>
                          <SelectTrigger className="border-border focus:ring-sms-orange">
                            <SelectValue placeholder="Select Channel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Transactional">Transactional</SelectItem>
                            <SelectItem value="Promotional">Promotional</SelectItem>
                            <SelectItem value="OTP">OTP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-sms-navy">Message Route</Label>
                        <Select value={formData.route} onValueChange={(v) => {
                          handleInputChange('route', v);
                          if (v === 'SIM') {
                            handleInputChange('senderId', 'none');
                          } else if (formData.senderId === 'none') {
                            const def = approvedSenderIds.find((s) => s.is_default) || approvedSenderIds[0];
                            handleInputChange('senderId', def ? def.senderid : 'none');
                          }
                        }}>
                          <SelectTrigger className="border-border focus:ring-sms-orange">
                            <SelectValue placeholder="Select Route" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Airtel">Airtel</SelectItem>
                            <SelectItem value="Jio">Jio</SelectItem>
                            <SelectItem value="VI">VI</SelectItem>
                            <SelectItem value="BSNL">BSNL</SelectItem>
                            <SelectItem value="SIM">SIM Base Route</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-sms-navy">SenderID</Label>
                        <Select
                          value={formData.senderId}
                          onValueChange={(v) => handleInputChange('senderId', v)}
                          disabled={formData.route === 'SIM'}
                        >
                          <SelectTrigger className="border-border focus:ring-sms-orange">
                            <SelectValue placeholder="Select approved SenderID" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {approvedSenderIds.map((s) => (
                              <SelectItem key={s.id} value={s.senderid}>
                                {s.senderid}{s.is_default ? ' (Default)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.route !== 'SIM' && approvedSenderIds.length === 0 && (
                          <p className="text-xs text-amber-700">
                            No approved Sender IDs yet. Submit one under Manage SenderID and wait for admin approval.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Campaign Name */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-sms-navy">Campaign Name</Label>
                      <Input 
                        value={formData.campaignName}
                        onChange={(e) => handleInputChange('campaignName', e.target.value)}
                        placeholder="e.g., 15-Apr-2026 01:38"
                        className="border-border focus-visible:ring-sms-orange"
                      />
                    </div>

                    {/* Row 3: Numbers */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-sms-navy">Numbers</Label>
                      <Textarea 
                        value={formData.numbers}
                        onChange={(e) => handleInputChange('numbers', e.target.value)}
                        placeholder="Enter recipient numbers in comma separated, e.g. 919999999999,918888888888,911234567890"
                        className="min-h-[100px] resize-y border-border focus-visible:ring-sms-orange font-mono text-sm"
                      />
                      <div className="text-xs font-medium text-sms-navy mt-1">
                        ({numberCount}) Numbers
                      </div>
                    </div>

                    {/* Row 4: Message Text */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold text-sms-navy">Message Text</Label>
                        <div className="flex items-center gap-4">
                          <Select value={formData.language} onValueChange={(v) => handleInputChange('language', v)}>
                            <SelectTrigger className="h-8 w-[120px] text-xs border-border focus:ring-sms-orange">
                              <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ENGLISH">ENGLISH</SelectItem>
                              <SelectItem value="HINDI">HINDI</SelectItem>
                              <SelectItem value="UNICODE">UNICODE</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                            {charCount} Characters Used | Count {Math.ceil(charCount / 160) || 1}
                          </div>
                        </div>
                      </div>
                      <Textarea 
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        placeholder="Type your message here..."
                        className="min-h-[150px] resize-y border-border focus-visible:ring-sms-orange"
                      />
                    </div>

                    {/* Row 5: DLT Template ID */}
                    <div className="flex items-end gap-3">
                      <div className="space-y-1.5 flex-1">
                        <Label className="text-sm font-semibold text-sms-navy">DLT Template ID</Label>
                        <Input 
                          value={formData.dltTemplateId}
                          onChange={(e) => handleInputChange('dltTemplateId', e.target.value)}
                          placeholder="Enter DLT Template ID"
                          className="border-border focus-visible:ring-sms-orange"
                        />
                      </div>
                      <Button variant="outline" size="icon" className="h-10 w-10 border-border text-sms-navy hover:bg-sms-navy/5 shrink-0">
                        <Settings className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Row 6: Save as Draft */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="saveDraft" 
                        checked={formData.saveAsDraft}
                        onCheckedChange={(checked) => handleInputChange('saveAsDraft', checked)}
                        className="data-[state=checked]:bg-sms-orange data-[state=checked]:border-sms-orange"
                      />
                      <Label htmlFor="saveDraft" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        Save as Draft
                      </Label>
                    </div>

                    {/* Row 6.5: Credit balance summary */}
                    <div className={`rounded-lg border p-4 ${insufficientCredits ? 'bg-red-50 border-red-200' : 'bg-muted/40 border-border'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm">
                          <span className="font-semibold text-sms-navy">Available Credits: </span>
                          <span className="font-bold text-sms-navy">{availableCredits === null ? '…' : availableCredits}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-sms-navy">Required Credits: </span>
                          <span className={`font-bold ${insufficientCredits ? 'text-red-600' : 'text-sms-green'}`}>{requiredCredits}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-sms-navy">After Send: </span>
                          <span className={`font-bold ${insufficientCredits ? 'text-red-600' : 'text-sms-navy'}`}>{availableCredits === null ? '…' : Math.max(0, availableCredits - requiredCredits)}</span>
                        </div>
                      </div>
                      {insufficientCredits && (
                        <div className="flex items-start gap-2 mt-3 text-sm text-red-700">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>
                            Insufficient credits to send this campaign. It will be <strong>put on hold as a draft</strong> if you proceed. Please add credits to send it.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Row 7: Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                      <Button 
                        onClick={() => handleSubmit(false)} 
                        disabled={loading}
                        className="bg-sms-orange text-white hover:bg-sms-orange/90 min-w-[140px]"
                      >
                        {loading && !scheduleDialogOpen ? 'Processing...' : 'Send Now'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setScheduleDialogOpen(true)}
                        disabled={loading}
                        className="border-sms-navy text-sms-navy hover:bg-sms-navy hover:text-white min-w-[160px]"
                      >
                        Schedule For Later
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Sections */}
                <div className="space-y-3">
                  {/* Groups */}
                  <Collapsible open={openSections.groups} onOpenChange={() => toggleSection('groups')} className="border border-border rounded-lg bg-card overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 font-semibold text-sms-navy hover:bg-muted/50 transition-colors">
                      <span>Groups</span>
                      {openSections.groups ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 border-t border-border bg-muted/10">
                      <p className="text-sm text-muted-foreground">Select contact groups to include in this campaign.</p>
                      {/* Placeholder for group selection */}
                      <div className="mt-3 p-4 border border-dashed border-border rounded-md text-center text-sm text-muted-foreground">
                        No groups available. Create groups in the Contacts section.
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* File */}
                  <Collapsible open={openSections.file} onOpenChange={() => toggleSection('file')} className="border border-border rounded-lg bg-card overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 font-semibold text-sms-navy hover:bg-muted/50 transition-colors">
                      <span>File</span>
                      {openSections.file ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 border-t border-border bg-muted/10">
                      <div className="flex flex-col items-start gap-3">
                        <p className="text-sm text-muted-foreground">Upload contacts via file. Max size: 1MB. Formats: CSV, XLS, XLSX.</p>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload} 
                          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                          className="hidden" 
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-sms-navy text-sms-navy hover:bg-sms-navy/5">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Drafts */}
                  <Collapsible open={openSections.drafts} onOpenChange={() => toggleSection('drafts')} className="border border-border rounded-lg bg-card overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 font-semibold text-sms-navy hover:bg-muted/50 transition-colors">
                      <span>Drafts</span>
                      {openSections.drafts ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 border-t border-border bg-muted/10">
                      <p className="text-sm text-muted-foreground">Load a previously saved draft.</p>
                      <div className="mt-3 p-4 border border-dashed border-border rounded-md text-center text-sm text-muted-foreground">
                        No drafts found.
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Signature */}
                  <Collapsible open={openSections.signature} onOpenChange={() => toggleSection('signature')} className="border border-border rounded-lg bg-card overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 font-semibold text-sms-navy hover:bg-muted/50 transition-colors">
                      <span>Signature</span>
                      {openSections.signature ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 border-t border-border bg-muted/10">
                      <p className="text-sm text-muted-foreground">Append a signature to your messages.</p>
                      <Textarea placeholder="Enter signature..." className="mt-3 min-h-[80px] border-border focus-visible:ring-sms-orange" />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>

              {/* Right Column: DLT Banner */}
              <div className="lg:col-span-1">
                <div className="bg-[#FFF8F0] border border-sms-orange/30 rounded-xl p-6 sticky top-24 shadow-sm">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sms-orange/10 text-sms-orange text-xs font-bold uppercase tracking-wider mb-4">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    New Update On DLT
                  </div>
                  
                  <h2 className="text-xl font-bold text-sms-navy mb-4">DLT Compliance - Must Read!</h2>
                  
                  <div className="space-y-4 text-sm text-sms-navy/80 leading-relaxed">
                    <p>
                      As per the latest TRAI guidelines, all SMS content must be strictly mapped to registered DLT templates.
                    </p>
                    
                    <div className="bg-white p-3 rounded-lg border border-sms-orange/20">
                      <h3 className="font-semibold text-sms-navy mb-1 flex items-center gap-1.5">
                        <Info className="h-4 w-4 text-sms-orange" />
                        Brand Name Requirement
                      </h3>
                      <p className="text-xs">
                        Every message must include your registered Brand/Business name at the end of the content. Messages without brand names will be rejected by operators.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sms-navy mb-2">Causes for Blacklisting:</h3>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>Using promotional content in transactional routes.</li>
                        <li>Mismatch between approved template and actual message.</li>
                        <li>Sending messages to DND numbers without explicit opt-in.</li>
                        <li>Missing brand name in the message body.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sms-navy mb-2">Do's for Content Templates:</h3>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>Keep variables {'{#var#}'} limited to dynamic content only.</li>
                        <li>Ensure the static part of the message clearly conveys the intent.</li>
                        <li>Always test your template before sending bulk campaigns.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-sms-orange/20">
                    <p className="text-xs font-medium text-sms-navy">
                      Need help with DLT? Contact your account manager:
                      <br />
                      <a href="mailto:compliance@bharatbulksms.com" className="text-sms-orange hover:underline mt-1 inline-block">compliance@bharatbulksms.com</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-border">
          <DialogHeader>
            <DialogTitle className="text-sms-navy">Schedule Campaign</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <SchedulePicker
              date={scheduleDate}
              time={scheduleTime}
              onDateChange={setScheduleDate}
              onTimeChange={setScheduleTime}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} className="border-border text-foreground hover:bg-muted">
              Cancel
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={!scheduleDate || !scheduleTime || loading} className="bg-sms-orange text-white hover:bg-sms-orange/90">
              {loading ? 'Scheduling...' : 'Confirm Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CampaignComposePage;