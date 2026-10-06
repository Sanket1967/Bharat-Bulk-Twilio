import { useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

export const usePasswordReset = () => {
  const [loading, setLoading] = useState(false);

  const requestPasswordReset = async (email) => {
    setLoading(true);
    try {
      await pb.collection('users').requestPasswordReset(email, { $autoCancel: false });
      toast.success('Password reset link sent to your email');
      return true;
    } catch (error) {
      console.error('Request password reset error:', error);
      toast.error(error.message || 'Failed to send password reset link');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmPasswordReset = async (token, password, passwordConfirm) => {
    setLoading(true);
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm, { $autoCancel: false });
      toast.success('Password reset successful. Please login with your new password');
      return true;
    } catch (error) {
      console.error('Confirm password reset error:', error);
      toast.error(error.message || 'Failed to reset password. The link might be expired or invalid.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const validateResetToken = (token) => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return false;
    }
    // PocketBase tokens are usually long JWTs or hex strings. 
    // We just do a basic presence and length check here. 
    // Actual validation happens securely on the server during confirmPasswordReset.
    return token.length > 20; 
  };

  return {
    loading,
    requestPasswordReset,
    confirmPasswordReset,
    validateResetToken
  };
};