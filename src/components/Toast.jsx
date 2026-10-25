import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

/** Error toast: bottom of the screen, auto-dismisses after 8 seconds. */
export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-red-400/40 bg-red-950/80 p-4 shadow-2xl shadow-red-900/40 backdrop-blur-xl"
        >
          <AlertTriangle size={20} aria-hidden className="mt-0.5 shrink-0 text-red-300" />
          <p className="flex-1 text-sm">{message}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="text-white/70 hover:text-white"
          >
            <X size={18} aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
