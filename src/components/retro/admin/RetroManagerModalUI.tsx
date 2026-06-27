'use client';

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react';
import { RetroIcon } from '../RetroIcon';
import type { RetroIconName } from '../../../assets/icons/win98/registry';

export function RetroModalIntro({
  children,
  compact,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'retro-manager-modal__intro retro-manager-modal__intro--compact'
          : 'retro-manager-modal__intro'
      }
    >
      {children}
    </div>
  );
}

export function RetroModalText({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <p className={muted ? 'retro-manager-modal__text retro-manager-modal__text--muted' : 'retro-manager-modal__text'}>
      {children}
    </p>
  );
}

export function RetroModalHighlight({ children }: { children: ReactNode }) {
  return <p className="retro-manager-modal__highlight">{children}</p>;
}

export function RetroModalActions({
  children,
  center,
}: {
  children: ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={
        center
          ? 'retro-manager-modal__actions retro-manager-modal__actions--center'
          : 'retro-manager-modal__actions'
      }
    >
      {children}
    </div>
  );
}

type RetroModalBtnVariant = 'primary' | 'secondary' | 'danger';

export function RetroModalBtn({
  variant = 'primary',
  block,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: RetroModalBtnVariant;
  block?: boolean;
}) {
  const classes = [
    'retro-manager-btn',
    `retro-manager-btn--${variant}`,
    block ? 'retro-manager-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

export function RetroModalField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="retro-manager-modal__field">
      <label className="retro-manager-modal__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function RetroModalInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="retro-manager-modal__input" {...props} />;
}

export function RetroModalTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="retro-manager-modal__textarea" {...props} />;
}

export function RetroModalSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="retro-manager-modal__select" {...props} />;
}

export function RetroModalForm({ children }: { children: ReactNode }) {
  return <div className="retro-manager-modal__form">{children}</div>;
}

export function RetroModalBanner({
  children,
  variant = 'success',
  icon = 'communication/msg_information',
}: {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'info';
  icon?: RetroIconName;
}) {
  return (
    <div className={`retro-manager-modal__banner retro-manager-modal__banner--${variant}`}>
      <RetroIcon name={icon} size={16} alt="" />
      <span>{children}</span>
    </div>
  );
}

export function RetroModalMessagePanel({
  children,
  onCopy,
}: {
  children: ReactNode;
  onCopy: () => void | Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [pressing, setPressing] = useState(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    setPressing(true);
    if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
    pressTimeoutRef.current = setTimeout(() => setPressing(false), 150);

    try {
      await onCopy();
      setCopied(true);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setCopied(false), 2800);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  }, [onCopy]);

  return (
    <div className="retro-manager-modal__message-wrap">
      <div className="retro-manager-modal__copy-toolbar">
        <button
          type="button"
          className={[
            'retro-manager-modal__copy-btn',
            pressing ? 'retro-manager-modal__copy-btn--pressed' : '',
            copied ? 'retro-manager-modal__copy-btn--done' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={handleCopy}
          title="Copiar mensaje"
        >
          <RetroIcon
            name={copied ? 'communication/msg_information' : 'misc/diskettes_copy'}
            size={16}
            alt=""
          />
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
        <span
          className={`retro-manager-modal__copy-feedback${copied ? ' retro-manager-modal__copy-feedback--visible' : ''}`}
          role="status"
          aria-live="polite"
        >
          Mensaje copiado exitosamente
        </span>
      </div>
      <div className="retro-manager-modal__message-box">{children}</div>
    </div>
  );
}

export function RetroModalAlertCenter({
  icon = 'communication/msg_warning',
  children,
  actionLabel,
  onAction,
}: {
  icon?: RetroIconName;
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="retro-manager-modal__alert-center">
      <div className="retro-manager-modal__alert-icon">
        <RetroIcon name={icon} size={24} alt="" />
      </div>
      <div className="retro-manager-modal__alert-text">{children}</div>
      <RetroModalBtn variant="primary" onClick={onAction}>
        {actionLabel}
      </RetroModalBtn>
    </div>
  );
}

export function RetroModalDivider() {
  return <hr className="retro-manager-modal__divider" />;
}
