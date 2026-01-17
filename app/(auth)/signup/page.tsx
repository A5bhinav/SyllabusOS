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
        },
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Profile should be auto-created by database trigger
        // Wait for trigger to execute and poll a few times
        let profileExists = false;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!profileExists && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', authData.user.id)
            .single();
          
          if (profile && !error) {
            profileExists = true;
            // Verify role is correct, if not, we'll fix it below
            break;
          }
          
          attempts++;
        }

        // If profile still doesn't exist after polling, use API route
        // (which has service role access and can bypass RLS)
        if (!profileExists) {
          try {
            const response = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: authData.user.id,
                email: authData.user.email!,
                name: name.trim(),
                role,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.warn('Profile creation via API failed:', errorData.error);
            } else {
              // Wait a bit for profile to be created
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (err) {
            console.warn('Failed to create profile via API:', err);
          }
        }

        // Fetch the actual profile from database to get the correct role
        let { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        // If profile exists but role is wrong, update it
        if (profileData && profileData.role !== role) {
          console.log(`Profile role mismatch. Database: ${profileData.role}, Form: ${role}. Updating...`);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', authData.user.id);

          if (!updateError) {
            profileData.role = role;
          } else {
            console.error('Failed to update profile role:', updateError);
          }
        }

        // Use database role if available, otherwise fall back to form role
        const userRole = profileData?.role || role;

        // Redirect based on actual database role
        // Professors go to onboarding first to upload course files
        if (userRole === 'professor') {
          router.push('/onboarding');
        } else {
          router.push('/student');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Enter your information to get started with SyllabusOS
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === 'student'}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={loading}
                  className="h-4 w-4"
                />
                <span className="text-sm">Student</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="role"
                  value="professor"
                  checked={role === 'professor'}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={loading}
                  className="h-4 w-4"
                />
                <span className="text-sm">Professor</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating account...
              </>
            ) : (
              'Sign up'
            )}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
