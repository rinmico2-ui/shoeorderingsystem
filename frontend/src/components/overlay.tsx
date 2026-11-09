import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'

function useEscape(onClose: () => void, open: boolean) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])
}

export function BottomSheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose, open)
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button aria-label="Close" className="absolute inset-0 bg-brand-charcoal/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="safe-bottom absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-white shadow-sheet">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-brand-border" aria-hidden />
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-heading text-base font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close panel" className="touch-target flex items-center justify-center rounded-md hover:bg-brand-ivory"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
            {footer && <div className="border-t border-brand-border px-4 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEscape(onClose, open)
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button aria-label="Close" className="absolute inset-0 bg-brand-charcoal/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.22 }}
            className="safe-bottom relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-sheet sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-base font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close dialog" className="touch-target flex items-center justify-center rounded-md hover:bg-brand-ivory"><X size={20} /></button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.35, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}
