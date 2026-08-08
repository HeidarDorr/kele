import { BrandWordmark } from '../../components/brand-wordmark';
import { beginAdministratorLogin, verifyAdministratorLogin } from './actions';

export const dynamic = 'force-dynamic';

const challengeIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const errors: Readonly<Record<string, string>> = {
  mobile: 'شماره موبایل را با کد کشور و به‌شکل ‎+989121234567‎ وارد کنید.',
  challenge: 'درخواست کد ورود در حال حاضر ممکن نیست. یک دقیقه دیگر دوباره تلاش کنید.',
  verification: 'کد ورود معتبر نیست یا زمان آن به پایان رسیده است.',
  session: 'نشست امن ایجاد نشد. دوباره از ابتدا تلاش کنید.',
};

export default async function AdministratorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string; error?: string }>;
}) {
  const parameters = await searchParams;
  const challenge =
    parameters.challenge !== undefined && challengeIdPattern.test(parameters.challenge)
      ? parameters.challenge
      : null;
  const error =
    parameters.error === undefined ? null : (errors[parameters.error] ?? errors.session);

  return (
    <main className="admin-login">
      <section className="admin-login-intro" aria-labelledby="login-title">
        <div className="admin-login-wordmark">
          <BrandWordmark />
        </div>
        <p>هویت مدیریت / دسترسی کنترل‌شده</p>
        <h1 id="login-title">ورود به مدیریت KELE</h1>
        <p className="admin-login-copy">
          دسترسی فقط برای مدیران از پیش ثبت‌شده فعال است. کد یک‌بارمصرف پنج دقیقه اعتبار دارد و هر
          ورود، نشست قبلی را باطل می‌کند.
        </p>
      </section>

      <section className="admin-login-form" aria-label="فرم ورود مدیر">
        {error ? (
          <p className="admin-login-error" role="alert">
            {error}
          </p>
        ) : null}
        {challenge === null ? (
          <form action={beginAdministratorLogin}>
            <label htmlFor="administrator-mobile">شماره موبایل مدیر</label>
            <input
              id="administrator-mobile"
              name="mobile"
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+989121234567"
              pattern="\+98[0-9]{10}"
              required
            />
            <button className="admin-primary" type="submit">
              دریافت کد ورود
            </button>
          </form>
        ) : (
          <form action={verifyAdministratorLogin}>
            <input name="challengeId" type="hidden" value={challenge} />
            <label htmlFor="administrator-code">کد شش‌رقمی</label>
            <input
              id="administrator-code"
              name="code"
              type="text"
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
              required
            />
            <button className="admin-primary" type="submit">
              تأیید و ورود
            </button>
            <a className="admin-login-restart" href="/login">
              درخواست کد تازه
            </a>
          </form>
        )}
        <p className="admin-login-note">پاسخ سامانه وجود یا وضعیت حساب مدیریت را افشا نمی‌کند.</p>
      </section>
    </main>
  );
}
