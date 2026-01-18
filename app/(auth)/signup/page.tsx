'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

type Role = 'student' | 'professor';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
          emailRedirectTo: undefined, // Don't redirect after email confirmation
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Step 1: Auto-confirm email if needed
      try {
        await fetch('/api/auth/auto-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authData.user.id }),
        });
      } catch (err) {
        // Continue even if auto-confirm fails
        console.warn('Auto-confirm failed, continuing anyway:', err);
      }

      // Step 2: Wait for profile to be created by trigger (or create via API)
      let profileData = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();
        
        if (profile && !profileError) {
          profileData = profile;
          // Verify role matches, update if needed
          if (profile.role !== role) {
            await supabase
              .from('profiles')
              .update({ role })
              .eq('id', authData.user.id);
            profileData.role = role;
          }
          break;
        }
        
        attempts++;
      }

      // Step 3: If profile still doesn't exist, create via API
      if (!profileData) {
        try {
          const response = await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authData.user.id,
              email: authData.user.email!,
              name: name.trim(),
              role,
            }),
          });

          if (response.ok) {
            await new Promise(resolve => setTimeout(resolve, 500));
            // Fetch the created profile
            const { data: createdProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', authData.user.id)
              .maybeSingle();
            profileData = createdProfile || { role };
          }
        } catch (err) {
          console.warn('Profile creation via API failed:', err);
          // Use form role as fallback
          profileData = { role };
        }
      }

      // Step 4: Ensure we have a session
      if (!authData.session) {
        // Wait a moment for email confirmation to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw new Error(`Account created but login failed: ${signInError.message}. Please log in manually.`);
        }
      }

      // Step 5: Redirect based on role
      const userRole = profileData?.role || role;
      window.location.href = userRole === 'professor' ? '/onboarding' : '/student';
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <svg
              className="w-7 h-7 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold">Create your account</CardTitle>
          <CardDescription className="text-base">
            Get started with ProfAI in seconds
        </CardDescription>
      </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full name
              </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
                className="h-11"
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address
              </Label>
            <Input
              id="email"
              type="email"
                placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
                className="h-11"
            />
          </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">I am a</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    role === 'student'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50 bg-card'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-sm font-medium mb-1">Student</div>
                  <div className="text-xs text-muted-foreground">Ask questions, get answers</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('professor')}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    role === 'professor'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50 bg-card'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-sm font-medium mb-1">Professor</div>
                  <div className="text-xs text-muted-foreground">Manage courses & students</div>
                </button>
            </div>
          </div>
          <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
            <Input
              id="password"
              type="password"
                placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
                className="h-11"
            />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
          </div>
          <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm password
              </Label>
            <Input
              id="confirmPassword"
              type="password"
                placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
                className="h-11"
            />
          </div>
          {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
            </div>
          )}
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium shadow-sm hover:shadow-md transition-shadow" 
              disabled={loading}
            >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating account...
              </>
            ) : (
                'Create account'
            )}
          </Button>
        </form>
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Already registered?</span>
            </div>
          </div>
          <div className="text-center">
            <Link 
              href="/login" 
              className="text-sm font-medium text-primary hover:underline"
            >
              Sign in to your account →
          </Link>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
