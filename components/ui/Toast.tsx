"use client";
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "default";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "bg-[#00C471] text-white",
  error:   "bg-[#F04452] text-white",
  info:    "bg-[#3182F6] text-white",
  default: "bg-[#1d1d1f] text-white",
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  default: "",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, type: ToastType = "default") => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-28 left-0 right-0 z-[99999] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`animate-slide-up px-5 py-3 rounded-2xl text-[14px] font-semibold flex items-center gap-2 pointer-events-auto ${TYPE_STYLES[t.type]}`}
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            {TYPE_ICONS[t.type] && (
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold shrink-0">
                {TYPE_ICONS[t.type]}
              </span>
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
