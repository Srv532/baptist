import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import DragDropZone from './components/DragDropZone.jsx';
import AnimatedFormatGrid from './components/AnimatedFormatGrid.jsx';
import ConvertButton from './components/ConvertButton.jsx';
import StripMetadataToggle from './components/StripMetadataToggle.jsx';
import Toast from './components/Toast.jsx';
import { convertFile } from './engine/converter.js';
import { MAX_FILE_BYTES, categorize, getOutputs } from './engine/SmartFormatEngine.js';

/**
 * Production only: block right-click and the usual DevTools / view-source
 * shortcuts. This is a speed bump, not real protection: anyone determined can
 * still open DevTools from the browser menu.
 */
function blockInspect(event) {
  if (event.type === 'contextmenu') {
    event.preventDefault();
    return;
  }
  const key = event.key?.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;
  const blocked =
    event.key === 'F12' ||
    (mod && event.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
    (mod && event.altKey && (key === 'i' || key === 'j' || key === 'u')) ||
    (mod && key === 'u');
  if (blocked) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/** Save a Blob to disk, then free it shortly afterwards. */
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function App() {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState(null);
  const [format, setFormat] = useState(null);
  const [strip, setStrip] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | running | done
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const busy = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;
    document.addEventListener('contextmenu', blockInspect);
    document.addEventListener('keydown', blockInspect, true);
    return () => {
      document.removeEventListener('contextmenu', blockInspect);
      document.removeEventListener('keydown', blockInspect, true);
    };
  }, []);

  const onFile = useCallback((picked) => {
    if (busy.current) return;
    if (picked.size > MAX_FILE_BYTES) {
      setError(
        'That file is larger than 2 GB. Baptist blocks it so your browser tab does not run out of memory.',
      );
      return;
    }
    const next = categorize(picked);
    setError('');
    setFile(picked);
    setCategory(next);
    setFormat(getOutputs(next)[0].id);
    setStatus('idle');
    setProgress(0);
  }, []);

  const onConvert = async () => {
    if (!file || !format || busy.current) return;
    busy.current = true;
    const config = { name: file.name, size: file.size, category, format, stripMetadata: strip };
    console.log('[Baptist] converting with config', config);
    setError('');
    setProgress(0);
    setStatus('running');
    try {
      const { blob, name } = await convertFile({
        file,
        category,
        format,
        stripMetadata: strip,
        onProgress: setProgress,
      });
      download(blob, name);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.');
      setStatus('idle');
    } finally {
      busy.current = false;
    }
  };

  const running = status === 'running';

  return (
    <MotionConfig reducedMotion="user">
      <div className="aurora" aria-hidden />
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center gap-8 px-4 py-12 sm:py-16">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-5xl font-black tracking-tighter sm:text-6xl">
            <span className="mr-2 inline-grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-cool align-middle text-3xl sm:h-14 sm:w-14">
              B
            </span>
            Baptist
          </h1>
          <p className="mt-3 text-white/70">Convert any file, right in your browser.</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-brand-glow">
            <Lock size={14} aria-hidden /> Your files never leave your device.
          </p>
        </motion.header>

        <DragDropZone file={file} category={category} onFile={onFile} disabled={running} />
        <AnimatedFormatGrid
          category={category}
          selected={format}
          onSelect={setFormat}
          disabled={running}
        />
        <StripMetadataToggle checked={strip} onChange={setStrip} disabled={running} />
        <div className="w-full">
          <ConvertButton
            status={status}
            progress={progress}
            disabled={!file || !format}
            onClick={onConvert}
            onReset={() => {
              setStatus('idle');
              setProgress(0);
            }}
          />
        </div>
      </main>
      <Toast message={error} onClose={() => setError('')} />
    </MotionConfig>
  );
}
