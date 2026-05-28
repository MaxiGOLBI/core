import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Module-level singleton — no Context needed
const listeners = new Set();
const _toasts = [];
let _nextId = 1;

export function showToast(message, type = 'error', duration = 5000) {
  const id = _nextId++;
  _toasts.push({ id, message, type });
  listeners.forEach((fn) => fn([..._toasts]));
  setTimeout(() => {
    const idx = _toasts.findIndex((t) => t.id === id);
    if (idx !== -1) _toasts.splice(idx, 1);
    listeners.forEach((fn) => fn([..._toasts]));
  }, duration);
}

const TYPE_STYLES = {
  error:   'bg-red-600 text-white',
  success: 'bg-emerald-600 text-white',
  info:    'bg-slate-700 text-white',
  warning: 'bg-amber-500 text-white',
};

const TYPE_ICONS = {
  error: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  success: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

export function ToastContainer() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fn = (list) => setItems(list);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  if (items.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${TYPE_STYLES[t.type] ?? TYPE_STYLES.info}`}
        >
          {TYPE_ICONS[t.type]}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => {
              const idx = _toasts.findIndex((x) => x.id === t.id);
              if (idx !== -1) _toasts.splice(idx, 1);
              listeners.forEach((fn) => fn([..._toasts]));
            }}
            className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
