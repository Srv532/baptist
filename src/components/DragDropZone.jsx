import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, FileAudio, FileImage, FileVideo, UploadCloud } from 'lucide-react';
import { AUDIO, IMAGE, VIDEO, formatBytes } from '../engine/SmartFormatEngine.js';

const ICONS = { [VIDEO]: FileVideo, [AUDIO]: FileAudio, [IMAGE]: FileImage };

const IDLE_SHADOW = '0 0 0 1px rgba(139,92,246,0.25), 0 0 24px rgba(139,92,246,0.10)';
const HOT_SHADOW = [
  '0 0 0 2px rgba(196,181,253,0.9), 0 0 30px rgba(139,92,246,0.45)',
  '0 0 0 2px rgba(34,211,238,0.9), 0 0 60px rgba(34,211,238,0.55)',
  '0 0 0 2px rgba(196,181,253,0.9), 0 0 30px rgba(139,92,246,0.45)',
];

/**
 * Drop target. Pulses and glows while a file is dragged over it. Also works
 * with the keyboard and with a normal file picker.
 */
export default function DragDropZone({ file, category, onFile, disabled }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const Icon = ICONS[category] ?? Archive;

  const take = (list) => {
    const picked = list?.[0];
    if (picked && !disabled) onFile(picked);
  };

  return (
    <motion.div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drop a file here or press Enter to choose one"
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!disabled) inputRef.current?.click();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      animate={over ? { scale: 1.02, boxShadow: HOT_SHADOW } : { scale: 1, boxShadow: IDLE_SHADOW }}
      transition={
        over
          ? {
              scale: { type: 'spring', stiffness: 300, damping: 20 },
              boxShadow: { duration: 1.2, repeat: Infinity },
            }
          : { duration: 0.3 }
      }
      className={`glass relative flex min-h-56 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-dashed p-8 text-center outline-none focus-visible:ring-2 focus-visible:ring-brand-glow ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = ''; // allow picking the same file again
        }}
      />
      <motion.div
        animate={over ? { y: [0, -8, 0] } : { y: 0 }}
        transition={over ? { duration: 0.9, repeat: Infinity } : { duration: 0.2 }}
        className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-cool text-white shadow-lg shadow-brand/40"
      >
        {file ? <Icon size={30} aria-hidden /> : <UploadCloud size={30} aria-hidden />}
      </motion.div>
      {file ? (
        <>
          <p className="max-w-full break-all text-lg font-semibold">{file.name}</p>
          <p className="text-sm text-white/60">
            {category} · {formatBytes(file.size)} · click or drop to replace
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">
            {over ? 'Release to load it' : 'Drop a file here'}
          </p>
          <p className="text-sm text-white/60">
            or click to browse. Nothing is uploaded: it all happens on your device.
          </p>
        </>
      )}
    </motion.div>
  );
}
