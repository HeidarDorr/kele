'use client';

import Image from 'next/image';
import { useId, useState } from 'react';
import type { MediaValue } from '../lib/admin-api';

export function MediaSelect({
  name,
  label,
  media,
  defaultValue,
  required = false,
  allowEmpty = true,
}: {
  name: string;
  label: string;
  media: MediaValue[];
  defaultValue?: string | null | undefined;
  required?: boolean;
  allowEmpty?: boolean;
}) {
  const id = useId();
  const initialValue = defaultValue || (!allowEmpty ? (media[0]?.id ?? '') : '');
  const [value, setValue] = useState(initialValue);
  const selected = media.find((item) => item.id === value);

  return (
    <div className="media-select-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        value={value}
        required={required}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      >
        {allowEmpty ? <option value="">انتخاب نشده</option> : null}
        {media.map((item) => (
          <option value={item.id} key={item.id}>
            {item.alt}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="media-select-preview">
          <span>
            <Image src={selected.url} alt={selected.alt} fill sizes="240px" />
          </span>
          <small>
            {selected.alt}
            {selected.colorHex ? (
              <i
                style={{ backgroundColor: selected.colorHex }}
                aria-label={`رنگ ${selected.colorHex}`}
              />
            ) : null}
          </small>
        </div>
      ) : (
        <small className="media-select-empty">پیش‌نمایشی انتخاب نشده است.</small>
      )}
    </div>
  );
}
