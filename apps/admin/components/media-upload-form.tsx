'use client';

import Image from 'next/image';
import { useActionState, useEffect, useState } from 'react';
import { uploadMediaAction, type ActionState } from '../app/actions';

const initialState: ActionState = { status: 'idle', message: '' };

export function MediaUploadForm() {
  const [state, action, pending] = useActionState(uploadMediaAction, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [attachColor, setAttachColor] = useState(true);

  useEffect(
    () => () => {
      if (preview !== null) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <form className="media-upload-form" action={action}>
      {state.status === 'error' ? (
        <div className="form-error" role="alert">
          {state.message}
        </div>
      ) : null}
      <div className="media-upload-layout">
        <label className="media-drop-field">
          <span>فایل تصویر</span>
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (preview !== null) URL.revokeObjectURL(preview);
              setPreview(file ? URL.createObjectURL(file) : null);
              setFileName(file?.name ?? '');
              setDimensions('');
            }}
          />
          {preview ? (
            <span className="media-upload-preview">
              <Image
                src={preview}
                alt="پیش‌نمایش فایل انتخاب‌شده"
                fill
                unoptimized
                sizes="320px"
                onLoad={(event) => {
                  setDimensions(
                    `${event.currentTarget.naturalWidth.toLocaleString('fa-IR')} × ${event.currentTarget.naturalHeight.toLocaleString('fa-IR')}`,
                  );
                }}
              />
            </span>
          ) : (
            <span className="media-upload-placeholder">JPEG، PNG یا WebP تا ۱۰ مگابایت</span>
          )}
          {fileName ? (
            <small>
              <bdi dir="ltr">{fileName}</bdi>
              {dimensions ? ` · ${dimensions}` : ''}
            </small>
          ) : null}
        </label>
        <div className="media-upload-fields">
          <label>
            متن جایگزین
            <textarea name="alt" rows={3} minLength={1} maxLength={500} required />
          </label>
          <label>
            گروه
            <select name="group" defaultValue="product_images">
              <option value="product_images">تصاویر محصول</option>
              <option value="outfit_editorial">تصاویر ست</option>
              <option value="homepage">صفحهٔ اصلی</option>
              <option value="journal">ژورنال</option>
              <option value="shared_assets">دارایی مشترک</option>
            </select>
          </label>
          <label className="media-color-toggle">
            <input
              name="attachColor"
              type="checkbox"
              checked={attachColor}
              onChange={(event) => {
                setAttachColor(event.target.checked);
              }}
            />
            رنگ به تصویر متصل شود
          </label>
          <label>
            رنگ تصویر
            <input name="colorHex" type="color" defaultValue="#d4c2a8" disabled={!attachColor} />
          </label>
          <div className="inline-fields">
            <label>
              نقطهٔ کانونی X
              <input
                name="focalPointX"
                type="number"
                min={0}
                max={1}
                step={0.01}
                defaultValue={0.5}
              />
            </label>
            <label>
              نقطهٔ کانونی Y
              <input
                name="focalPointY"
                type="number"
                min={0}
                max={1}
                step={0.01}
                defaultValue={0.5}
              />
            </label>
          </div>
          <button className="admin-primary" type="submit" disabled={pending}>
            {pending ? 'در حال بارگذاری…' : 'بارگذاری و افزودن به کتابخانه'}
          </button>
        </div>
      </div>
    </form>
  );
}
