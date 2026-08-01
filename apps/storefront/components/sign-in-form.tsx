'use client';

import { useRouter } from 'next/navigation';
import { type SyntheticEvent, useState } from 'react';
import { commerceApi, commerceErrorMessage } from '../lib/commerce-api';

function normalizeMobile(value: string): string {
  const latin = value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^+0-9]/g, '');
  if (/^09[0-9]{9}$/.test(latin)) return `+98${latin.slice(1)}`;
  return latin;
}

export function SignInForm() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function requestCode(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const challenge = await commerceApi.createChallenge(normalizeMobile(mobile));
      setChallengeId(challenge.challengeId);
      setStatus('کد یک‌بارمصرف از طریق فراهم‌کنندهٔ آزمایشی ارسال شد.');
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challengeId === null) return;
    setBusy(true);
    setError('');
    try {
      const result = await commerceApi.verifyChallenge(challengeId, code);
      setStatus(
        result.mergePerformed
          ? 'ورود انجام شد و انتخاب‌های مهمان با سبد حساب شما ادغام شدند.'
          : 'ورود با موفقیت انجام شد.',
      );
      window.dispatchEvent(new Event('kele:authenticated'));
      router.push('/account');
      router.refresh();
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="sign-in-title">
      <p className="commerce-eyebrow">حساب KELE</p>
      <h1 id="sign-in-title">ورود با شمارهٔ موبایل</h1>
      <p>رمز عبوری نگه‌داری نمی‌شود؛ هر کد کوتاه‌عمر و یک‌بارمصرف است.</p>
      {challengeId === null ? (
        <form onSubmit={(event) => void requestCode(event)}>
          <label htmlFor="mobile">شمارهٔ موبایل</label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09121234567"
            value={mobile}
            required
            pattern="(?:\+989|09)[0-9]{9}"
            onChange={(event) => {
              setMobile(event.target.value);
            }}
          />
          <button className="button-primary" type="submit" disabled={busy}>
            {busy ? 'در حال ارسال…' : 'دریافت کد'}
          </button>
        </form>
      ) : (
        <form onSubmit={(event) => void verifyCode(event)}>
          <label htmlFor="otp-code">کد یک‌بارمصرف</label>
          <input
            id="otp-code"
            name="code"
            type="text"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={4}
            maxLength={8}
            pattern="[0-9]{4,8}"
            value={code}
            required
            onChange={(event) => {
              setCode(event.target.value.replace(/[^0-9]/g, ''));
            }}
          />
          <button className="button-primary" type="submit" disabled={busy}>
            {busy ? 'در حال بررسی…' : 'تأیید و ورود'}
          </button>
          <button
            className="text-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setChallengeId(null);
              setCode('');
              setStatus('');
            }}
          >
            اصلاح شماره
          </button>
        </form>
      )}
      {status ? (
        <p className="form-success" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
