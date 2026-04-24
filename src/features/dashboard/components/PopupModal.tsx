import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PopupModalProps {
  message: string | null;
  onClose: () => void;
}

export const PopupModal: React.FC<PopupModalProps> = ({
  message,
  onClose,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!message || typeof document === 'undefined') {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirstControl = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusRoot = modalRef.current;

      if (!focusRoot) {
        return;
      }

      const focusableElements = Array.from(
        focusRoot.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !focusRoot.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFirstControl);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElementRef.current?.focus();
    };
  }, [message, onClose]);

  if (!message || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <div
        ref={modalRef}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="dashboard-glass-popup relative z-10 w-full max-w-[380px] rounded-2xl border border-white/20 p-6 text-center popup-enter"
        role="dialog"
      >
        <button
          ref={closeButtonRef}
          aria-label="Close notice dialog"
          className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white/80 p-1.5 text-slate-500 transition-colors hover:border-primary/20 hover:text-primary"
          type="button"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <span className="material-symbols-outlined icon-filled mb-3 text-4xl text-primary">
          lock
        </span>
        <h3
          id={titleId}
          className="mb-2 text-lg font-bold text-slate-900"
        >
          Exclusive Access
        </h3>
        <p
          id={descriptionId}
          className="mb-5 text-sm leading-relaxed text-slate-600"
        >
          {message}
        </p>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="animate-agui absolute bottom-0 left-0 top-0 w-[30%] rounded-full bg-primary" />
        </div>
        <button
          className="mt-5 w-full rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          type="button"
          onClick={onClose}
        >
          Dismiss
        </button>
      </div>
    </div>,
    document.body,
  );
};
