import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

/** Switch for "Strip Metadata" (removes title, GPS, camera info, etc.). */
export default function StripMetadataToggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="glass group flex w-full max-w-md items-center gap-4 rounded-2xl px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-glow disabled:opacity-60"
    >
      <ShieldCheck
        size={22}
        aria-hidden
        className={checked ? 'text-brand-cool' : 'text-white/50'}
      />
      <span className="flex-1">
        <span className="block font-semibold">Strip metadata</span>
        <span className="block text-xs text-white/60">
          Remove location, camera and title tags from the result.
        </span>
      </span>
      <span
        aria-hidden
        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          checked ? 'justify-end bg-brand' : 'justify-start bg-white/15'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="h-5 w-5 rounded-full bg-white shadow"
        />
      </span>
    </button>
  );
}
