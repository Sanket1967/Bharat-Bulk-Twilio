import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, login } = useAuth();
  const navigate = useNavigate();

  const handleMobileChange = (e) => {
    const val = e.target.value;
    // Allow only digits
    if (val === '' || /^[0-9\b]+$/.test(val)) {
      if (val.length <= 10) {
        setMobileNumber(val);
        if (val.length > 0 && val.length < 10) {
          setMobileError('Mobile number must be exactly 10 digits');
        } else {
          setMobileError('');
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mobileNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      setMobileError('Mobile number must be exactly 10 digits');
      return;
    }

    if (password !== passwordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, password, passwordConfirm, name, mobileNumber);
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign Up - Bharat Bulk SMS</title>
        <meta name="description" content="Create your Bharat Bulk SMS account to start managing professional SMS campaigns" />
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
              <CardTitle className="text-2xl font-bold mt-2">Create Your Account</CardTitle>
              <CardDescription className="text-accent-foreground/80">
                Enter your details to get started with our platform
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-accent font-semibold">Full name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Maya Chen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="text-foreground border-accent/20 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-accent font-semibold">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-foreground border-accent/20 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobileNumber" className="text-accent font-semibold">Mobile Number <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">+91</span>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="9876543210"
                      value={mobileNumber}
                      onChange={handleMobileChange}
                      required
                      className={`text-foreground border-accent/20 focus-visible:ring-primary pl-10 ${mobileError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                  </div>
                  {mobileError && <p className="text-xs text-destructive">{mobileError}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-accent font-semibold">Password <span className="text-destructive">*</span></Label>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm" className="text-accent font-semibold">Confirm password <span className="text-destructive">*</span></Label>
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

                <Button type="submit" className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading || !!mobileError}>
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-accent hover:text-primary hover:underline font-medium transition-colors">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SignupPage;