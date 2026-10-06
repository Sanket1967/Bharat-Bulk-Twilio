import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePasswordReset } from '@/hooks/usePasswordReset.js';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const PasswordResetPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const { confirmPasswordReset, validateResetToken, loading } = usePasswordReset();
  
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

  useEffect(() => {
    if (!validateResetToken(token)) {
      setIsTokenValid(false);
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token, validateResetToken]);

  const calculateStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = calculateStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-success'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await confirmPasswordReset(token, password, passwordConfirm);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link might be expired.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password - Bharat Bulk SMS</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="https://horizons-cdn.hostinger.com/9fd74963-3c3e-4354-886b-aa61d19d9249/7408ebeb6bc25626b5e2e4f7128dd727.png" 
                alt="Bharat Bulk SMS Logo" 
                className="h-[60px] w-auto object-contain"
              />
            </Link>
          </div>
          
          <Card className="shadow-xl border-accent/20 bg-card">
            <CardHeader className="space-y-1 text-center bg-accent text-accent-foreground rounded-t-xl pb-6">
              <CardTitle className="text-2xl font-bold mt-2">Set New Password</CardTitle>
              <CardDescription className="text-accent-foreground/80">
                Please enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              
              {!isTokenValid ? (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-destructive font-medium">{error}</p>
                  <Button asChild className="mt-4 w-full bg-navy hover:bg-navy/90">
                    <Link to="/login">Return to Login</Link>
                  </Button>
                </div>
              ) : success ? (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Password Reset Successful</h3>
                  <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-accent font-semibold">New Password <span className="text-destructive">*</span></Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="text-foreground border-accent/20 focus-visible:ring-primary"
                    />
                    
                    {password.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Password strength:</span>
                          <span className="font-medium text-foreground">{strengthLabels[strength]}</span>
                        </div>
                        <div className="flex gap-1 h-1.5">
                          {[0, 1, 2, 3].map((index) => (
                            <div 
                              key={index} 
                              className={`flex-1 rounded-full transition-colors duration-300 ${
                                index < strength ? strengthColors[strength] : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirm" className="text-accent font-semibold">Confirm New Password <span className="text-destructive">*</span></Label>
                    <Input
                      id="passwordConfirm"
                      type="password"
                      placeholder="••••••••"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                      minLength={8}
                      className="text-foreground border-accent/20 focus-visible:ring-primary"
                    />
                  </div>

                  <Button type="submit" className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PasswordResetPage;