import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

const ADMIN_BACKUP_KEY = 'bbs_admin_auth_backup';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

function readAdminBackup() {
  try {
    const raw = sessionStorage.getItem(ADMIN_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(() => !!readAdminBackup());
  const [adminBackupMeta, setAdminBackupMeta] = useState(() => {
    const b = readAdminBackup();
    return b ? { email: b.email, name: b.name } : null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (pb.authStore.isValid) {
      setCurrentUser(pb.authStore.model);
    }
    setImpersonating(!!readAdminBackup());
    setInitialLoading(false);

    const unsub = pb.authStore.onChange((token, model) => {
      setCurrentUser(model || null);
    });
    return () => unsub?.();
  }, []);

  const login = async (email, password) => {
    try {
      sessionStorage.removeItem(ADMIN_BACKUP_KEY);
      setImpersonating(false);
      setAdminBackupMeta(null);

      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      
      if (authData.record.is_active === false) {
        pb.authStore.clear();
        setCurrentUser(null);
        throw new Error('Account deactivated');
      }

      setCurrentUser(authData.record);
      
      await pb.collection('system_logs').create({
        user_id: authData.record.id,
        action_type: 'login',
        details: 'User authenticated successfully'
      }, { $autoCancel: false }).catch(() => {});

      toast.success('Login successful');
      return authData.record;
    } catch (error) {
      toast.error(error.message === 'Account deactivated' ? 'Your account has been deactivated' : 'Invalid email or password');
      throw error;
    }
  };

  const signup = async (email, password, passwordConfirm, name, mobileNumber) => {
    try {
      const newUser = await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
        name,
        mobile_number: mobileNumber,
        role: 'user',
        credits: 0,
        is_active: true
      }, { $autoCancel: false });
      
      toast.success('Account created successfully');
      return newUser;
    } catch (error) {
      if (error.data?.data?.email) {
        toast.error('Email already exists');
      } else if (error.data?.data?.mobile_number) {
        toast.error('Invalid mobile number or already in use');
      } else {
        toast.error('Failed to create account');
      }
      throw error;
    }
  };

  const loginAsUser = async (userId) => {
    if (!pb.authStore.isValid || pb.authStore.model?.role !== 'admin') {
      toast.error('Only admins can login as a user');
      throw new Error('Admin only');
    }
    if (!userId) {
      toast.error('No user selected');
      throw new Error('No user');
    }
    if (userId === pb.authStore.model.id) {
      toast.error('You are already this user');
      throw new Error('Same user');
    }

    const adminToken = pb.authStore.token;
    const adminRecord = pb.authStore.model;

    try {
      const res = await apiServerClient.fetch(`/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login as user');
      }

      const token = data?.token;
      const record = data?.record;
      if (!token || !record || !record.id) {
        throw new Error(
          data.error || 'Could not load the selected user account',
        );
      }

      sessionStorage.setItem(
        ADMIN_BACKUP_KEY,
        JSON.stringify({
          token: adminToken,
          record: adminRecord,
          email: adminRecord?.email || '',
          name: adminRecord?.name || '',
        }),
      );
      setAdminBackupMeta({
        email: adminRecord?.email || '',
        name: adminRecord?.name || '',
      });
      setImpersonating(true);

      pb.authStore.save(token, record);
      setCurrentUser(record);

      const label = record.name || record.email || 'user';
      toast.success(`Now viewing as ${label}`);
      navigate('/dashboard');
      return record;
    } catch (error) {
      toast.error(error.message || 'Failed to login as user');
      throw error;
    }
  };

  const exitImpersonation = () => {
    const backup = readAdminBackup();
    if (!backup?.token || !backup?.record) {
      sessionStorage.removeItem(ADMIN_BACKUP_KEY);
      setImpersonating(false);
      setAdminBackupMeta(null);
      toast.error('Admin session expired. Please log in again.');
      pb.authStore.clear();
      setCurrentUser(null);
      navigate('/login');
      return;
    }

    pb.authStore.save(backup.token, backup.record);
    setCurrentUser(backup.record);
    sessionStorage.removeItem(ADMIN_BACKUP_KEY);
    setImpersonating(false);
    setAdminBackupMeta(null);
    toast.success('Returned to admin account');
    navigate('/admin/users');
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_BACKUP_KEY);
    setImpersonating(false);
    setAdminBackupMeta(null);
    pb.authStore.clear();
    setCurrentUser(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const value = {
    currentUser,
    isAdmin: currentUser?.role === 'admin' && !impersonating,
    // Service-access flags. Admins (when not impersonating) get full access.
    canUseInternational:
      (currentUser?.can_use_international === true || currentUser?.role === 'admin') &&
      !(impersonating && currentUser?.can_use_international === false),
    canUseDomestic:
      (currentUser?.can_use_domestic === true || currentUser?.role === 'admin') &&
      !(impersonating && currentUser?.can_use_domestic === false),
    isApiEnabled:
      (currentUser?.is_api_enabled === true || currentUser?.role === 'admin') &&
      !(impersonating && currentUser?.is_api_enabled === false),
    login,
    signup,
    logout,
    loginAsUser,
    exitImpersonation,
    impersonating,
    adminBackupMeta,
    isAuthenticated: pb.authStore.isValid
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};