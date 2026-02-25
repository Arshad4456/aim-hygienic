"use client";

import { useEffect, useRef, useState } from "react";

const TOAST_STYLE = {
  pending: { icon: "◌", bar: "linear-gradient(90deg,#4ade80,#22d3ee,#a78bfa,#f43f5e)", tone: "text-zinc-600" },
  success: { icon: "✅", bar: "#22c55e", tone: "text-zinc-700" },
  error: { icon: "⛔", bar: "#ef4444", tone: "text-zinc-700" },
  warn: { icon: "⚠️", bar: "#eab308", tone: "text-zinc-700" },
  info: { icon: "ℹ️", bar: "#3b82f6", tone: "text-zinc-700" },
  plain: { icon: "", bar: "linear-gradient(90deg,#4ade80,#22d3ee,#a78bfa,#f43f5e)", tone: "text-zinc-700" },
};

export function ToastStack({ items, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-[80] w-[360px] max-w-[calc(100vw-1rem)] space-y-3">
      {items.map((toast) => {
        const style = TOAST_STYLE[toast.type] || TOAST_STYLE.info;
        return (
          <div key={toast.id} className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
            <div className="flex items-center gap-3 px-4 py-4 text-[18px] leading-none">
              <span className="w-6 text-center text-zinc-500">{toast.icon ?? style.icon}</span>
              <p className={`flex-1 text-base ${style.tone}`}>{toast.message}</p>
              <button
                type="button"
                className="text-zinc-400 transition hover:text-zinc-600"
                onClick={() => onClose(toast.id)}
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>
            <div className="h-1" style={{ background: toast.bar || style.bar }} />
          </div>
        );
      })}
    </div>
  );
}

export function useToastStack(limit = 6) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  function closeToast(id) {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((state) => state.filter((t) => t.id !== id));
  }

  function addToast(message, type = "info", sticky = false, icon) {
    const id = crypto.randomUUID();
    setToasts((state) => [{ id, message, type, icon }, ...state].slice(0, limit));

    if (!sticky) {
      const timer = setTimeout(() => closeToast(id), 3200);
      timers.current.set(id, timer);
    }

    return id;
  }

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, []);

  return { toasts, addToast, closeToast };
}
