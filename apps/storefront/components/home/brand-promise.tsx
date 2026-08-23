const promises = [
  {
    title: 'پارچه‌های طبیعی',
    body: 'الیاف طبیعی و آستر نرم، انتخاب‌شده برای پوستی که هنوز حساس است.',
  },
  {
    title: 'آزادی حرکت',
    body: 'برش‌هایی که اجازه می‌دهند کودک بدود، بنشیند و بازی کند؛ نه اینکه فقط بایستد.',
  },
  {
    title: 'دوخت سنجیده',
    body: 'درزهای تمیز، جزئیات کم و دقیق، و فرمی که بعد از چند بار شست‌وشو می‌ماند.',
  },
  {
    title: 'ست‌بندی آماده',
    body: 'ترکیب‌های کامل که تیم ما بسته است، تا انتخاب برای شما ساده بماند.',
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
          {promises.map((promise, index) => (
            <li key={promise.title}>
              <span className="home-promise-index" aria-hidden="true">
                {['۰۱', '۰۲', '۰۳', '۰۴'][index]}
              </span>
              <h3>{promise.title}</h3>
              <p>{promise.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
