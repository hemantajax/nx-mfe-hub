import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from './confirm-dialog.component';

export interface ConfirmDialogOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Bootstrap button class for the confirm button (default: 'btn-danger'). */
  confirmClass?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly modal = inject(NgbModal);

  /** Opens a confirm dialog. Resolves `true` if confirmed, `false` if dismissed. */
  async open(options: ConfirmDialogOptions = {}): Promise<boolean> {
    const ref = this.modal.open(ConfirmDialogComponent, {
      centered: true,
      size: 'sm',
    });

    const instance = ref.componentInstance as ConfirmDialogComponent;
    if (options.title) instance.title = options.title;
    if (options.message) instance.message = options.message;
    if (options.confirmText) instance.confirmText = options.confirmText;
    if (options.cancelText) instance.cancelText = options.cancelText;
    if (options.confirmClass) instance.confirmClass = options.confirmClass;

    try {
      await ref.result;
      return true;
    } catch {
      return false;
    }
  }
}
