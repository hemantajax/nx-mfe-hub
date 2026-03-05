import { Injectable, signal, WritableSignal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly type: ToastType;
  readonly delay: number;
}

const GLOBAL_KEY = '__ng_mfe_hub_toasts__';

/**
 * Attach the signal to globalThis so every Module Federation bundle
 * (shell + all remotes) shares the exact same reactive queue.
 */
function getToasts(): WritableSignal<Toast[]> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = signal<Toast[]>([]);
  }
  return g[GLOBAL_KEY] as WritableSignal<Toast[]>;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = getToasts();
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'info', delay = 5000): void {
    const id = crypto.randomUUID();
    this._toasts.update((prev) => [...prev, { id, message, type, delay }]);
    setTimeout(() => this.remove(id), delay);
  }

  success(message: string, delay = 5000): void {
    this.show(message, 'success', delay);
  }

  error(message: string, delay = 7000): void {
    this.show(message, 'error', delay);
  }

  warning(message: string, delay = 6000): void {
    this.show(message, 'warning', delay);
  }

  info(message: string, delay = 5000): void {
    this.show(message, 'info', delay);
  }

  remove(id: string): void {
    this._toasts.update((prev) => prev.filter((t) => t.id !== id));
  }
}
