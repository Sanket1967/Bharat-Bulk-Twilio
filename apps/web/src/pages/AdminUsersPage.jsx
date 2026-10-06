import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Home, ChevronRight, UserPlus, LogIn, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import UserProfileForm from '@/components/UserProfileForm.jsx';
import TransactionHistoryTable from '@/components/TransactionHistoryTable.jsx';
import TransferFundModal from '@/components/TransferFundModal.jsx';
import AddNewUserModal from '@/components/AddNewUserModal.jsx';
import ManageWhiteListModal from '@/components/ManageWhiteListModal.jsx';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { loginAsUser, isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginAsLoading, setLoginAsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sms');
  
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [whitelistModalOpen, setWhitelistModalOpen] = useState(false);
  const [refreshTransactions, setRefreshTransactions] = useState(0);
  const [twilioCreditAmount, setTwilioCreditAmount] = useState('');
  const [twilioLoading, setTwilioLoading] = useState(false);
  const [assocSubAccounts, setAssocSubAccounts] = useState([]);
  const [assocSelected, setAssocSelected] = useState('');
  const [assocLoading, setAssocLoading] = useState(false);
  const [showAssoc, setShowAssoc] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await pb.collection('users').getFullList({
        sort: '-created',
        $autoCancel: false
      });
      setUsers(result);
      setSelectedUser(prev => {
        if (prev) {
          const refreshed = result.find(u => u.id === prev.id);
          if (refreshed) return refreshed;
        }
        return result[0] || null;
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchUsers();
      return;
    }

    setLoading(true);
    try {
      const result = await pb.collection('users').getFullList({
        filter: `name ~ "${searchQuery}" || email ~ "${searchQuery}" || mobile_number ~ "${searchQuery}"`,
        $autoCancel: false
      });
      setUsers(result);
      if (result.length > 0) {
        setSelectedUser(result[0]);
      } else {
        toast.error('No users found matching your search');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAsUser = async () => {
    if (!selectedUser) return;
    if (selectedUser.role === 'admin') {
      toast.error('Cannot login as another admin account');
      return;
    }
    setLoginAsLoading(true);
    try {
      await loginAsUser(selectedUser.id);
    } catch {
      /* toast handled in AuthContext */
    } finally {
      setLoginAsLoading(false);
    }
  };

  const handleUserUpdate = () => {
    fetchUsers();
  };

  const handleTransferComplete = () => {
    setRefreshTransactions(prev => prev + 1);
    fetchUsers();
  };

  const handleAddTwilioCredits = async () => {
    if (!selectedUser) return;
    const amount = parseInt(twilioCreditAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a positive credit amount');
      return;
    }
    setTwilioLoading(true);
    try {
      const res = await apiServerClient.fetch('/twilio/add-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ userId: selectedUser.id, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add credits');
      }
      toast.success(`Added ${amount} Twilio SMS credits`);
      setTwilioCreditAmount('');
      fetchUsers();
    } catch (e) {
      toast.error(e.message || 'Failed to add Twilio credits');
    } finally {
      setTwilioLoading(false);
    }
  };

  const handleProvisionTwilio = async () => {
    if (!selectedUser) return;
    setTwilioLoading(true);
    try {
      const res = await apiServerClient.fetch('/twilio/create-subaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          friendlyName: selectedUser.name || selectedUser.email,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision sub-account');
      }
      toast.success(data.alreadyProvisioned ? 'Sub-account already exists' : 'Twilio sub-account provisioned');
      fetchUsers();
    } catch (e) {
      toast.error(e.message || 'Failed to provision Twilio sub-account');
    } finally {
      setTwilioLoading(false);
    }
  };

  // Associate an already-existing Twilio sub-account (under the master
  // account) with the selected user. Used for international SMS users or to
  // retry a failed association from the create-user flow.
  const handleLoadAssocSubAccounts = async () => {
    setAssocLoading(true);
    try {
      const res = await apiServerClient.fetch('/twilio/subaccounts', {
        headers: { Authorization: pb.authStore.token },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAssocSubAccounts(data.subaccounts || []);
        setShowAssoc(true);
        if ((data.subaccounts || []).length === 0) {
          toast.warning('No eligible Twilio sub-accounts found under your master account.');
        }
      } else {
        toast.error(data.error || 'Failed to load Twilio sub-accounts');
      }
    } catch (_) {
      toast.error('Failed to load Twilio sub-accounts');
    } finally {
      setAssocLoading(false);
    }
  };

  const handleAssociateTwilio = async () => {
    if (!selectedUser || !assocSelected) return;
    setAssocLoading(true);
    try {
      const res = await apiServerClient.fetch('/twilio/associate-subaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          subAccountSid: assocSelected,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to associate sub-account');
      }
      toast.success(data.alreadyAssociated ? 'Sub-account already associated' : 'Twilio sub-account associated');
      setShowAssoc(false);
      setAssocSelected('');
      fetchUsers();
    } catch (e) {
      toast.error(e.message || 'Failed to associate Twilio sub-account');
    } finally {
      setAssocLoading(false);
    }
  };

  const calculateBalance = () => {
    if (!selectedUser) return { promo: 0, trans: 0, misscall: 0, voice: 0 };
    return {
      promo: selectedUser.credits || 0,
      trans: 500000,
      misscall: 0,
      voice: 0
    };
  };

  const balance = calculateBalance();

  if (!isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>Manage Users - Admin - Bharat Bulk SMS</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <div className="bg-navy text-navy-foreground py-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex items-center gap-2 text-sm mb-3">
              <Home className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
              <span>Dashboard</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-semibold">Manage User</span>
            </div>
            <h1 className="text-2xl font-bold">Manage User</h1>
          </div>
        </div>

        <main className="flex-1 py-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Search by email or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Search className="h-4 w-4 mr-2" /> Search
                </Button>
              </div>
              <Button 
                onClick={() => setAddUserModalOpen(true)}
                className="bg-success text-white hover:bg-success/90"
              >
                <UserPlus className="h-4 w-4 mr-2" /> Add New User
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="border border-border shadow-sm lg:col-span-1 overflow-hidden h-fit">
                <div className="bg-navy text-navy-foreground px-4 py-3 font-semibold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users ({users.length})
                </div>
                <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
                  {loading ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Loading users...</div>
                  ) : users.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No users found</div>
                  ) : (
                    users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 border-l-4 ${selectedUser?.id === user.id ? 'bg-primary/5 border-primary' : 'border-transparent'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-navy truncate">{user.name || 'Unnamed User'}</span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-navy/10 text-navy px-1.5 py-0.5 rounded shrink-0">Admin</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between gap-2">
                          <span className="truncate">{user.mobile_number || '—'}</span>
                          <span className="font-medium text-foreground shrink-0">Credits: {user.credits || 0}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              <div className="lg:col-span-3">
              {loading && !selectedUser ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : !selectedUser ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Select a user from the list to manage their account</p>
              </div>
            ) : (
              <Card className="border border-border shadow-sm">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="border-b border-border bg-muted/20">
                    <TabsList className="w-full justify-start h-12 rounded-none bg-transparent px-4">
                      <TabsTrigger 
                        value="sms" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-6 shadow-none bg-transparent"
                      >
                        SMS
                      </TabsTrigger>
                      <TabsTrigger 
                        value="funds" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-6 shadow-none bg-transparent"
                      >
                        Funds
                      </TabsTrigger>
                      <TabsTrigger 
                        value="misscall" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-6 shadow-none bg-transparent"
                      >
                        MissCall
                      </TabsTrigger>
                      <TabsTrigger 
                        value="other" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-6 shadow-none bg-transparent"
                      >
                        Other
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-6">
                    <div className="flex gap-3 mb-6">
                      <Button 
                        variant="outline" 
                        onClick={handleLoginAsUser}
                        disabled={loginAsLoading || !selectedUser || selectedUser.role === 'admin'}
                        className="border-primary text-primary hover:bg-primary/10"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        {loginAsLoading ? 'Switching…' : 'Login As User'}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setWhitelistModalOpen(true)}
                        className="border-primary text-primary hover:bg-primary/10"
                      >
                        <Shield className="h-4 w-4 mr-2" /> Manage WhiteList Number
                      </Button>
                    </div>

                    <TabsContent value="sms" className="m-0">
                      <UserProfileForm user={selectedUser} onUpdate={handleUserUpdate} />
                    </TabsContent>

                    <TabsContent value="funds" className="m-0 space-y-6">
                      <div className="flex items-center justify-between">
                        <Button 
                          onClick={() => setTransferModalOpen(true)}
                          className="bg-purple-600 text-white hover:bg-purple-700"
                        >
                          Transfer Fund
                        </Button>
                        <div className="flex items-center gap-6 bg-muted/30 px-6 py-3 rounded-lg border border-border">
                          <div className="text-sm">
                            <span className="font-semibold text-muted-foreground">P:</span> 
                            <span className="ml-2 font-bold text-foreground">{balance.promo}</span>
                          </div>
                          <div className="h-6 w-[1px] bg-border"></div>
                          <div className="text-sm">
                            <span className="font-semibold text-muted-foreground">T:</span> 
                            <span className="ml-2 font-bold text-foreground">{balance.trans}</span>
                          </div>
                          <div className="h-6 w-[1px] bg-border"></div>
                          <div className="text-sm">
                            <span className="font-semibold text-muted-foreground">MCall:</span> 
                            <span className="ml-2 font-bold text-foreground">{balance.misscall}</span>
                          </div>
                          <div className="h-6 w-[1px] bg-border"></div>
                          <div className="text-sm">
                            <span className="font-semibold text-muted-foreground">Voice:</span> 
                            <span className="ml-2 font-bold text-foreground">{balance.voice}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-navy">Transaction History</h3>
                        <TransactionHistoryTable 
                          userId={selectedUser.id} 
                          refreshTrigger={refreshTransactions}
                        />
                      </div>

                      {/* Twilio reseller credits */}
                      <div className="rounded-lg border border-border p-5 bg-muted/20">
                        <h3 className="text-base font-semibold text-navy mb-1">Twilio SMS Credits</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Reseller balance (1 credit = 1 SMS = Rs 4). Twilio's actual cost is billed to your master account and never shown to the user.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <div className="text-sm">
                            <span className="font-semibold text-muted-foreground">Current balance: </span>
                            <span className="font-bold text-navy">{selectedUser.sms_credits || 0}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-muted-foreground">Sub-account: </span>
                            <span className={`font-medium ${selectedUser.sub_account_sid ? 'text-sms-green' : 'text-sms-orange'}`}>
                              {selectedUser.sub_account_sid ? 'Provisioned' : 'Not provisioned'}
                            </span>
                          </div>
                        </div>
                        {selectedUser.role === 'admin' ? (
                          <p className="text-xs text-muted-foreground">
                            Admin accounts have unlimited International SMS credits — no top-up or deduction applies.
                          </p>
                        ) : (
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex-1 min-w-[160px]">
                            <label className="text-xs font-semibold text-navy uppercase tracking-wider">Add Credits</label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g. 2000"
                              value={twilioCreditAmount}
                              onChange={(e) => setTwilioCreditAmount(e.target.value)}
                              className="border-border focus-visible:ring-sms-orange mt-1"
                            />
                          </div>
                          <Button
                            onClick={handleAddTwilioCredits}
                            disabled={twilioLoading || !twilioCreditAmount}
                            className="bg-sms-orange text-white hover:bg-sms-orange/90"
                          >
                            {twilioLoading ? 'Adding...' : 'Add Credits'}
                          </Button>
                          {!selectedUser.sub_account_sid && (
                            <Button
                              variant="outline"
                              onClick={handleProvisionTwilio}
                              disabled={twilioLoading}
                              className="border-sms-navy text-sms-navy hover:bg-sms-navy hover:text-white"
                            >
                              Provision Sub-Account
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={handleLoadAssocSubAccounts}
                            disabled={assocLoading}
                            className="border-sms-navy text-sms-navy hover:bg-sms-navy hover:text-white"
                          >
                            {assocLoading && !showAssoc ? 'Loading...' : 'Associate Existing Sub-Account'}
                          </Button>
                        </div>
                        )}

                        {showAssoc && (
                          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border mt-2">
                            <div className="flex-1 min-w-[220px]">
                              <label className="text-xs font-semibold text-navy uppercase tracking-wider">Existing Twilio Sub-Account</label>
                              <Select
                                value={assocSelected}
                                onValueChange={setAssocSelected}
                                disabled={assocSubAccounts.length === 0}
                              >
                                <SelectTrigger className="border-border focus-visible:ring-sms-orange mt-1">
                                  <SelectValue
                                    placeholder={
                                      assocSubAccounts.length === 0
                                        ? 'No eligible sub-accounts found'
                                        : 'Select a sub-account'
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {assocSubAccounts.map((sa) => (
                                    <SelectItem key={sa.sid} value={sa.sid}>
                                      {sa.friendlyName ? `${sa.friendlyName} (${sa.sid})` : sa.sid}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">
                                Auth token is fetched and stored server-side; never exposed.
                              </p>
                            </div>
                            <Button
                              onClick={handleAssociateTwilio}
                              disabled={assocLoading || !assocSelected}
                              className="bg-sms-orange text-white hover:bg-sms-orange/90"
                            >
                              {assocLoading ? 'Associating...' : 'Associate'}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => { setShowAssoc(false); setAssocSelected(''); }}
                              disabled={assocLoading}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="misscall" className="m-0">
                      <div className="text-center py-12 text-muted-foreground">
                        MissCall settings and configuration coming soon
                      </div>
                    </TabsContent>

                    <TabsContent value="other" className="m-0">
                      <div className="text-center py-12 text-muted-foreground">
                        Other settings and configurations coming soon
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </Card>
            )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      <TransferFundModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        userId={selectedUser?.id}
        onTransferComplete={handleTransferComplete}
      />

      <AddNewUserModal
        open={addUserModalOpen}
        onOpenChange={setAddUserModalOpen}
        onUserCreated={fetchUsers}
      />

      <ManageWhiteListModal
        open={whitelistModalOpen}
        onOpenChange={setWhitelistModalOpen}
        userId={selectedUser?.id}
      />
    </>
  );
};

export default AdminUsersPage;