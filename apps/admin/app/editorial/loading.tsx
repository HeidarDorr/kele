import { AdminShell } from '../../components/admin-shell';

export default function EditorialLoading() {
  return (
    <AdminShell>
      <section className="editorial-admin-state" role="status" aria-busy="true">
        <strong>در حال دریافت فضای تحریریه</strong>
        <span>نسخه‌ها، مجوزها و ارجاع‌های محتوا در حال بررسی‌اند.</span>
      </section>
    </AdminShell>
  );
}
