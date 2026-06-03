'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Copy,
  Check,
  KeyRound,
  FileCheck,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  XCircle,
  Send,
  Loader2,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Camera,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { copyToClipboard } from '@/lib/utils';
import {
  useProfileData,
  type KYCDocumentType,
  type KYCStatus,
} from '@/hooks/use-profile-data';

type AlertKind = 'success' | 'error';
type Alert = { kind: AlertKind; message: string } | null;

const REQUIRED_KYC_DOCS: {
  type: KYCDocumentType;
  label: string;
  hint: string;
}[] = [
  { type: 'PAN_CARD', label: 'PAN Card', hint: 'Clear photo or scan of your PAN card' },
  { type: 'AADHAAR_FRONT', label: 'Aadhaar Front', hint: 'Front side of your Aadhaar card' },
  { type: 'AADHAAR_BACK', label: 'Aadhaar Back', hint: 'Back side of your Aadhaar card' },
  { type: 'BANK_PASSBOOK', label: 'Bank Passbook / Cheque', hint: 'For payouts — passbook or cancelled cheque' },
];

function kycStatusBadge(status: KYCStatus | null) {
  if (!status) {
    return <Badge variant="outline">Not started</Badge>;
  }
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" /> In progress
        </Badge>
      );
    case 'SUBMITTED':
      return (
        <Badge variant="info" className="gap-1">
          <Send className="h-3 w-3" /> Under review
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="danger" className="gap-1">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
  }
}

