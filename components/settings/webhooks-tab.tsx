'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

// ===========================================
// TYPES
// ===========================================

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  last_status_code: number | null;
  failure_count: number;
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  status: string;
  status_code: number | null;
  error_message: string | null;
  attempts: number;
  created_at: string;
  delivered_at: string | null;
}

interface FormState {
  name: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
}

interface FormErrors {
  name?: string;
  url?: string;
  secret?: string;
  events?: string;
}

interface TestResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

// ===========================================
// CONSTANTS
// ===========================================

const AVAILABLE_EVENTS = [
  {
    value: 'session.completed',
    label: 'Session Completed',
    description: 'Fires when an interview session ends and scoring is complete.',
  },
];

const MAX_WEBHOOKS = 5;

const EMPTY_FORM: FormState = {
  name: '',
  url: '',
  secret: '',
  events: ['session.completed'],
  enabled: true,
};

// ===========================================
// HELPERS
// ===========================================

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Name is required.';
  } else if (form.name.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  if (!form.url.trim()) {
    errors.url = 'URL is required.';
  } else if (
    !form.url.startsWith('https://') &&
    !form.url.startsWith('http://localhost')
  ) {
    errors.url = 'URL must use HTTPS (or http://localhost for testing).';
  } else {
    try {
      new URL(form.url);
    } catch {
      errors.url = 'URL is not a valid URL.';
    }
  }

  if (form.secret && form.secret.length > 0 && form.secret.length < 16) {
    errors.secret = 'Secret must be at least 16 characters.';
  }

  if (form.events.length === 0) {
    errors.events = 'At least one event must be selected.';
  }

  return errors;
}

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// ===========================================
// SUB-COMPONENTS
// ===========================================

function StatusBadge({ webhook }: { webhook: Webhook }): React.JSX.Element {
  if (!webhook.enabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Disabled
      </span>
    );
  }
  if (webhook.failure_count >= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
        <AlertTriangle className="h-3 w-3" />
        {webhook.failure_count} failures
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      Active
    </span>
  );
}

function DeliveryStatusIcon({ status }: { status: string }): React.JSX.Element {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-amber-400 shrink-0" />;
    case 'retrying':
      return <RefreshCw className="h-4 w-4 text-amber-400 shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-slate-400 shrink-0" />;
  }
}

// ===========================================
// DELIVERY HISTORY
// ===========================================

