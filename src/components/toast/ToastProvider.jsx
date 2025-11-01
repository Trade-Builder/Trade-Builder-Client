import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback((toast) => {
    const id = ++idSeq;
    const duration = typeof toast.duration === 'number' ? toast.duration : 3000;
    const payload = {
      id,
      title: toast.title || null,
      message: toast.message || String(toast),
      variant: toast.variant || 'info', // 'info' | 'success' | 'warning' | 'error'
    };
    setToasts((prev) => [...prev, payload]);
    const tm = setTimeout(() => remove(id), duration);
    timersRef.current.set(id, tm);
    return id;
  }, [remove]);

  const api = useMemo(() => ({
    show,
    info: (message, opts = {}) => show({ message, variant: 'info', ...opts }),
    success: (message, opts = {}) => show({ message, variant: 'success', ...opts }),
    warning: (message, opts = {}) => show({ message, variant: 'warning', ...opts }),
    error: (message, opts = {}) => show({ message, variant: 'error', ...opts }),
    remove,
  }), [show, remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed right-5 bottom-5 z-[2000] flex flex-col-reverse gap-2 pointer-events-none select-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

function variantStyles(variant) {
  switch (variant) {
    case 'success':
      return 'border-emerald-500/50';
    case 'warning':
      return 'border-amber-500/50';
    case 'error':
      return 'border-red-500/50';
    default:
      return 'border-cyan-500/40';
  }
}

function iconByVariant(variant) {
  switch (variant) {
    case 'success':
      return '✓';
    case 'warning':
      return '⚠';
    case 'error':
      return '⨯';
    default:
      return 'ℹ';
  }
}

function ToastItem({ toast, onClose }) {
  const { title, message, variant } = toast;
  return (
    <div
      className={`toast-slide-in pointer-events-auto min-w-[260px] max-w-[420px] px-4 py-3 rounded-xl shadow-2xl border ${variantStyles(variant)}`}
      style={{ background: 'var(--panel-bg)', color: 'var(--text-primary)', borderColor: 'var(--panel-border)' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="text-lg opacity-80">{iconByVariant(variant)}</div>
        <div className="flex-1">
          {title ? <div className="font-semibold mb-0.5" style={{color:'var(--text-primary)'}}>{title}</div> : null}
          <div className="text-sm" style={{color:'var(--text-primary)'}}>{message}</div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 text-sm opacity-70 hover:opacity-100"
          style={{color:'var(--text-primary)'}}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