function AlertBanner({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  if (!alert) return null;
  const isError = alert.kind === 'error';
  return (
    <div
      className={`mt-3 flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
        isError
          ? 'border-accent-red/30 bg-accent-red/10 text-accent-red'
          : 'border-green-500/30 bg-green-500/10 text-green-400'
      }`}
    >
      <div className="flex items-start gap-2">
        {isError ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>{alert.message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-current/70 hover:text-current"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ChangePasswordCard() {
  const { changePassword } = useProfileData();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<Alert>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (newPassword.length < 6) {
      setAlert({ kind: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({ kind: 'error', message: 'New password and confirmation do not match.' });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAlert({ kind: 'success', message: 'Login password updated successfully.' });
    } catch (err) {
      setAlert({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to change password.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-0">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="h-5 w-5 text-secondary-light" />
          Login Password
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <p className="text-sm text-text-muted mb-4">
          Use a strong password you don&apos;t reuse elsewhere. You&apos;ll stay signed in on this device.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Current Password"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="text-text-muted hover:text-text-primary"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            autoComplete="current-password"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="text-text-muted hover:text-text-primary"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirm New Password"
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              autoComplete="new-password"
              required
            />
          </div>
          <AlertBanner alert={alert} onClose={() => setAlert(null)} />
          <div className="flex justify-end">
            <Button type="submit" loading={submitting} className="gap-2">
              <Lock className="h-4 w-4" />
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TransactionPasswordCard() {
  const { profile, setTransactionPassword } = useProfileData();
  const hasTxn = !!profile?.has_transaction_password;
  const [loginPassword, setLoginPassword] = React.useState('');
  const [currentTxn, setCurrentTxn] = React.useState('');
  const [newTxn, setNewTxn] = React.useState('');
  const [confirmTxn, setConfirmTxn] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<Alert>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (newTxn.length < 6) {
      setAlert({ kind: 'error', message: 'Transaction password must be at least 6 characters.' });
      return;
    }
    if (newTxn !== confirmTxn) {
      setAlert({ kind: 'error', message: 'New transaction password and confirmation do not match.' });
      return;
    }
    setSubmitting(true);
    try {
      await setTransactionPassword({
        loginPassword,
        currentTransactionPassword: hasTxn ? currentTxn : undefined,
        newTransactionPassword: newTxn,
      });
      setLoginPassword('');
      setCurrentTxn('');
      setNewTxn('');
      setConfirmTxn('');
      setAlert({
        kind: 'success',
        message: hasTxn
          ? 'Transaction password updated successfully.'
          : 'Transaction password set successfully.',
      });
    } catch (err) {
      setAlert({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to save transaction password.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-0">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent-gold" />
            Transaction Password
          </CardTitle>
          {hasTxn ? (
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" /> Configured
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1">
              <AlertCircle className="h-3 w-3" /> Not set
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <p className="text-sm text-text-muted mb-4">
          Your transaction password is a separate 6+ character code required to authorise
          high-risk actions like peer-to-peer (P2P) transfers to other networkers. Keep it
          different from your login password.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Login Password"
            type={show ? 'text' : 'password'}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="text-text-muted hover:text-text-primary"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            autoComplete="current-password"
            required
          />
          {hasTxn && (
            <Input
              label="Current Transaction Password"
              type={show ? 'text' : 'password'}
              value={currentTxn}
              onChange={(e) => setCurrentTxn(e.target.value)}
              icon={<Shield className="h-4 w-4" />}
              autoComplete="off"
              required
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={hasTxn ? 'New Transaction Password' : 'Transaction Password'}
              type={show ? 'text' : 'password'}
              value={newTxn}
              onChange={(e) => setNewTxn(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirm Transaction Password"
              type={show ? 'text' : 'password'}
              value={confirmTxn}
              onChange={(e) => setConfirmTxn(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              autoComplete="new-password"
              required
            />
          </div>
          <AlertBanner alert={alert} onClose={() => setAlert(null)} />
          <div className="flex justify-end">
            <Button type="submit" variant="gold" loading={submitting} className="gap-2">
              <Shield className="h-4 w-4" />
              {hasTxn ? 'Change Transaction Password' : 'Set Transaction Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Email / Phone — inline edit in Personal Information
// ──────────────────────────────────────────────────────────────────────
//
// Client-side OTP simulation — identical pattern to add-user/page.tsx.
// Replace with server-side OTP endpoints when the backend exposes them;
// the `otp_verified` request flag is the server contract we keep stable.
// ──────────────────────────────────────────────────────────────────────

const COUNTRY_CODES: { code: string; flag: string; name: string }[] = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
];

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone = (v: string) => v.replace(/[\s\-+]/g, '').length >= 7;

function OtpInlinePanel({
  channel,
  otp,
  onChange,
  onVerify,
  onResend,
  verifying,
  devCode,
  message,
}: {
  channel: 'email' | 'phone';
  otp: string;
  onChange: (v: string) => void;
  onVerify: () => void;
  onResend: () => void;
  verifying: boolean;
  /** When set (local dev OTP), shown like the reference: gray hint + orange `dev code:` line */
  devCode?: string;
  message?: string;
}) {
  const Icon = channel === 'phone' ? Phone : Mail;
  const isError = Boolean(message?.toLowerCase().includes('invalid'));

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-base font-semibold text-text-primary">Enter the 6-digit code</p>
          {devCode ? (
            <>
              <p className="text-xs leading-relaxed text-text-muted">
                Dev mode: OTP logged to browser console.
              </p>
              <p className="font-mono text-sm font-semibold tracking-wide text-amber-400">
                dev code: {devCode}
              </p>
              {message && isError ? (
                <p className="text-xs text-accent-red">{message}</p>
              ) : null}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-text-muted">
              {message && !isError
                ? message
                : `Enter the 6-digit code sent for ${channel} verification.`}
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
            onChange(e.target.value.replace(/\D/g, '').slice(0, 6))
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
    </div>
  );
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
        className="flex h-11 items-center gap-1.5 rounded-l-lg border border-r-0 border-card-border bg-card px-3 text-sm text-text-primary transition-colors hover:bg-card-hover"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="text-xs font-medium text-text-secondary">
          {selected.code}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-text-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border border-card-border bg-card shadow-xl">
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
                  : 'text-text-primary',
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

function PersonalInfoEmailField() {
  const { profile, updateEmail } = useProfileData();
  const currentEmail = profile?.email ?? '';

  const [editing, setEditing] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  const [otpSent, setOtpSent] = React.useState(false);
  const [otpSending, setOtpSending] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [otpVerifying, setOtpVerifying] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [otpMsg, setOtpMsg] = React.useState('');
  const [devOtpCode, setDevOtpCode] = React.useState('');
  const otpRef = React.useRef<string>('');

  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<Alert>(null);

  const resetOtp = () => {
    setOtpSent(false);
    setVerified(false);
    setOtp('');
    setOtpMsg('');
    setDevOtpCode('');
    otpRef.current = '';
  };

  const handleCancel = () => {
    resetOtp();
    setEmail('');
    setLoginPassword('');
    setAlert(null);
    setEditing(false);
  };

  React.useEffect(() => {
    resetOtp();
  }, [email]);

  const canSendOtp =
    isValidEmail(email) &&
    email.trim().toLowerCase() !== currentEmail.trim().toLowerCase();

  const handleSendOtp = async () => {
    if (!canSendOtp) {
      setOtpMsg('Enter a new valid email first.');
      return;
    }
    setOtpSending(true);
    setOtpMsg('');
    await new Promise((r) => setTimeout(r, 300));
    const code = generateOtp();
    otpRef.current = code;
    // eslint-disable-next-line no-console
    console.info(
      `%c[dev] email OTP for ${email} = ${code}`,
      'color:#10b981;font-weight:bold',
    );
    setOtpSending(false);
    setOtpSent(true);
    setDevOtpCode(code);
    setOtpMsg('');
  };

  const handleVerifyOtp = async () => {
    setOtpVerifying(true);
    await new Promise((r) => setTimeout(r, 200));
    setOtpVerifying(false);
    if (otp === otpRef.current && otp.length === 6) {
      setVerified(true);
      setOtpMsg('');
      setDevOtpCode('');
    } else {
      setOtpMsg('Invalid code. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (!verified) {
      setAlert({ kind: 'error', message: 'Please verify the new email with OTP first.' });
      return;
    }
    if (!loginPassword) {
      setAlert({ kind: 'error', message: 'Enter your login password.' });
      return;
    }
    setSubmitting(true);
    try {
      await updateEmail({
        newEmail: email.trim(),
        loginPassword,
        otpVerified: true,
      });
      setAlert({ kind: 'success', message: 'Email updated successfully.' });
      setEmail('');
      setLoginPassword('');
      resetOtp();
      setEditing(false);
    } catch (err) {
      setAlert({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to update email.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-text-secondary">Email Address</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
        <div className="flex h-11 items-center gap-2 rounded-lg border border-card-border bg-card px-3 text-sm text-text-primary">
          <Mail className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="min-w-0 truncate">{currentEmail || '—'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:col-span-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">Update email</p>
        {verified && (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> OTP Verified
          </Badge>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Current: <span className="font-medium text-text-primary">{currentEmail || '—'}</span>.
        We&apos;ll OTP-verify the new address and confirm your login password before switching.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">New Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={verified}
              placeholder="you@example.com"
              className={cn(
                'h-11 w-full rounded-lg border bg-card pl-10 pr-[110px] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20',
                verified
                  ? 'border-accent-green/60'
                  : 'border-card-border focus:border-primary',
              )}
            />
            {!verified && (
              <button
                type="button"
                disabled={!canSendOtp || otpSending}
                onClick={handleSendOtp}
                className="absolute right-2 top-1/2 flex h-7 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {otpSending ? (
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
          <AnimatePresence>
            {otpSent && !verified && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <OtpInlinePanel
                  channel="email"
                  otp={otp}
                  onChange={setOtp}
                  onVerify={handleVerifyOtp}
                  onResend={handleSendOtp}
                  verifying={otpVerifying}
                  devCode={devOtpCode}
                  message={otpMsg}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Input
          label="Login Password"
          type={showPw ? 'text' : 'password'}
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="text-text-muted hover:text-text-primary"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          autoComplete="current-password"
        />

        <AlertBanner alert={alert} onClose={() => setAlert(null)} />

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={!verified || !loginPassword}
            className="gap-2"
          >
            <Mail className="h-4 w-4" /> Save email
          </Button>
        </div>
      </form>
    </div>
  );
}

function PersonalInfoPhoneField() {
  const { profile, updatePhone } = useProfileData();
  const currentPhone = profile?.phone ?? '';

  const [editing, setEditing] = React.useState(false);
  const [countryCode, setCountryCode] = React.useState('+91');
  const [phone, setPhone] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  const [otpSent, setOtpSent] = React.useState(false);
  const [otpSending, setOtpSending] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [otpVerifying, setOtpVerifying] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [otpMsg, setOtpMsg] = React.useState('');
  const [devOtpCode, setDevOtpCode] = React.useState('');
  const otpRef = React.useRef<string>('');

  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<Alert>(null);

  const resetOtp = () => {
    setOtpSent(false);
    setVerified(false);
    setOtp('');
    setOtpMsg('');
    setDevOtpCode('');
    otpRef.current = '';
  };

  const handleCancel = () => {
    resetOtp();
    setPhone('');
    setLoginPassword('');
    setAlert(null);
    setEditing(false);
  };

  React.useEffect(() => {
    resetOtp();
  }, [phone, countryCode]);

  const fullPhone = `${countryCode}${phone.replace(/[\s\-]/g, '')}`;
  const canSendOtp =
    isValidPhone(phone) &&
    fullPhone.trim() !== (currentPhone || '').trim();

  const handleSendOtp = async () => {
    if (!canSendOtp) {
      setOtpMsg('Enter a new valid phone number first.');
      return;
    }
    setOtpSending(true);
    setOtpMsg('');
    await new Promise((r) => setTimeout(r, 300));
    const code = generateOtp();
    otpRef.current = code;
    // eslint-disable-next-line no-console
    console.info(
      `%c[dev] phone OTP for ${fullPhone} = ${code}`,
      'color:#10b981;font-weight:bold',
    );
    setOtpSending(false);
    setOtpSent(true);
    setDevOtpCode(code);
    setOtpMsg('');
  };

  const handleVerifyOtp = async () => {
    setOtpVerifying(true);
    await new Promise((r) => setTimeout(r, 200));
    setOtpVerifying(false);
    if (otp === otpRef.current && otp.length === 6) {
      setVerified(true);
      setOtpMsg('');
      setDevOtpCode('');
    } else {
      setOtpMsg('Invalid code. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (!verified) {
      setAlert({ kind: 'error', message: 'Please verify the new phone with OTP first.' });
      return;
    }
    if (!loginPassword) {
      setAlert({ kind: 'error', message: 'Enter your login password.' });
      return;
    }
    setSubmitting(true);
    try {
      await updatePhone({
        newPhone: fullPhone,
        loginPassword,
        otpVerified: true,
      });
      setAlert({ kind: 'success', message: 'Phone updated successfully.' });
      setPhone('');
      setLoginPassword('');
      resetOtp();
      setEditing(false);
    } catch (err) {
      setAlert({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to update phone.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-text-secondary">Mobile Number</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
        <div className="flex h-11 items-center gap-2 rounded-lg border border-card-border bg-card px-3 text-sm text-text-primary">
          <Phone className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="min-w-0 truncate">{currentPhone || '—'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:col-span-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">Update mobile number</p>
        {verified && (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> OTP Verified
          </Badge>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Current: <span className="font-medium text-text-primary">{currentPhone || '—'}</span>.
        The new number will receive an OTP; confirm your login password before it takes effect.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">New Mobile Number</label>
          <div
            className={cn(
              'relative flex rounded-lg border bg-card transition-all',
              verified
                ? 'border-accent-green/60'
                : 'border-card-border focus-within:border-primary',
            )}
          >
            <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
              disabled={verified}
              placeholder="10-digit mobile"
              className="h-11 flex-1 rounded-r-lg bg-transparent pl-3 pr-[110px] text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            {!verified && (
              <button
                type="button"
                disabled={!canSendOtp || otpSending}
                onClick={handleSendOtp}
                className="absolute right-2 top-1/2 flex h-7 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {otpSending ? (
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
          <AnimatePresence>
            {otpSent && !verified && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <OtpInlinePanel
                  channel="phone"
                  otp={otp}
                  onChange={setOtp}
                  onVerify={handleVerifyOtp}
                  onResend={handleSendOtp}
                  verifying={otpVerifying}
                  devCode={devOtpCode}
                  message={otpMsg}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Input
          label="Login Password"
          type={showPw ? 'text' : 'password'}
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="text-text-muted hover:text-text-primary"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          autoComplete="current-password"
        />

        <AlertBanner alert={alert} onClose={() => setAlert(null)} />

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={!verified || !loginPassword}
            className="gap-2"
          >
            <Phone className="h-4 w-4" /> Save phone
          </Button>
        </div>
      </form>
    </div>
  );
}

function KYCDocumentRow({
  doc,
  uploaded,
  locked,
  uploading,
  onUpload,
}: {
  doc: { type: KYCDocumentType; label: string; hint: string };
  uploaded: { file_name: string; uploaded_at: string } | undefined;
  locked: boolean;
  uploading: boolean;
  onUpload: (type: KYCDocumentType, file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const onPick = () => inputRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUpload(doc.type, f);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-hover p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            uploaded
              ? 'bg-green-500/15 text-green-400'
              : 'bg-primary/15 text-primary'
          }`}
        >
          {uploaded ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-text-primary">{doc.label}</p>
          <p className="text-xs text-text-muted">{doc.hint}</p>
          {uploaded && (
            <p className="mt-1 truncate text-xs text-text-secondary">
              {uploaded.file_name} · uploaded {new Date(uploaded.uploaded_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={onFile}
        />
        <Button
          type="button"
          variant={uploaded ? 'outline' : 'primary'}
          size="sm"
          onClick={onPick}
          disabled={locked || uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploaded ? 'Replace' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}

function KYCCard() {
  const { profile, kyc, uploadKYCDocument, submitKYC } = useProfileData();
  const [uploadingType, setUploadingType] = React.useState<KYCDocumentType | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<Alert>(null);

  const status: KYCStatus | null = profile?.kyc_status ?? kyc?.status ?? null;
  const rejectionReason = profile?.kyc_rejection_reason ?? kyc?.rejection_reason ?? null;

  const uploadedByType = React.useMemo(() => {
    const map = new Map<
      KYCDocumentType,
      { file_name: string; uploaded_at: string }
    >();
    for (const d of kyc?.documents ?? []) {
      map.set(d.document_type, {
        file_name: d.file_name,
        uploaded_at: d.uploaded_at,
      });
    }
    return map;
  }, [kyc?.documents]);

  const requiredDocsUploaded = REQUIRED_KYC_DOCS.filter((d) =>
    uploadedByType.has(d.type),
  ).length;
  const canSubmit =
    requiredDocsUploaded >= REQUIRED_KYC_DOCS.length &&
    (status === 'PENDING' || status === 'REJECTED' || status === null);

  const locked = status === 'SUBMITTED' || status === 'APPROVED';

  const handleUpload = async (type: KYCDocumentType, file: File) => {
    setAlert(null);
    if (file.size > 10 * 1024 * 1024) {
      setAlert({ kind: 'error', message: 'File must be 10MB or smaller.' });
      return;
    }
    setUploadingType(type);
    try {
      await uploadKYCDocument(type, file);
      setAlert({
        kind: 'success',
        message: `${type.replace(/_/g, ' ').toLowerCase()} uploaded.`,
      });
    } catch (err) {
      setAlert({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Upload failed.',
      });
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmit = async () => {
    setAlert(null);
    setSubmitting(true);
    try {
      await submitKYC();
      setAlert({
        kind: 'success',
        message: 'KYC submitted. You will be notified once reviewed.',
      });
    } catch (err) {
      setAlert({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit KYC.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-0">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            KYC Verification
          </CardTitle>
          {kycStatusBadge(status)}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-4">
        <p className="text-sm text-text-muted">
          Upload the following documents to complete your KYC. Approved KYC is required for
          withdrawals and P2P transfers. Accepted formats: JPG, PNG, PDF — max 10MB each.
        </p>

        <AnimatePresence>
          {status === 'REJECTED' && rejectionReason && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Your KYC was rejected</p>
                  <p className="mt-1 text-accent-red/90">
                    <span className="font-medium">Reason:</span> {rejectionReason}
                  </p>
                  <p className="mt-2 text-accent-red/80">
                    Please re-upload the relevant documents below and resubmit.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'SUBMITTED' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300"
            >
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Your KYC is under review. You won&apos;t be able to modify documents until the
                  review is complete.
                </p>
              </div>
            </motion.div>
          )}

          {status === 'APPROVED' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Your KYC has been approved. You&apos;re all set.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {REQUIRED_KYC_DOCS.map((d) => (
            <KYCDocumentRow
              key={d.type}
              doc={d}
              uploaded={uploadedByType.get(d.type)}
              locked={locked}
              uploading={uploadingType === d.type}
              onUpload={handleUpload}
            />
          ))}
        </div>

        <AlertBanner alert={alert} onClose={() => setAlert(null)} />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-text-muted">
            {requiredDocsUploaded} of {REQUIRED_KYC_DOCS.length} required documents uploaded
          </p>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {status === 'REJECTED' ? 'Resubmit KYC' : 'Submit for Review'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return <ProfilePageInner />;
}

function ProfilePageInner() {
  const { profile, loading, error, refresh, uploadAvatar } = useProfileData();
  const [copied, setCopied] = React.useState(false);

  const sponsorCode = profile?.sponsor_id ?? '';
  const handleCopy = async () => {
    if (!sponsorCode) return;
    await copyToClipboard(sponsorCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const initials = (profile?.full_name ?? '  ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [photoErr, setPhotoErr] = React.useState<string | null>(null);

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png)$/i.test(file.type)) {
      setPhotoErr('Please choose a JPEG or PNG image.');
      return;
    }
    setPhotoErr(null);
    setPhotoBusy(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      setPhotoErr(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPhotoBusy(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-accent-red" />
          <div>
            <p className="font-medium text-text-primary">Unable to load profile</p>
            <p className="mt-1 text-sm text-text-muted">{error}</p>
            <Button onClick={refresh} variant="outline" size="sm" className="mt-3">
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/20 to-secondary/20 p-6"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative h-20 w-20 shrink-0">
            <Avatar size="2xl" className="h-20 w-20 border border-white/10">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-2xl">{initials || 'U'}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoBusy}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-background text-primary shadow-md transition hover:bg-primary/15 disabled:opacity-60"
              aria-label="Upload profile photo"
            >
              {photoBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={onAvatarFile}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-bold text-text-primary">
              {profile?.full_name ?? '—'}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile?.package_name && (
                <Badge variant="primary">{profile.package_name} Package</Badge>
              )}
              <Badge variant={profile?.status === 'ACTIVE' ? 'success' : 'warning'} className="gap-1">
                <Check className="h-3 w-3" /> {profile?.status ?? '—'}
              </Badge>
              {kycStatusBadge(profile?.kyc_status ?? null)}
            </div>
            <p className="mt-2 text-text-muted">
              {profile?.created_at
                ? `Member since ${new Date(profile.created_at).toLocaleDateString()}`
                : '—'}
            </p>
            {photoErr && (
              <p className="mt-2 text-sm text-accent-red">{photoErr}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Identity + Sponsor */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card className="p-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={profile?.full_name ?? ''}
                icon={<User className="h-4 w-4" />}
                disabled
              />
              <PersonalInfoEmailField />
              <PersonalInfoPhoneField />
              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary">
                  Your Sponsor ID
                </label>
                <div className="flex gap-2">
                  <Input
                    value={sponsorCode}
                    icon={<Shield className="h-4 w-4" />}
                    disabled
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    aria-label="Copy sponsor ID"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Share this code for people to join your team.
                </p>
              </div>
            </div>

            {profile?.sponsor_sponsor_id && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Upline Sponsor"
                  value={
                    profile.sponsor_name
                      ? `${profile.sponsor_name} (${profile.sponsor_sponsor_id})`
                      : profile.sponsor_sponsor_id
                  }
                  icon={<User className="h-4 w-4" />}
                  disabled
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Passwords */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <ChangePasswordCard />
        <TransactionPasswordCard />
      </motion.div>

      {/* KYC */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <KYCCard />
      </motion.div>
    </div>
  );
}
