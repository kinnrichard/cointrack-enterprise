'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Loader2, Building2, User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/lib/auth';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  companyCode: z.string().min(2, 'Company code is required'),
  email: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const login = useAuthStore((s) => s.login);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { companyCode: 'DEMO', email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.companyCode, data.email, data.password);
      toast({ title: 'Welcome back!', description: 'Login successful.' });
      router.push('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Login failed',
        description: err?.response?.data?.message || err?.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-red-800 via-red-900 to-red-950">
      {/* Decorative Elements */}
      <div
        className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          filter: 'blur(80px)',
        }}
      />

      <div className="min-h-screen relative z-10 flex flex-col lg:flex-row">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] items-center justify-center p-10">
          <div className="max-w-xl text-center">
            {/* Logo */}
            <div className="flex items-center justify-center mb-10">
              <Image
                src="/assets/cointrack-no-bg.png"
                alt="CoinTrack"
                width={560}
                height={160}
                className="brightness-0 invert"
                priority
              />
            </div>
            <p className="text-xl text-white/90 leading-relaxed max-w-lg mx-auto mb-10">
              Philippine HR & Payroll Management System
            </p>

            {/* Stats */}
            <div className="flex gap-12 justify-center mt-10">
              <div className="text-center">
                <div className="text-4xl font-bold text-white">100%</div>
                <div className="text-sm text-white/70 mt-1">Cloud-Based</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">24/7</div>
                <div className="text-sm text-white/70 mt-1">Access</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">Secure</div>
                <div className="text-sm text-white/70 mt-1">Multi-Tenant</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
          <div
            className="w-full max-w-md bg-white rounded-2xl border-none"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              padding: '48px 40px',
            }}
          >
            {/* Logo inside card */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center mb-3">
                <Image
                  src="/assets/cointrack.png"
                  alt="CoinTrack"
                  width={200}
                  height={56}
                  priority
                />
              </div>
              <p className="text-sm text-gray-500">Sign in to your account</p>
            </div>

            {/* Mobile branding - only visible on small screens */}
            <div className="lg:hidden text-center mb-8 -mt-4">
              <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-red-600 bg-red-50 rounded-full">
                HR & Payroll
              </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Company Code */}
              <div className="space-y-2">
                <Label htmlFor="companyCode" className="text-sm font-semibold text-gray-700">
                  Company Code
                </Label>
                <div className="relative">
                  <div className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                    focusedField === 'companyCode' ? 'text-red-600' : 'text-gray-400'
                  )}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <Input
                    id="companyCode"
                    placeholder="Enter your company code"
                    className={cn(
                      "pl-12 h-[50px] rounded-lg border transition-all text-base",
                      focusedField === 'companyCode'
                        ? 'border-red-600 ring-2 ring-red-600/20'
                        : 'border-gray-200 hover:border-gray-300',
                      errors.companyCode && 'border-red-300'
                    )}
                    {...register('companyCode')}
                    disabled={isLoading}
                    onFocus={() => setFocusedField('companyCode')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                {errors.companyCode && (
                  <p className="text-sm text-red-500">{errors.companyCode.message}</p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Username
                </Label>
                <div className="relative">
                  <div className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                    focusedField === 'email' ? 'text-red-600' : 'text-gray-400'
                  )}>
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter your username"
                    className={cn(
                      "pl-12 h-[50px] rounded-lg border transition-all text-base",
                      focusedField === 'email'
                        ? 'border-red-600 ring-2 ring-red-600/20'
                        : 'border-gray-200 hover:border-gray-300',
                      errors.email && 'border-red-300'
                    )}
                    {...register('email')}
                    disabled={isLoading}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <div className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                    focusedField === 'password' ? 'text-red-600' : 'text-gray-400'
                  )}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className={cn(
                      "pl-12 pr-12 h-[50px] rounded-lg border transition-all text-base",
                      focusedField === 'password'
                        ? 'border-red-600 ring-2 ring-red-600/20'
                        : 'border-gray-200 hover:border-gray-300',
                      errors.password && 'border-red-300'
                    )}
                    {...register('password')}
                    disabled={isLoading}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-[50px] rounded-lg text-base bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center mt-8 text-xs text-gray-500">
              <div className="text-gray-400 mb-1">
                &copy; {new Date().getFullYear()} CoinTrack Enterprise. All rights reserved.
              </div>
              <div className="text-gray-400">
                Developed by{' '}
                <a
                  href="https://kinn-softwares.solutions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:underline"
                >
                  Kinnitech Softwares
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
