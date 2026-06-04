'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Copy,
  CheckCheck,
  ChevronDown,
  ArrowLeftRight,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/useAuthStore';
import { ApiError } from '@/lib/api-client';
import {
  createDashboardMember,
  formatMemberPhone,
  sendAddMemberEmailOtp,
  sendAddMemberPhoneOtp,
  verifyAddMemberEmailOtp,
  verifyAddMemberPhoneOtp,
} from '@/lib/add-member-api';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
];

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isValidPhone(v: string) {
  return v.replace(/[\s\-+]/g, '').length >= 7;
}

function CountryCodeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected =
    COUNTRY_CODES.find((c) => c.code === value) || COUNTRY_CODES[0];

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-1.5 rounded-l-lg border border-r-0 border-card-border bg-card px-3 text-sm text-text-primary hover:bg-card-hover transition-colors"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="text-xs font-medium text-text-secondary">
          {selected.code}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-text-muted transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border border-card-border bg-card shadow-xl">
          {COUNTRY_CODES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-card-hover',
                c.code === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-primary'
              )}
            >
              <span className="text-base">{c.flag}</span>
              <span className="flex-1 truncate text-left">{c.name}</span>
              <span className="text-xs text-text-muted">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OtpPanel({
  channel,
  sent,
  otp,
  onOtpChange,
  onVerify,
  onResend,
  verifying,
  msg,
  devHint,
}: {
  channel: 'email' | 'phone';
  sent: boolean;
  otp: string;
  onOtpChange: (v: string) => void;
  onVerify: () => void;
  onResend: () => void;
  verifying: boolean;
  msg?: string;
  devHint?: string;
}) {
  const Icon = channel === 'email' ? Mail : Phone;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="mt-2 space-y-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
        {sent ? (
          <>
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Enter the 6-digit code
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {msg || `Code sent for ${channel} verification.`}
                </p>
                {devHint && (
                  <p className="mt-1 text-[11px] font-mono text-accent-gold">
                    dev code: {devHint}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="— — — — — —"
                value={otp}
                onChange={(e) =>
                  onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className="h-11 flex-1 rounded-lg border-2 border-primary/30 bg-card px-4 text-center font-mono text-xl font-bold tracking-[0.4em] text-text-primary placeholder:tracking-[0.3em] placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                disabled={verifying || otp.length < 6}
                onClick={onVerify}
                className="flex h-11 flex-shrink-0 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Code valid for 10 minutes.{' '}
              <button
                type="button"
                onClick={onResend}
                className="text-primary underline underline-offset-2 hover:no-underline"
              >
                Resend
              </button>
            </p>
          </>
        ) : (
          <p className="text-xs text-text-muted">
            {msg || 'Click "Send OTP" above to verify.'}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ContactInputWithOtp({
  icon: Icon,
  label,
  type,
  placeholder,
  value,
  onChange,
  error,
  canSendOtp,
  sending,
  onSendOtp,
  otpSent,
  otp,
  onOtpChange,
  onVerify,
  onResend,
  verifying,
  msg,
  verified,
  leftElement,
  devHint,
}: {
  icon: React.ElementType;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  canSendOtp: boolean;
  sending: boolean;
  onSendOtp: () => void;
  otpSent: boolean;
  otp: string;
  onOtpChange: (v: string) => void;
  onVerify: () => void;
  onResend: () => void;
  verifying: boolean;
  msg?: string;
  verified: boolean;
  leftElement?: React.ReactNode;
  devHint?: string;
}) {
  const [focused, setFocused] = React.useState(false);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div
        className={cn(
          'relative rounded-lg border bg-card transition-all duration-200',
          error && 'border-accent-red ring-1 ring-accent-red/20',
          !error &&
            verified &&
            'border-accent-green/60 ring-1 ring-accent-green/20',
          !error &&
            !verified &&
            focused &&
            'border-primary ring-1 ring-primary/20',
          !error &&
            !verified &&
            !focused &&
            'border-card-border hover:border-card-border/80'
        )}
      >
        {leftElement ? (
          <div className="absolute left-0 top-0 bottom-0 flex">
            {leftElement}
          </div>
        ) : (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <Icon
              className={cn(
                'h-4 w-4 transition-colors',
                verified
                  ? 'text-accent-green'
                  : focused
                  ? 'text-primary'
                  : 'text-text-muted'
              )}
            />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={verified}
          className={cn(
            'w-full rounded-lg bg-transparent py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none',
            leftElement ? 'pl-[100px]' : 'pl-10',
            canSendOtp && !verified ? 'pr-[110px]' : 'pr-10',
            verified && 'cursor-not-allowed opacity-70'
          )}
        />
        {canSendOtp && !verified && (
          <button
            type="button"
            onClick={onSendOtp}
            disabled={sending}
            className="absolute right-2 top-1/2 flex h-7 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {otpSent ? 'Resend' : 'Send OTP'}
          </button>
        )}
        {verified && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle2 className="h-5 w-5 text-accent-green" />
          </span>
        )}
      </div>
      {error && <p className="pl-1 text-xs text-accent-red">{error}</p>}
      <AnimatePresence>
        {canSendOtp && !verified && (
          <OtpPanel
            channel={type === 'email' ? 'email' : 'phone'}
            sent={otpSent}
            otp={otp}
            onOtpChange={onOtpChange}
            onVerify={onVerify}
            onResend={onSendOtp}
            verifying={verifying}
            msg={msg}
            devHint={devHint}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AddUserPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [leg, setLeg] = React.useState<'LEFT' | 'RIGHT'>('LEFT');
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('+91');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [showCpw, setShowCpw] = React.useState(false);

  const [emailOtpSent, setEmailOtpSent] = React.useState(false);
  const [emailOtpSending, setEmailOtpSending] = React.useState(false);
  const [emailOtp, setEmailOtp] = React.useState('');
  const [emailOtpVerifying, setEmailOtpVerifying] = React.useState(false);
  const [emailVerified, setEmailVerified] = React.useState(false);
  const [emailOtpMsg, setEmailOtpMsg] = React.useState('');
  const [emailDevHint, setEmailDevHint] = React.useState('');

  const [phoneOtpSent, setPhoneOtpSent] = React.useState(false);
  const [phoneOtpSending, setPhoneOtpSending] = React.useState(false);
  const [phoneOtp, setPhoneOtp] = React.useState('');
  const [phoneOtpVerifying, setPhoneOtpVerifying] = React.useState(false);
  const [phoneVerified, setPhoneVerified] = React.useState(false);
  const [phoneOtpMsg, setPhoneOtpMsg] = React.useState('');
  const [phoneDevHint, setPhoneDevHint] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [apiError, setApiError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState<{
    sponsor_id?: string;
    full_name?: string;
    email?: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const resetEmailOtp = () => {
    setEmailOtpSent(false);
    setEmailVerified(false);
    setEmailOtp('');
    setEmailOtpMsg('');
    setEmailDevHint('');
  };
  const resetPhoneOtp = () => {
    setPhoneOtpSent(false);
    setPhoneVerified(false);
    setPhoneOtp('');
    setPhoneOtpMsg('');
    setPhoneDevHint('');
  };

  const handleSendEmailOtp = async () => {
    if (!isValidEmail(email)) {
      setEmailOtpMsg('Enter a valid email first.');
      return;
    }
    setEmailOtpSending(true);
    setEmailOtpMsg('');
    setEmailDevHint('');
    try {
      const res = await sendAddMemberEmailOtp(email);
      setEmailOtpSent(true);
      if (res.dev_otp) {
        setEmailDevHint(res.dev_otp);
        setEmailOtpMsg('Verification code sent (dev hint shown below).');
      } else {
        setEmailOtpMsg('Verification code sent to your email.');
      }
    } catch (e) {
      setEmailOtpMsg(
        e instanceof ApiError
          ? e.message
          : 'Could not send email verification code.',
      );
    } finally {
      setEmailOtpSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length < 6) {
      setEmailOtpMsg('Enter the 6-digit code.');
      return;
    }
    setEmailOtpVerifying(true);
    setEmailOtpMsg('');
    try {
      await verifyAddMemberEmailOtp(email, emailOtp);
      setEmailVerified(true);
      setEmailOtpMsg('');
      setErrors((er) => ({ ...er, email: '' }));
    } catch (e) {
      setEmailOtpMsg(
        e instanceof ApiError
          ? e.message
          : 'Invalid code. Please try again.',
      );
    } finally {
      setEmailOtpVerifying(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!isValidPhone(phone)) {
      setPhoneOtpMsg('Enter a valid phone number first.');
      return;
    }
    setPhoneOtpSending(true);
    setPhoneOtpMsg('');
    setPhoneDevHint('');
    try {
      const res = await sendAddMemberPhoneOtp(countryCode, phone);
      setPhoneOtpSent(true);
      if (res.dev_otp) {
        setPhoneDevHint(res.dev_otp);
        setPhoneOtpMsg('Verification code sent (dev hint shown below).');
      } else {
        setPhoneOtpMsg('Verification code sent via WhatsApp.');
      }
    } catch (e) {
      setPhoneOtpMsg(
        e instanceof ApiError
          ? e.message
          : 'Could not send phone verification code.',
      );
    } finally {
      setPhoneOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length < 6) {
      setPhoneOtpMsg('Enter the 6-digit code.');
      return;
    }
    setPhoneOtpVerifying(true);
    setPhoneOtpMsg('');
    try {
      await verifyAddMemberPhoneOtp(countryCode, phone, phoneOtp);
      setPhoneVerified(true);
      setPhoneOtpMsg('');
      setErrors((er) => ({ ...er, phone: '' }));
    } catch (e) {
      setPhoneOtpMsg(
        e instanceof ApiError
          ? e.message
          : 'Invalid code. Please try again.',
      );
    } finally {
      setPhoneOtpVerifying(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!isValidEmail(email)) e.email = 'Valid email is required';
    else if (!emailVerified) e.email = 'Please verify email with OTP';
    if (!isValidPhone(phone)) e.phone = 'Valid phone number is required';
    else if (!phoneVerified) e.phone = 'Please verify phone with OTP';
    if (password.length < 6) e.password = 'Min 6 characters';
    if (password !== confirmPassword)
      e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await createDashboardMember({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: formatMemberPhone(countryCode, phone),
        password,
        leg,
      });
      setSuccess({
        sponsor_id: created.sponsor_id,
        full_name: created.full_name,
        email: created.email,
      });
    } catch (e) {
      setApiError(
        e instanceof ApiError
          ? e.message
          : 'Could not create user — please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="rounded-2xl border border-card-border bg-card p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/15"
          >
            <CheckCircle2 className="h-9 w-9 text-accent-green" />
          </motion.div>
          <h2 className="text-2xl font-bold text-text-primary">
            Member added!
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {success.full_name} has been placed on your{' '}
            <span className="font-semibold text-primary">{leg}</span> leg.
          </p>
          {success.sponsor_id && (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-card-border bg-background-secondary px-4 py-3 text-left">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-muted">
                  New SPF ID
                </p>
                <p className="mt-0.5 font-mono text-lg font-bold text-text-primary">
                  {success.sponsor_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(success.sponsor_id || '')}
                className="flex items-center gap-1.5 rounded-md border border-card-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover"
              >
                {copied ? (
                  <CheckCheck className="h-3.5 w-3.5 text-accent-green" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
          <div className="mt-8 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/team')}
            >
              View team
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setSuccess(null);
                setFullName('');
                setEmail('');
                setPhone('');
                setPassword('');
                setConfirmPassword('');
                resetEmailOtp();
                resetPhoneOtp();
              }}
            >
              Add another
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const sponsorId = user?.referralCode || '—';
  const sponsorName = user?.name || '—';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-card-border bg-card text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Add New Member
          </h1>
          <p className="text-sm text-text-secondary">
            Create a new networker under your sponsorship.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-text-muted">
              Sponsor (you)
            </p>
            <div className="mt-1 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-text-muted">Name</p>
                <p className="font-semibold text-text-primary">{sponsorName}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">SPF ID</p>
                <p className="font-mono text-sm font-bold text-primary">
                  {sponsorId}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Your SPF ID is fixed and cannot be changed. All direct & binary
              commissions from this member will flow up through you.
            </p>
          </div>
        </div>
      </motion.div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-card-border bg-card p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Place in binary tree
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['LEFT', 'RIGHT'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLeg(opt)}
                className={cn(
                  'relative flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-sm font-semibold transition-all',
                  leg === opt
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-card-border bg-background-secondary text-text-secondary hover:border-card-border/80 hover:text-text-primary'
                )}
              >
                <ArrowLeftRight
                  className={cn(
                    'h-4 w-4',
                    opt === 'RIGHT' && 'rotate-180',
                    leg === opt ? 'text-primary' : 'text-text-muted'
                  )}
                />
                {opt === 'LEFT' ? 'Left leg' : 'Right leg'}
                {leg === opt && (
                  <motion.span
                    layoutId="leg-indicator"
                    className="absolute inset-0 rounded-xl ring-2 ring-primary/30"
                  />
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted">
            The new member will spill down the weakest branch of the selected
            leg.
          </p>
        </div>

        <div className="h-px bg-card-border" />

        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          icon={<User className="h-4 w-4" />}
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (errors.fullName) setErrors((er) => ({ ...er, fullName: '' }));
          }}
          error={errors.fullName}
        />

        <ContactInputWithOtp
          icon={Mail}
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            resetEmailOtp();
          }}
          error={errors.email}
          canSendOtp={isValidEmail(email)}
          sending={emailOtpSending}
          onSendOtp={handleSendEmailOtp}
          otpSent={emailOtpSent}
          otp={emailOtp}
          onOtpChange={setEmailOtp}
          onVerify={handleVerifyEmailOtp}
          onResend={handleSendEmailOtp}
          verifying={emailOtpVerifying}
          msg={emailOtpMsg}
          verified={emailVerified}
          devHint={
            process.env.NODE_ENV !== 'production' && emailDevHint
              ? emailDevHint
              : undefined
          }
        />

        <ContactInputWithOtp
          icon={Phone}
          label="Phone Number"
          type="tel"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            resetPhoneOtp();
          }}
          error={errors.phone}
          leftElement={
            <>
              <CountryCodeSelect
                value={countryCode}
                onChange={setCountryCode}
              />
              <div className="flex items-center px-0.5">
                <div className="h-5 w-px bg-card-border" />
              </div>
            </>
          }
          canSendOtp={isValidPhone(phone)}
          sending={phoneOtpSending}
          onSendOtp={handleSendPhoneOtp}
          otpSent={phoneOtpSent}
          otp={phoneOtp}
          onOtpChange={setPhoneOtp}
          onVerify={handleVerifyPhoneOtp}
          onResend={handleSendPhoneOtp}
          verifying={phoneOtpVerifying}
          msg={phoneOtpMsg}
          verified={phoneVerified}
          devHint={
            process.env.NODE_ENV !== 'production' && phoneDevHint
              ? phoneDevHint
              : undefined
          }
        />

        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-4">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary">
              Package auto-activates on first purchase
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              No package selection needed. When this member logs in and makes
              their first purchase on SecureMart, the FMCG platform will
              automatically assign the matching package tier based on the
              purchase amount. Until then, the account is <span className="font-medium text-accent-gold">Inactive</span>.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type={showPw ? 'text' : 'password'}
            placeholder="Min 6 characters"
            icon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-text-muted hover:text-text-secondary"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password)
                setErrors((er) => ({ ...er, password: '' }));
            }}
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            type={showCpw ? 'text' : 'password'}
            placeholder="Re-enter password"
            icon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowCpw((v) => !v)}
                className="text-text-muted hover:text-text-secondary"
                aria-label={showCpw ? 'Hide password' : 'Show password'}
              >
                {showCpw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword)
                setErrors((er) => ({ ...er, confirmPassword: '' }));
            }}
            error={errors.confirmPassword}
          />
        </div>

        <AnimatePresence>
          {(!emailVerified || !phoneVerified) && (email || phone) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 rounded-xl border border-accent-gold/30 bg-accent-gold/[0.08] px-4 py-3 text-xs text-accent-gold">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Verify{' '}
                  {!emailVerified && !phoneVerified
                    ? 'email and phone'
                    : !emailVerified
                    ? 'email'
                    : 'phone'}{' '}
                  with OTP before creating the account. In local dev, the API may
                  return a code hint below the field when SMTP/WhatsApp are not
                  configured.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 rounded-xl border border-accent-red/30 bg-accent-red/[0.08] px-4 py-3 text-sm text-accent-red">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{apiError}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            className="flex-[2]"
            loading={submitting}
          >
            {!submitting && (
              <>
                Create member
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
