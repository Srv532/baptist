import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { OUTPUTS, VIDEO } from '../engine/SmartFormatEngine.js';
import { cn } from '../lib/cn.js';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const card = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

/**
 * Cascading grid of glass cards. Before a file is dropped it shows four dim
 * placeholders; afterwards ONLY the formats relevant to that file type.
 */
export default function AnimatedFormatGrid({ category, selected, onSelect, disabled }) {
  const outputs = category ? OUTPUTS[category] : OUTPUTS[VIDEO];
  const placeholder = !category;

  return (
    // Changing `key` remounts the grid so the cascade replays for each new file.
    <motion.div
      key={category ?? 'placeholder'}
      variants={container}
      initial="hidden"
      animate="show"
      role="radiogroup"
      aria-label="Output format"
      className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4"
    >
      {outputs.map((o) => {
        const active = !placeholder && selected === o.id;
        return (
          <motion.button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={placeholder || disabled}
            variants={card}
            whileHover={placeholder || disabled ? undefined : { y: -6, scale: 1.03 }}
            whileTap={placeholder || disabled ? undefined : { scale: 0.97 }}
            onClick={() => onSelect(o.id)}
            className={cn(
              'glass relative flex flex-col items-start gap-2 rounded-2xl p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-glow',
              placeholder && 'opacity-40',
              active && 'border-brand-glow bg-brand/20 shadow-[0_0_28px_rgba(139,92,246,0.55)]',
              !placeholder && !active && 'hover:border-white/30',
            )}
          >
            <span className="text-2xl font-extrabold tracking-tight">{o.label}</span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-brand-glow">
              {o.badge}
            </span>
            {active && (
              <Check size={18} aria-hidden className="absolute right-3 top-3 text-brand-cool" />
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
