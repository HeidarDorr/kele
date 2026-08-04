'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import {
  CommerceApiError,
  commerceApi,
  commerceErrorMessage,
  type Address,
  type AddressInput,
  type Customer,
} from '../lib/commerce-api';

const emptyAddress: AddressInput = {
  recipientName: '',
  recipientMobile: '',
  province: '',
  city: '',
  addressLine: '',
  postalCode: '',
  isDefault: false,
};

export function AccountContent() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState<AddressInput>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profile, ownedAddresses] = await Promise.all([
        commerceApi.customer(),
        commerceApi.addresses(),
      ]);
      setCustomer(profile);
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setAddresses(ownedAddresses);
      setUnauthorized(false);
    } catch (requestError: unknown) {
      if (requestError instanceof CommerceApiError && requestError.status === 401) {
        setUnauthorized(true);
      } else {
        setError(commerceErrorMessage(requestError));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  async function saveProfile(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const profile = await commerceApi.updateCustomer({ firstName, lastName });
      setCustomer(profile);
      setSuccess('اطلاعات حساب ذخیره شد.');
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function saveAddress(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editingId === null) await commerceApi.createAddress(address);
      else await commerceApi.updateAddress(editingId, address);
      setAddress(emptyAddress);
      setEditingId(null);
      setSuccess('نشانی ذخیره شد.');
      setAddresses(await commerceApi.addresses());
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      await commerceApi.logout();
      window.dispatchEvent(new Event('kele:authenticated'));
      router.push('/sign-in');
      router.refresh();
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
      setBusy(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!window.confirm('این نشانی حذف شود؟')) return;
    setBusy(true);
    setError('');
    try {
      await commerceApi.deleteAddress(id);
      setAddresses(await commerceApi.addresses());
      setSuccess('نشانی حذف شد.');
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="shell commerce-page">
        <div className="commerce-page-state" role="status">
          <span className="commerce-loader" aria-hidden="true" />
          در حال دریافت حساب…
        </div>
      </main>
    );
  }
  if (unauthorized) {
    return (
      <main id="main-content" className="shell commerce-page">
        <section className="account-unauthorized">
          <p className="commerce-eyebrow">حساب شخصی</p>
          <h1>برای دیدن این بخش وارد شوید</h1>
          <p>پروفایل و نشانی‌ها فقط برای مالک حساب نمایش داده می‌شوند.</p>
          <Link className="button-primary" href="/sign-in">
            ورود امن
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="shell commerce-page account-page">
      <header className="commerce-page-heading account-heading">
        <div>
          <p>حساب شخصی</p>
          <h1>{customer?.firstName ? `سلام، ${customer.firstName}` : 'پروفایل شما'}</h1>
          <bdi dir="ltr">{customer?.mobile}</bdi>
        </div>
        <button
          type="button"
          disabled={busy}
          className="text-button"
          onClick={() => {
            void logout();
          }}
        >
          خروج از حساب
        </button>
      </header>

      <p className="account-orders-link">
        <Link className="button-secondary" href="/orders">
          مشاهدهٔ سفارش‌ها، رهگیری و مرجوعی
        </Link>
      </p>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}

      <div className="account-grid">
        <section className="account-section" aria-labelledby="profile-heading">
          <div className="account-section-heading">
            <span>01</span>
            <div>
              <h2 id="profile-heading">اطلاعات فردی</h2>
              <p>شمارهٔ تأییدشده قابل ویرایش نیست.</p>
            </div>
          </div>
          <form className="commerce-form" onSubmit={(event) => void saveProfile(event)}>
            <label>
              نام
              <input
                value={firstName}
                required
                maxLength={80}
                onChange={(event) => {
                  setFirstName(event.target.value);
                }}
              />
            </label>
            <label>
              نام خانوادگی
              <input
                value={lastName}
                required
                maxLength={80}
                onChange={(event) => {
                  setLastName(event.target.value);
                }}
              />
            </label>
            <button className="button-primary" type="submit" disabled={busy}>
              ذخیره اطلاعات
            </button>
          </form>
        </section>

        <section className="account-section addresses-section" aria-labelledby="addresses-heading">
          <div className="account-section-heading">
            <span>02</span>
            <div>
              <h2 id="addresses-heading">نشانی‌های تحویل</h2>
              <p>هر نشانی فقط در همین حساب قابل مدیریت است.</p>
            </div>
          </div>
          {addresses.length === 0 ? (
            <p className="addresses-empty">هنوز نشانی‌ای ثبت نشده است.</p>
          ) : (
            <ul className="address-list">
              {addresses.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.recipientName}</strong>
                    {item.isDefault ? <span>پیش‌فرض</span> : null}
                  </div>
                  <p>
                    {item.province}، {item.city}، {item.addressLine}
                  </p>
                  <bdi dir="ltr">{item.postalCode}</bdi>
                  <div className="address-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(item.id);
                        setAddress({
                          recipientName: item.recipientName,
                          recipientMobile: item.recipientMobile,
                          province: item.province,
                          city: item.city,
                          addressLine: item.addressLine,
                          postalCode: item.postalCode,
                          isDefault: item.isDefault,
                        });
                      }}
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void deleteAddress(item.id);
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            className="commerce-form address-form"
            onSubmit={(event) => void saveAddress(event)}
          >
            <h3>{editingId === null ? 'نشانی تازه' : 'ویرایش نشانی'}</h3>
            <label>
              نام گیرنده
              <input
                value={address.recipientName}
                required
                minLength={2}
                maxLength={160}
                onChange={(event) => {
                  setAddress({ ...address, recipientName: event.target.value });
                }}
              />
            </label>
            <label>
              موبایل گیرنده
              <input
                dir="ltr"
                type="tel"
                value={address.recipientMobile}
                required
                pattern="\+989[0-9]{9}"
                placeholder="+989121234567"
                onChange={(event) => {
                  setAddress({ ...address, recipientMobile: event.target.value });
                }}
              />
            </label>
            <div className="form-row">
              <label>
                استان
                <input
                  value={address.province}
                  required
                  maxLength={100}
                  onChange={(event) => {
                    setAddress({ ...address, province: event.target.value });
                  }}
                />
              </label>
              <label>
                شهر
                <input
                  value={address.city}
                  required
                  maxLength={100}
                  onChange={(event) => {
                    setAddress({ ...address, city: event.target.value });
                  }}
                />
              </label>
            </div>
            <label>
              نشانی کامل
              <textarea
                value={address.addressLine}
                required
                minLength={5}
                maxLength={500}
                onChange={(event) => {
                  setAddress({ ...address, addressLine: event.target.value });
                }}
              />
            </label>
            <label>
              کد پستی
              <input
                dir="ltr"
                inputMode="numeric"
                value={address.postalCode}
                required
                pattern="[0-9]{10}"
                onChange={(event) => {
                  setAddress({ ...address, postalCode: event.target.value });
                }}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={address.isDefault}
                onChange={(event) => {
                  setAddress({ ...address, isDefault: event.target.checked });
                }}
              />
              نشانی پیش‌فرض باشد
            </label>
            <div className="form-actions">
              <button className="button-primary" type="submit" disabled={busy}>
                ذخیره نشانی
              </button>
              {editingId ? (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setAddress(emptyAddress);
                  }}
                >
                  انصراف
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
