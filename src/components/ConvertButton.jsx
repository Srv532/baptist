import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

/**
 * Glowing button that morphs into a progress bar while converting, then into
 * a "done" state. `status`: 'idle' | 'running' | 'done'.
 */
export default function ConvertButton({ status, progress, disabled, onClick, onReset }) {
  const running = status === 'running';
  const done = status === 'done';
  const pct = Math.round(progress * 100);

  return (
    <motion.button
      type="button"
      layout
      disabled={disabled || running}
      onClick={done ? onReset : onClick}
      role={running ? 'progressbar' : undefined}
      aria-valuemin={running ? 0 : undefined}
      aria-valuemax={running ? 100 : undefined}
      aria-valuenow={running ? pct : undefined}
      aria-label={running ? 'Converting' : undefined}
      animate={{
        width: running ? '100%' : 'min(100%, 18rem)',
        borderRadius: running ? 14 : 9999,
        boxShadow: disabled
          ? '0 0 0 rgba(0,0,0,0)'
          : running
            ? '0 0 22px rgba(34,211,238,0.35)'
            : [
                '0 0 20px rgba(139,92,246,0.45)',
                '0 0 42px rgba(244,114,182,0.6)',
                '0 0 20px rgba(139,92,246,0.45)',
              ],
      }}
      transition={{
        layout: { type: 'spring', stiffness: 220, damping: 26 },
        width: { type: 'spring', stiffness: 220, damping: 26 },
        borderRadius: { duration: 0.35 },
        boxShadow: running || disabled ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity },
      }}
      whileHover={disabled || running ? undefined : { scale: 1.04 }}
      whileTap={disabled || running ? undefined : { scale: 0.96 }}
      className="relative mx-auto block h-14 overflow-hidden bg-white/10 font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-brand-glow disabled:cursor-not-allowed"
    >
      {/* Idle / done background */}
      <motion.span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-brand via-brand-hot to-brand-cool"
        animate={{ opacity: disabled && !running ? 0.25 : running ? 0.12 : 1 }}
      />
      {/* Progress fill */}
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand to-brand-cool"
        initial={false}
        animate={{ width: running ? `${pct}%` : '0%' }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
      />
      <span className="relative flex h-full items-center justify-center gap-2 px-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {running ? (
              <>Converting… {pct}%</>
            ) : done ? (
              <>
                <CheckCircle2 size={20} aria-hidden /> Done. Convert another
              </>
            ) : (
              <>
                <Sparkles size={20} aria-hidden /> Convert
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
