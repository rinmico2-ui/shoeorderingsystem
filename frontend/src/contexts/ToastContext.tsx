import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, X, AlertCircle } from 'lucide-react'

type Toast = { id: number; message: string; kind: 'success' | 'error' | 'info' }
const ToastCtx = createContext<(message: string, kind?: Toast['kind']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const push = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-2), { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}
              className="pointer-events-auto flex max-w-md items-center gap-2 rounded-md bg-brand-charcoal px-4 py-3 text-sm text-white shadow-card">
              {t.kind === 'success' ? <CheckCircle2 size={18} className="shrink-0 text-emerald-300" /> : t.kind === 'error' ? <AlertCircle size={18} className="shrink-0 text-red-300" /> : null}
              <span>{t.message}</span>
              <button aria-label="Dismiss" className="ml-2 rounded p-1 hover:bg-white/10" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><X size={16} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() { return useContext(ToastCtx) }
