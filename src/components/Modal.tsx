'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export default function Modal({ isOpen, onClose, title, children, triggerRef, className }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const windowCenter = typeof window !== 'undefined' 
    ? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    : { x: 0, y: 0 };

  const initial = origin ? {
    opacity: 0,
    scale: 0,
    x: origin.x - windowCenter.x,
    y: origin.y - windowCenter.y,
  } : { opacity: 0, scale: 0.95, y: 20 };

  const exit = origin ? {
    opacity: 0,
    scale: 0,
    x: origin.x - windowCenter.x,
    y: origin.y - windowCenter.y,
    transition: { duration: 0.8, ease: "easeInOut" as const }
  } : { opacity: 0, scale: 0.95, y: 20 };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            ref={modalRef}
            className={`relative bg-[#030712]/90 border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] w-full max-h-[90vh] overflow-y-auto flex flex-col ${className || 'max-w-2xl'}`}
            onClick={(e) => e.stopPropagation()}
            initial={initial}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
              transition: { type: "spring", duration: 1.2, bounce: 0.25 }
            }}
            exit={exit}
          >
            <div className="relative z-10 flex justify-between items-center p-6 border-b border-cyan-900/30 bg-cyan-950/10 shrink-0">
              <h2 className="text-xl font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_5px_#06b6d4]"></span>
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-cyan-700 hover:text-cyan-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
