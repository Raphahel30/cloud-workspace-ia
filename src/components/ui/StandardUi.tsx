import type { ReactNode } from 'react';

export type BadgeTone =
  | 'cyan'
  | 'teal'
  | 'blue'
  | 'amber'
  | 'red'
  | 'muted';

export interface CwPanelProps {
  overline?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}

/** Standardized operations-center panel aligned with the dark graphite & cyan isometric office palette. */
export function CwPanel({
  overline,
  title,
  subtitle,
  actions,
  children,
  className = '',
  testId,
}: CwPanelProps) {
  return (
    <section className={`cw-panel ${className}`.trim()} data-testid={testId}>
      <header className="cw-panel-head">
        <div>
          {overline ? <p className="overline">{overline}</p> : null}
          <h2 className="cw-panel-title">{title}</h2>
          {subtitle ? <p className="cw-panel-sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="cw-panel-actions">{actions}</div> : null}
      </header>
      <div className="cw-panel-body">{children}</div>
    </section>
  );
}

export interface CwStatCardProps {
  icon: string;
  tone: Exclude<BadgeTone, 'muted'>;
  label: string;
  value: string | number;
  hint?: string;
}

/** Compact metric card with fixed dark surface and consistent status accent. */
export function CwStatCard({ icon, tone, label, value, hint }: CwStatCardProps) {
  return (
    <div className="cw-stat-card">
      <span className={`cw-stat-icon tone-${tone}`} aria-hidden="true">
        {icon}
      </span>
      <div className="cw-stat-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}

export function CwStatusBadge({
  tone,
  label,
  pulse = false,
}: {
  tone: BadgeTone;
  label: string;
  pulse?: boolean;
}) {
  return (
    <span className={`cw-badge tone-${tone}`}>
      <i className={pulse ? 'is-pulsing' : ''} aria-hidden="true" />
      {label}
    </span>
  );
}

export function CwButton({
  variant = 'secondary',
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
  children,
  testId,
}: {
  variant?: 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`cw-btn variant-${variant} size-${size}`}
    >
      {children}
    </button>
  );
}

export function CwProgressBar({
  label,
  valuePercent,
  detail,
  tone = 'cyan',
}: {
  label: string;
  valuePercent: number;
  detail: string;
  tone?: 'cyan' | 'amber' | 'red' | 'teal';
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(valuePercent)));
  return (
    <div className="cw-progress">
      <div className="cw-progress-head">
        <span>{label}</span>
        <strong>{detail}</strong>
      </div>
      <div
        className="cw-progress-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={`cw-progress-fill tone-${tone}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function CwNotice({
  tone = 'info',
  title,
  message,
  action,
  role = 'status',
}: {
  tone?: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  action?: ReactNode;
  role?: 'status' | 'note';
}) {
  return (
    <div className={`cw-notice tone-${tone}`} role={role}>
      <div className="cw-notice-copy">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {action ? <div className="cw-notice-action">{action}</div> : null}
    </div>
  );
}

export function CwModal({
  open,
  title,
  overline,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  overline?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="cw-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cw-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cw-modal-head">
          <div>
            {overline ? <p className="overline">{overline}</p> : null}
            <h3>{title}</h3>
          </div>
          <button type="button" className="cw-modal-close" aria-label="Fechar janela" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="cw-modal-body">{children}</div>
        {footer ? <footer className="cw-modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function CwEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="cw-empty">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
