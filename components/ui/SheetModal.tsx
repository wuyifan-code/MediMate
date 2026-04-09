import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface SheetModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
  side?: 'center' | 'bottom';
}

export const SheetModal: React.FC<SheetModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClassName = 'max-w-xl',
  side = 'center',
}) => {
  const isBottomSheet = side === 'bottom';

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close overlay"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-lg"
          />

          <motion.div
            initial={isBottomSheet ? { y: 40, opacity: 0 } : { y: 18, scale: 0.98, opacity: 0 }}
            animate={isBottomSheet ? { y: 0, opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
            exit={isBottomSheet ? { y: 24, opacity: 0 } : { y: 12, scale: 0.985, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full ${maxWidthClassName} overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 ${isBottomSheet ? 'mt-auto sm:mt-0' : ''}`}
          >
            <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {title ? <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2> : null}
                  {description ? <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
            {footer ? <div className="border-t border-slate-200/80 px-5 py-4 dark:border-slate-800">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
