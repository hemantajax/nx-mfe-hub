import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastType } from './toast.service';

const TYPE_CONFIG: Record<ToastType, { bg: string; icon: string; label: string }> = {
  success: { bg: 'bg-success', icon: 'icon-check',    label: 'Success' },
  error:   { bg: 'bg-danger',  icon: 'icon-close',    label: 'Error' },
  warning: { bg: 'bg-warning', icon: 'icon-alert',    label: 'Warning' },
  info:    { bg: 'bg-info',    icon: 'icon-info-alt', label: 'Info' },
};

@Component({
  selector: 'ui-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <div class="toast-item d-flex align-items-start gap-3 p-3" role="alert">
        <span class="toast-icon d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              [class]="cfg(toast.type).bg">
          <i [class]="cfg(toast.type).icon" style="font-size:0.85rem"></i>
        </span>
        <div class="flex-grow-1 min-width-0">
          <div class="fw-semibold small">{{ cfg(toast.type).label }}</div>
          <div class="text-muted" style="font-size:0.8rem">{{ toast.message }}</div>
        </div>
        <button type="button" class="btn-close flex-shrink-0" style="font-size:0.6rem"
                (click)="toastService.remove(toast.id)"></button>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1200;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
      min-width: 300px;
    }
    .toast-item {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 8px 24px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.06);
      border-left: 4px solid transparent;
    }
    .toast-item:has(.bg-success) { border-left-color: var(--bs-success); }
    .toast-item:has(.bg-danger)  { border-left-color: var(--bs-danger); }
    .toast-item:has(.bg-warning) { border-left-color: var(--bs-warning); }
    .toast-item:has(.bg-info)    { border-left-color: var(--bs-info); }
    .toast-icon {
      width: 32px;
      height: 32px;
      color: #fff;
    }
  `],
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);

  protected cfg(type: ToastType) {
    return TYPE_CONFIG[type] ?? TYPE_CONFIG.info;
  }
}
