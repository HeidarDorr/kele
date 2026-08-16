import { describe, expect, it } from 'vitest';
import { validateProductMatrixMedia } from './product-matrix-validation';

describe('اعتبارسنجی رسانهٔ ماتریس محصول', () => {
  it('رنگ بدون تصویر را پیش از ارسال فرم رد می‌کند', () => {
    expect(
      validateProductMatrixMedia([
        {
          name: 'زغالی',
          mediaIds: ['20000000-0000-4000-8000-000000000031'],
          featuredMediaId: '20000000-0000-4000-8000-000000000031',
        },
        { name: 'بژ', mediaIds: [], featuredMediaId: '' },
      ]),
    ).toEqual({
      variantIndex: 1,
      message: 'برای رنگ ۲ («بژ») حداقل یک تصویر انتخاب کنید.',
    });
  });

  it('تصویر شاخصی را که عضو گالری همان رنگ نیست رد می‌کند', () => {
    expect(
      validateProductMatrixMedia([
        {
          name: 'بژ',
          mediaIds: ['20000000-0000-4000-8000-000000000031'],
          featuredMediaId: '20000000-0000-4000-8000-000000000032',
        },
      ]),
    ).toEqual({
      variantIndex: 0,
      message: 'برای رنگ ۱ («بژ») یک تصویر شاخص انتخاب کنید.',
    });
  });

  it('رنگ دارای گالری و تصویر شاخص را می‌پذیرد', () => {
    expect(
      validateProductMatrixMedia([
        {
          name: 'بژ',
          mediaIds: ['20000000-0000-4000-8000-000000000031'],
          featuredMediaId: '20000000-0000-4000-8000-000000000031',
        },
      ]),
    ).toBeNull();
  });
});
