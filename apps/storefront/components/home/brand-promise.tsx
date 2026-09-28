import type { ReactNode } from 'react';

function PromiseIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="home-promise-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const promises = [
  {
    title: 'درست کنار هم',
    body: 'ترکیب‌های از پیش فکرشده برای اینکه ساختن یک ظاهر کامل، ساده‌تر باشد.',
    icon: (
      <PromiseIcon>
        <path d="M10.4 6.6a1.6 1.6 0 1 1 2.3 1.45c-.45.2-.7.55-.7 1V10" />
        <path d="M12 10 3.2 15.6c-.5.32-.27 1.1.32 1.1h16.96c.6 0 .82-.78.32-1.1L12 10Z" />
      </PromiseIcon>
    ),
  },
  {
    title: 'آنچه حس می‌شود',
    body: 'چیزهایی که شاید در نگاه اول دیده نشوند، اما حس می‌شوند.',
    icon: (
      <PromiseIcon>
        <path d="M4.5 4.5h15v10l-5 5h-10Z" />
        <path d="M19.5 14.5h-4a1 1 0 0 0-1 1v4" />
        <path d="M7.25 16.75v-9.5h9.5v4.75" strokeDasharray="1.4 1.6" />
      </PromiseIcon>
    ),
  },
  {
    title: 'به‌روز، دور از تکرار',
    body: 'طراحی‌ها و انتخاب‌های به‌روز، برای کسانی که دنبال انتخاب‌های تکراری نیستند.',
    icon: (
      <PromiseIcon>
        <path d="M12 3.5c.6 5.1 3.4 7.9 8.5 8.5-5.1.6-7.9 3.4-8.5 8.5-.6-5.1-3.4-7.9-8.5-8.5 5.1-.6 7.9-3.4 8.5-8.5Z" />
      </PromiseIcon>
    ),
  },
  {
    title: 'کیفیت، بدون مرز',
    body: 'تولید در ایران، با وسواس در کیفیتی که قرار نیست از استانداردهای جهانی کوتاه بیاید.',
    icon: (
      <PromiseIcon>
        <circle cx="12" cy="12" r="8.5" />
        <ellipse cx="12" cy="12" rx="3.6" ry="8.5" />
        <path d="M3.5 12h17" />
      </PromiseIcon>
    ),
  },
] as const;

export function BrandPromise() {
  return (
    <section className="home-promise" aria-labelledby="home-promise-title">
      <div className="shell">
        <h2 className="visually-hidden" id="home-promise-title">
          آنچه KELE به آن پایبند است
        </h2>
        <ul className="home-promise-grid">
          {promises.map((promise) => (
            <li key={promise.title}>
              {promise.icon}
              <div>
                <h3>{promise.title}</h3>
                <p>{promise.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
