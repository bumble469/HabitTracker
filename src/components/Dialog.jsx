import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/** Native modal foundation: background inertness, focus containment and Escape. */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className = '',
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`dialog ${className}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const focusable = [
          ...event.currentTarget.querySelectorAll(
            'a[href], button, input, textarea, select, summary, [tabindex]'
          ),
        ].filter(
          (element) =>
            !element.disabled &&
            element.tabIndex >= 0 &&
            element.getClientRects().length > 0
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-surface">
        <div className="dialog-heading">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && (
              <p id={descriptionId} className="muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
