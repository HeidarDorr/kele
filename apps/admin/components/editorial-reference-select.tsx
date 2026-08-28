'use client';

import { useId, useMemo, useState } from 'react';
import {
  filterReferenceOptions,
  type EditorialReferenceOption,
} from './editorial-reference-search';

export function EditorialReferenceSelect({
  name,
  label,
  searchLabel,
  options,
  defaultValues,
}: {
  name: string;
  label: string;
  searchLabel: string;
  options: EditorialReferenceOption[];
  defaultValues: string[];
}) {
  const fieldId = useId();
  const [query, setQuery] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => [...new Set(defaultValues)]);
  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );
  const visibleOptions = useMemo(
    () =>
      filterReferenceOptions(
        options.filter((option) => !selectedIds.includes(option.id)),
        query,
      ),
    [options, query, selectedIds],
  );
  const activeCandidateId = visibleOptions.some((option) => option.id === candidateId)
    ? candidateId
    : (visibleOptions[0]?.id ?? '');

  function moveSelected(id: string, offset: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const currentValue = next[index];
      const targetValue = next[target];
      if (currentValue === undefined || targetValue === undefined) return current;
      next[index] = targetValue;
      next[target] = currentValue;
      return next;
    });
  }

  return (
    <div className="editorial-reference-select">
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <div className="editorial-reference-toolbar">
        <label htmlFor={`${fieldId}-search`}>
          {searchLabel}
          <input
            id={`${fieldId}-search`}
            type="search"
            value={query}
            placeholder="نام یا نامک را بنویسید"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
        <label htmlFor={`${fieldId}-select`}>
          {label}
          <select
            id={`${fieldId}-select`}
            value={activeCandidateId}
            disabled={visibleOptions.length === 0}
            onChange={(event) => {
              setCandidateId(event.target.value);
            }}
          >
            {visibleOptions.length === 0 ? (
              <option value="">مورد دیگری پیدا نشد</option>
            ) : (
              visibleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.meta ? ` — ${option.meta}` : ''}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          className="admin-secondary editorial-reference-add"
          type="button"
          disabled={!activeCandidateId}
          onClick={() => {
            if (!activeCandidateId) return;
            setSelectedIds((current) => [...current, activeCandidateId]);
            setCandidateId('');
            setQuery('');
          }}
        >
          افزودن
        </button>
      </div>
      <div className="editorial-reference-selection" aria-live="polite">
        <div>
          <strong>انتخاب‌های فعلی</strong>
          <span>{selectedIds.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        {selectedIds.length === 0 ? (
          <p>هنوز موردی برای نمایش در صفحهٔ خانه انتخاب نشده است.</p>
        ) : (
          <ol>
            {selectedIds.map((id, index) => {
              const option = optionsById.get(id);
              return (
                <li key={id}>
                  <span>
                    <strong>{option?.label ?? 'ارجاع ذخیره‌شده'}</strong>
                    <small dir="ltr">{option?.meta ?? id}</small>
                  </span>
                  <div className="editorial-reference-actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label={`انتقال ${option?.label ?? id} به بالاتر`}
                      onClick={() => {
                        moveSelected(id, -1);
                      }}
                    >
                      بالاتر
                    </button>
                    <button
                      type="button"
                      disabled={index === selectedIds.length - 1}
                      aria-label={`انتقال ${option?.label ?? id} به پایین‌تر`}
                      onClick={() => {
                        moveSelected(id, 1);
                      }}
                    >
                      پایین‌تر
                    </button>
                    <button
                      type="button"
                      aria-label={`حذف ${option?.label ?? id} از انتخاب‌ها`}
                      onClick={() => {
                        setSelectedIds((current) => current.filter((value) => value !== id));
                      }}
                    >
                      حذف
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <small className="editorial-reference-help">
        ترتیب این فهرست، ترتیب نمایش در صفحهٔ خانه است. فقط موارد منتشرشده قابل انتخاب‌اند.
      </small>
    </div>
  );
}
