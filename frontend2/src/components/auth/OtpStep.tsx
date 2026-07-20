import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

const RESEND_COOLDOWN_S = 60;

interface OtpStepProps {
  email: string;
  purpose: 'signup' | 'login';
  /** Called with the full auth response data (token, role, etc.) on success */
  onSuccess: (data: any) => void;
  /** Return to the email/password form */
  onBack: () => void;
}

const OtpStep: React.FC<OtpStepProps> = ({ email, purpose, onSuccess, onBack }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const response = await apiClient.verifyOtp(email, purpose, code.trim());
      onSuccess(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    try {
      await apiClient.resendOtp(email, purpose);
      setInfo('A new code has been sent if the details are valid.');
      setCooldown(RESEND_COOLDOWN_S);
      setCode('');
    } catch (err: any) {
      // 429 from the strict resend rate limit lands here
      setError('Too many resend attempts — please wait a minute and try again.');
    }
  };

  return (
    <div className="tg-otp-step">
      <h2>Check your email</h2>
      <p className="tg-auth-sub">
        We sent a 6-digit code to <strong>{email}</strong>.
        {purpose === 'signup' ? ' Enter it to verify your email address.' : ' Enter it to finish signing in.'}
      </p>

      <form onSubmit={handleVerify} className="tg-auth-form">
        <label>Verification code</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          className="tg-otp-input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          autoFocus
          required
        />

        {error && <div className="tg-demo-error">{error}</div>}
        {info && <div className="tg-otp-info">{info}</div>}

        <button
          type="submit"
          className="tg-btn tg-btn-primary tg-btn-lg tg-btn-block"
          disabled={loading || code.length !== 6}
        >
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>
      </form>

      <div className="tg-otp-actions">
        <button type="button" className="tg-otp-link" onClick={handleResend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        <button type="button" className="tg-otp-link" onClick={onBack}>
          Use a different email
        </button>
      </div>
    </div>
  );
};

export default OtpStep;
