import { useEffect, useState } from 'react';
import { CheckIcon } from './icons';

interface GalleryShareModalProps {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string, author: string, description: string) => Promise<boolean>;
  variant?: 'gallery' | 'theme';
  darkMode?: boolean;
}

export default function GalleryShareModal({
  open,
  initialName,
  onClose,
  onSubmit,
  variant = 'theme',
  darkMode = false,
}: GalleryShareModalProps) {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setAuthor('');
    setDescription('');
    setSubmitting(false);
    setSuccess(false);
  }, [open, initialName]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const useGalleryVariant = variant === 'gallery';
  const panelClassName = useGalleryVariant
    ? `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] p-6 rounded-lg shadow-xl w-[90vw] max-w-[400px] animate-fade-in ${darkMode ? 'bg-gray-900 text-white border border-white/20' : 'bg-white text-gray-900 border border-gray-200'}`
    : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] p-6 rounded-theme shadow-theme w-[90vw] max-w-[400px] animate-fade-in bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border';
  const inputClassName = useGalleryVariant
    ? `w-full px-3 py-2 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`
    : 'w-full px-3 py-2 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background text-theme-ink';
  const textareaClassName = useGalleryVariant
    ? `w-full px-3 py-2 rounded border resize-none ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`
    : 'w-full px-3 py-2 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background text-theme-ink resize-none';
  const cancelButtonClassName = useGalleryVariant
    ? `${darkMode ? 'bg-black text-white border border-white/30 hover:bg-white/10' : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'} px-4 py-2 rounded transition-colors`
    : 'px-4 py-2 rounded-button bg-theme-background text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors';
  const helperTextClassName = useGalleryVariant
    ? `${darkMode ? 'text-gray-200' : 'text-gray-700'}`
    : 'text-theme-muted';

  const handleClose = () => {
    onClose();
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !author.trim() || !description.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    const submitted = await onSubmit(name.trim(), author.trim(), description.trim());
    if (submitted) {
      setSuccess(true);
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] animate-fade-in" onClick={handleClose} />
      <div className={panelClassName} role="dialog" aria-modal="true">
        {success ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center">
              <CheckIcon className="w-6 h-6" strokeWidth={3} />
            </div>
            <p className="text-lg font-bold">Submitted!</p>
            <p className={`text-sm mt-2 ${helperTextClassName}`}>Thank you for sharing with the community.</p>
            <p className={`text-sm mt-1 ${helperTextClassName}`}>Your submission will appear in the gallery once it has been reviewed and approved.</p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 rounded-button font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Ok
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold mb-4">Share to Gallery</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for your submission"
                className={inputClassName}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Your Name / Handle</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. @username"
                className={inputClassName}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this is and what it's for..."
                rows={3}
                className={textareaClassName}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleClose} className={cancelButtonClassName}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || !author.trim() || !description.trim() || submitting}
                className="px-4 py-2 rounded-button font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}