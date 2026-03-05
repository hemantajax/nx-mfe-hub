import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-header border-0 pb-0">
      <h5 class="modal-title fw-bold">{{ title }}</h5>
      <button type="button" class="btn-close shadow-none" style="opacity:.4" (click)="modal.dismiss()"></button>
    </div>
    <div class="modal-body pt-2">
      <p class="text-muted mb-0">{{ message }}</p>
    </div>
    <div class="modal-footer border-0 pt-0">
      <button type="button" class="btn btn-sm btn-light" (click)="modal.dismiss()">
        {{ cancelText }}
      </button>
      <button type="button" class="btn btn-sm" [class]="confirmClass" (click)="modal.close(true)">
        {{ confirmText }}
      </button>
    </div>
  `,
})
export class ConfirmDialogComponent {
  readonly modal = inject(NgbActiveModal);

  title = 'Confirm';
  message = 'Are you sure?';
  confirmText = 'Yes';
  cancelText = 'Cancel';
  confirmClass = 'btn-danger';
}