function DeliveryHistory({
  webhookId,
  deliveries,
  loadingDeliveries,
}: {
  webhookId: string;
  deliveries: WebhookDelivery[];
  loadingDeliveries: boolean;
}): React.JSX.Element {
  void webhookId;

  if (loadingDeliveries) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#8B7355] dark:text-slate-500" />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-[#8B7355] dark:text-slate-500">
        No deliveries yet. Send a test to verify your endpoint.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {deliveries.map((d) => (
        <div
          key={d.id}
          className="flex items-start gap-3 rounded-lg border border-[#3D3229]/10 dark:border-slate-700/50 bg-[#FAF8F5] dark:bg-slate-800/30 px-3 py-2.5"
        >
          <DeliveryStatusIcon status={d.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-medium text-[#3D3229] dark:text-slate-200">
                {d.event_type}
              </span>
              {d.status_code && (
                <span
                  className={cn(
                    'text-xs font-mono',
                    d.status_code >= 200 && d.status_code < 300
                      ? 'text-green-400'
                      : 'text-red-400'
                  )}
                >
                  HTTP {d.status_code}
                </span>
              )}
              <span className="text-xs text-[#8B7355] dark:text-slate-500 ml-auto">
                {formatRelative(d.created_at)}
              </span>
            </div>
            {d.error_message && (
              <p className="mt-0.5 text-xs text-red-400 truncate">
                {d.error_message}
              </p>
            )}
            <p className="mt-0.5 text-xs text-[#8B7355] dark:text-slate-500">
              {d.attempts} attempt{d.attempts !== 1 ? 's' : ''}
              {d.delivered_at && ` · Delivered ${formatDate(d.delivered_at)}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================
// WEBHOOK FORM
// ===========================================

function WebhookForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: FormState;
  onSave: (form: FormState) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}): React.JSX.Element {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSecret, setShowSecret] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    await onSave(form);
  };

  const handleGenerateSecret = (): void => {
    const s = generateSecret();
    setForm((f) => ({ ...f, secret: s }));
    setShowSecret(true);
    toast.success('Secret generated — save it somewhere safe, it won\'t be shown again after saving.');
  };

  const handleCopySecret = (): void => {
    void navigator.clipboard.writeText(form.secret);
    toast.success('Secret copied to clipboard.');
  };

  const inputClass =
    'w-full rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/5 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-[#3D3229] dark:text-slate-100 placeholder:text-[#8B7355] dark:placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500';
  const errorInputClass =
    'w-full rounded-lg border border-red-500/50 bg-red-500/5 px-4 py-2.5 text-sm text-[#3D3229] dark:text-slate-100 placeholder:text-[#8B7355] dark:placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500';
  const labelClass =
    'block text-sm font-medium text-[#6B5744] dark:text-slate-300 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="webhook-name" className={labelClass}>
          Name
        </label>
        <input
          id="webhook-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. My Zapier Integration"
          maxLength={100}
          className={errors.name ? errorInputClass : inputClass}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-400">{errors.name}</p>
        )}
      </div>

      {/* URL */}
      <div>
        <label htmlFor="webhook-url" className={labelClass}>
          Endpoint URL
        </label>
        <input
          id="webhook-url"
          type="url"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://your-server.com/webhook"
          className={errors.url ? errorInputClass : inputClass}
        />
        {errors.url ? (
          <p className="mt-1 text-xs text-red-400">{errors.url}</p>
        ) : (
          <p className="mt-1 text-xs text-[#8B7355] dark:text-slate-500">
            Must be HTTPS. Use http://localhost for local testing only.
          </p>
        )}
      </div>

      {/* Secret */}
      <div>
        <label htmlFor="webhook-secret" className={labelClass}>
          Signing Secret{' '}
          <span className="font-normal text-[#8B7355] dark:text-slate-500">
            (optional)
          </span>
        </label>
        <div className="relative">
          <input
            id="webhook-secret"
            type={showSecret ? 'text' : 'password'}
            value={form.secret}
            onChange={(e) =>
              setForm((f) => ({ ...f, secret: e.target.value }))
            }
            placeholder="Minimum 16 characters"
            className={cn(
              errors.secret ? errorInputClass : inputClass,
              'pr-20'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {form.secret && (
              <button
                type="button"
                onClick={handleCopySecret}
                className="rounded p-1.5 text-[#8B7355] dark:text-slate-500 hover:text-[#3D3229] dark:hover:text-white transition-colors"
                title="Copy secret"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSecret((s) => !s)}
              className="rounded p-1.5 text-[#8B7355] dark:text-slate-500 hover:text-[#3D3229] dark:hover:text-white transition-colors"
              title={showSecret ? 'Hide secret' : 'Show secret'}
            >
              {showSecret ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        {errors.secret ? (
          <p className="mt-1 text-xs text-red-400">{errors.secret}</p>
        ) : (
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-xs text-[#8B7355] dark:text-slate-500">
              Used to sign requests with HMAC-SHA256. Verify the{' '}
              <code className="font-mono text-[10px]">
                X-UnderFireAI-Signature
              </code>{' '}
              header on your server.
            </p>
            <button
              type="button"
              onClick={handleGenerateSecret}
              className="ml-3 shrink-0 text-xs text-orange-500 hover:text-orange-400 transition-colors"
            >
              Generate
            </button>
          </div>
        )}
      </div>

      {/* Events */}
      <div>
        <span className={labelClass}>Events</span>
        <div className="space-y-2">
          {AVAILABLE_EVENTS.map((event) => (
            <label
              key={event.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#3D3229]/10 dark:border-slate-700 bg-[#3D3229]/3 dark:bg-slate-800/30 px-4 py-3 hover:bg-[#3D3229]/5 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={form.events.includes(event.value)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...form.events, event.value]
                      : form.events.filter((ev) => ev !== event.value);
                    setForm((f) => ({ ...f, events: next }));
                  }}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                    form.events.includes(event.value)
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-[#3D3229]/30 dark:border-slate-600 bg-transparent'
                  )}
                >
                  {form.events.includes(event.value) && (
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[#3D3229] dark:text-slate-200">
                  {event.label}
                </p>
                <p className="text-xs text-[#8B7355] dark:text-slate-500 mt-0.5">
                  {event.description}
                </p>
              </div>
            </label>
          ))}
        </div>
        {errors.events && (
          <p className="mt-1 text-xs text-red-400">{errors.events}</p>
        )}
      </div>

      {/* Enabled toggle */}
      <div className="flex items-center justify-between rounded-lg border border-[#3D3229]/10 dark:border-slate-700 bg-[#3D3229]/3 dark:bg-slate-800/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[#3D3229] dark:text-slate-200">
            Enable webhook
          </p>
          <p className="text-xs text-[#8B7355] dark:text-slate-500 mt-0.5">
            Disabled webhooks receive no events.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.enabled}
          onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
            form.enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
              form.enabled ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save Webhook
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg border border-[#3D3229]/15 dark:border-slate-700 bg-[#3D3229]/5 dark:bg-slate-800/50 px-5 py-2.5 text-sm font-medium text-[#6B5744] dark:text-slate-300 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ===========================================
// WEBHOOK CARD
// ===========================================

function WebhookCard({
  webhook,
  onToggle,
  onTest,
  onEdit,
  onDelete,
  onExpand,
  isExpanded,
  deliveries,
  loadingDeliveries,
  testing,
  testResult,
}: {
  webhook: Webhook;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onTest: (id: string) => Promise<void>;
  onEdit: (webhook: Webhook) => void;
  onDelete: (id: string) => Promise<void>;
  onExpand: (id: string) => void;
  isExpanded: boolean;
  deliveries: WebhookDelivery[];
  loadingDeliveries: boolean;
  testing: boolean;
  testResult: TestResult | null;
}): React.JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (): Promise<void> => {
    setToggling(true);
    await onToggle(webhook.id, !webhook.enabled);
    setToggling(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await onDelete(webhook.id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-4 p-5">
        <div className="mt-0.5 rounded-lg bg-[#3D3229]/8 dark:bg-slate-800 p-2 shrink-0">
          <Globe className="h-4 w-4 text-[#6B5744] dark:text-slate-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#3D3229] dark:text-white">
              {webhook.name}
            </span>
            <StatusBadge webhook={webhook} />
          </div>
          <p className="mt-0.5 text-xs font-mono text-[#6B5744] dark:text-slate-400 truncate">
            {webhook.url}
          </p>
          <p className="mt-1 text-xs text-[#8B7355] dark:text-slate-500">
            Last triggered: {formatDate(webhook.last_triggered_at)}
            {webhook.last_status_code && (
              <span
                className={cn(
                  'ml-2',
                  webhook.last_status_code >= 200 &&
                    webhook.last_status_code < 300
                    ? 'text-green-400'
                    : 'text-red-400'
                )}
              >
                HTTP {webhook.last_status_code}
              </span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Test */}
          <button
            onClick={() => void onTest(webhook.id)}
            disabled={testing || !webhook.enabled}
            title="Send test payload"
            className="rounded-lg p-2 text-[#8B7355] dark:text-slate-500 hover:bg-[#3D3229]/8 dark:hover:bg-slate-800 hover:text-[#3D3229] dark:hover:text-white transition-colors disabled:opacity-40"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(webhook)}
            title="Edit webhook"
            className="rounded-lg p-2 text-[#8B7355] dark:text-slate-500 hover:bg-[#3D3229]/8 dark:hover:bg-slate-800 hover:text-[#3D3229] dark:hover:text-white transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>

          {/* Toggle */}
          <button
            onClick={() => void handleToggle()}
            disabled={toggling}
            title={webhook.enabled ? 'Disable webhook' : 'Enable webhook'}
            className={cn(
              'rounded-lg p-2 transition-colors',
              webhook.enabled
                ? 'text-green-400 hover:bg-green-500/10 hover:text-green-300'
                : 'text-slate-400 hover:bg-slate-500/10 hover:text-slate-300'
            )}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : webhook.enabled ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>

          {/* Delete */}
          <button
            onClick={() => void handleDelete()}
            disabled={deleting}
            title={confirmDelete ? 'Click again to confirm delete' : 'Delete webhook'}
            className={cn(
              'rounded-lg p-2 transition-colors',
              confirmDelete
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'text-[#8B7355] dark:text-slate-500 hover:bg-red-500/10 hover:text-red-400'
            )}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>

          {/* Expand */}
          <button
            onClick={() => onExpand(webhook.id)}
            title={isExpanded ? 'Hide delivery history' : 'Show delivery history'}
            className="rounded-lg p-2 text-[#8B7355] dark:text-slate-500 hover:bg-[#3D3229]/8 dark:hover:bg-slate-800 hover:text-[#3D3229] dark:hover:text-white transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Test result banner */}
      {testResult && (
        <div
          className={cn(
            'mx-5 mb-3 rounded-lg px-4 py-2.5 flex items-center gap-2',
            testResult.success
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          )}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <p className="text-sm">
            {testResult.success ? (
              <span className="text-green-400">
                Test delivered successfully
                {testResult.statusCode && ` — HTTP ${testResult.statusCode}`}
              </span>
            ) : (
              <span className="text-red-400">
                Test failed
                {testResult.statusCode && ` — HTTP ${testResult.statusCode}`}
                {testResult.error && `: ${testResult.error}`}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Confirm delete warning */}
      {confirmDelete && (
        <div className="mx-5 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-sm text-red-400">
            Click the delete button again to permanently remove this webhook.
          </p>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-[#8B7355] dark:text-slate-500 hover:text-[#3D3229] dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delivery history */}
      {isExpanded && (
        <div className="border-t border-[#3D3229]/8 dark:border-slate-800 px-5 py-4">
          <p className="text-xs font-medium text-[#6B5744] dark:text-slate-400 mb-3 uppercase tracking-wide">
            Recent Deliveries
          </p>
          <DeliveryHistory
            webhookId={webhook.id}
            deliveries={deliveries}
            loadingDeliveries={loadingDeliveries}
          />
        </div>
      )}
    </div>
  );
}

// ===========================================
// PAYLOAD SCHEMA
// ===========================================

function PayloadSchema(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  const example = JSON.stringify(
    {
      event: 'session.completed',
      timestamp: '2025-03-01T12:00:00.000Z',
      data: {
        session_id: 'uuid',
        user_id: 'uuid',
        interview_type: 'behavioral',
        target_role: 'Software Engineer',
        target_company: 'Acme Corp',
        difficulty: 5,
        duration_seconds: 1800,
        started_at: '2025-03-01T11:30:00.000Z',
        ended_at: '2025-03-01T12:00:00.000Z',
        scores: {
          overall_score: 75,
          clarity_score: 80,
          confidence_score: 70,
          technical_depth: 75,
          star_usage_score: 72,
          communication_score: 78,
        },
        feedback: {
          strengths: ['Clear communication'],
          improvements: ['More specific metrics'],
          ai_feedback: 'String',
          interviewer_impression: 'String',
        },
      },
    },
    null,
    2
  );

  return (
    <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#6B5744] dark:text-slate-400" />
          <span className="text-sm font-medium text-[#3D3229] dark:text-white">
            Payload Schema &amp; Signature Verification
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[#8B7355] dark:text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#8B7355] dark:text-slate-500" />
        )}
      </button>

      {open && (
        <div className="border-t border-[#3D3229]/8 dark:border-slate-800 px-6 pb-6 pt-4 space-y-5">
          <div>
            <p className="text-sm font-medium text-[#3D3229] dark:text-white mb-2">
              Request Headers
            </p>
            <div className="space-y-1 text-xs font-mono bg-[#FAF8F5] dark:bg-slate-800/50 rounded-lg p-4">
              {[
                ['Content-Type', 'application/json'],
                ['X-UnderFireAI-Event', 'session.completed'],
                ['X-UnderFireAI-Delivery', '<uuid>'],
                ['X-UnderFireAI-Timestamp', '<unix_timestamp>'],
                ['X-UnderFireAI-Signature', 'sha256=<hmac_hex> (if secret set)'],
              ].map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-orange-400 shrink-0">{key}:</span>
                  <span className="text-[#6B5744] dark:text-slate-400">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-[#3D3229] dark:text-white mb-2">
              Signature Verification (Node.js)
            </p>
            <pre className="text-xs font-mono bg-[#FAF8F5] dark:bg-slate-800/50 rounded-lg p-4 overflow-x-auto text-[#6B5744] dark:text-slate-400 leading-relaxed whitespace-pre">{`const crypto = require('crypto');

function verify(req, secret) {
  const timestamp = req.headers['x-underfireai-timestamp'];
  const signature = req.headers['x-underfireai-signature'];
  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(timestamp + '.' + body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
          </div>

          <div>
            <p className="text-sm font-medium text-[#3D3229] dark:text-white mb-2">
              Example Payload
            </p>
            <pre className="text-xs font-mono bg-[#FAF8F5] dark:bg-slate-800/50 rounded-lg p-4 overflow-x-auto text-[#6B5744] dark:text-slate-400 leading-relaxed">
              {example}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// MAIN TAB
// ===========================================

export function WebhooksTab(): React.JSX.Element {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});
  const [loadingDeliveries, setLoadingDeliveries] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult | null>>({});

  // Load webhooks
  const loadWebhooks = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/webhooks');
      if (!res.ok) throw new Error('Failed to load webhooks');
      const data = await res.json() as { webhooks: Webhook[] };
      setWebhooks(data.webhooks);
    } catch {
      toast.error('Failed to load webhooks. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWebhooks();
  }, [loadWebhooks]);

  // Load delivery history for a webhook
  const loadDeliveries = useCallback(async (webhookId: string): Promise<void> => {
    setLoadingDeliveries((prev) => ({ ...prev, [webhookId]: true }));
    try {
      const res = await fetch(`/api/webhooks/${webhookId}`);
      if (!res.ok) throw new Error('Failed to load deliveries');
      const data = await res.json() as { recentDeliveries: WebhookDelivery[] };
      setDeliveries((prev) => ({ ...prev, [webhookId]: data.recentDeliveries }));
    } catch {
      toast.error('Failed to load delivery history.');
    } finally {
      setLoadingDeliveries((prev) => ({ ...prev, [webhookId]: false }));
    }
  }, []);

  // Toggle expand
  const handleExpand = useCallback((id: string): void => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        void loadDeliveries(next);
      }
      return next;
    });
  }, [loadDeliveries]);

  // Create webhook
  const handleCreate = async (form: FormState): Promise<void> => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          url: form.url.trim(),
          secret: form.secret.trim() || undefined,
          events: form.events,
          enabled: form.enabled,
        }),
      });

      const data = await res.json() as { webhook?: Webhook; message?: string };

      if (!res.ok) {
        toast.error(data.message ?? 'Failed to create webhook.');
        return;
      }

      if (data.webhook) {
        setWebhooks((prev) => [data.webhook!, ...prev]);
      }
      setView('list');
      toast.success('Webhook created successfully.');
    } catch {
      toast.error('Failed to create webhook. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Update webhook
  const handleUpdate = async (form: FormState): Promise<void> => {
    if (!editingWebhook) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/webhooks/${editingWebhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          url: form.url.trim(),
          secret: form.secret.trim() || null,
          events: form.events,
          enabled: form.enabled,
        }),
      });

      const data = await res.json() as { webhook?: Webhook; message?: string };

      if (!res.ok) {
        toast.error(data.message ?? 'Failed to update webhook.');
        return;
      }

      if (data.webhook) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === editingWebhook.id ? { ...w, ...data.webhook } : w))
        );
      }
      setView('list');
      setEditingWebhook(null);
      toast.success('Webhook updated.');
    } catch {
      toast.error('Failed to update webhook. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle enabled
  const handleToggle = async (id: string, enabled: boolean): Promise<void> => {
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error();
      setWebhooks((prev) =>
        prev.map((w) => (w.id === id ? { ...w, enabled, failure_count: enabled ? 0 : w.failure_count } : w))
      );
      toast.success(enabled ? 'Webhook enabled.' : 'Webhook disabled.');
    } catch {
      toast.error('Failed to update webhook status.');
    }
  };

  // Delete webhook
  const handleDelete = async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast.success('Webhook deleted.');
    } catch {
      toast.error('Failed to delete webhook.');
    }
  };

  // Test webhook
  const handleTest = async (id: string): Promise<void> => {
    setTesting((prev) => ({ ...prev, [id]: true }));
    setTestResults((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json() as { success: boolean; statusCode?: number; error?: string };
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: data.success, statusCode: data.statusCode, error: data.error },
      }));
      // Refresh delivery history if expanded
      if (expandedId === id) {
        void loadDeliveries(id);
      }
      // Clear test result after 8 seconds
      setTimeout(() => {
        setTestResults((prev) => ({ ...prev, [id]: null }));
      }, 8000);
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, error: 'Network error' },
      }));
    } finally {
      setTesting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleEdit = (webhook: Webhook): void => {
    setEditingWebhook(webhook);
    setView('edit');
  };

  const handleCancelForm = (): void => {
    setView('list');
    setEditingWebhook(null);
  };

  const editForm: FormState = editingWebhook
    ? {
        name: editingWebhook.name,
        url: editingWebhook.url,
        // Secret not returned from API — user must re-enter to change
        secret: '',
        events: editingWebhook.events,
        enabled: editingWebhook.enabled,
      }
    : EMPTY_FORM;

  const atLimit = webhooks.length >= MAX_WEBHOOKS;

  // ===========================================
  // RENDER
  // ===========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#8B7355] dark:text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#3D3229] dark:text-white">
            Webhooks
          </h2>
          <p className="text-sm text-[#6B5744] dark:text-slate-400 mt-1">
            Receive real-time notifications when interview sessions complete.
            Connect UnderFireAI to Zapier, n8n, or your own server.
          </p>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('create')}
            disabled={atLimit}
            title={atLimit ? `Maximum ${MAX_WEBHOOKS} webhooks allowed` : 'Add webhook'}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Webhook</span>
          </button>
        )}
      </div>

      {/* Limit notice */}
      {atLimit && view === 'list' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-400">
            You&apos;ve reached the maximum of {MAX_WEBHOOKS} webhooks. Delete one to add another.
          </p>
        </div>
      )}

      {/* Create form */}
      {view === 'create' && (
        <div className="rounded-xl border border-orange-500/30 bg-white dark:bg-slate-900/50 p-6">
          <h3 className="text-base font-semibold text-[#3D3229] dark:text-white mb-6">
            New Webhook
          </h3>
          <WebhookForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={handleCancelForm}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* Edit form */}
      {view === 'edit' && editingWebhook && (
        <div className="rounded-xl border border-orange-500/30 bg-white dark:bg-slate-900/50 p-6">
          <h3 className="text-base font-semibold text-[#3D3229] dark:text-white mb-1">
            Edit Webhook
          </h3>
          <p className="text-xs text-[#8B7355] dark:text-slate-500 mb-6">
            Leave the secret field blank to keep the existing secret unchanged.
          </p>
          <WebhookForm
            initial={editForm}
            onSave={handleUpdate}
            onCancel={handleCancelForm}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* Webhook list */}
      {view === 'list' && (
        <>
          {webhooks.length === 0 ? (
            <div className="rounded-xl border border-[#3D3229]/10 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 flex flex-col items-center text-center">
              <div className="rounded-full bg-[#3D3229]/8 dark:bg-slate-800 p-4 mb-4">
                <Globe className="h-7 w-7 text-[#8B7355] dark:text-slate-500" />
              </div>
              <h3 className="text-base font-semibold text-[#3D3229] dark:text-white mb-2">
                No webhooks yet
              </h3>
              <p className="text-sm text-[#6B5744] dark:text-slate-400 max-w-sm mb-6">
                Add a webhook endpoint to receive a POST request every time an
                interview session completes, with full scores and feedback included.
              </p>
              <button
                onClick={() => setView('create')}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Your First Webhook
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  onToggle={handleToggle}
                  onTest={handleTest}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onExpand={handleExpand}
                  isExpanded={expandedId === webhook.id}
                  deliveries={deliveries[webhook.id] ?? []}
                  loadingDeliveries={loadingDeliveries[webhook.id] ?? false}
                  testing={testing[webhook.id] ?? false}
                  testResult={testResults[webhook.id] ?? null}
                />
              ))}
            </div>
          )}

          {/* Payload schema — shown when there are webhooks */}
          {webhooks.length > 0 && <PayloadSchema />}
        </>
      )}
    </div>
  );
}
