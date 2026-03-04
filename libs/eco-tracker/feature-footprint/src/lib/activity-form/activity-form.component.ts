import {
  ChangeDetectionStrategy, Component, inject, signal, computed
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FootprintService } from '@ng-mfe-hub/eco-tracker-data-access';
import type { ActivityCategory } from '@ng-mfe-hub/eco-tracker-data-access';
import { CategoryIconComponent } from '@ng-mfe-hub/eco-tracker-ui';

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  transport: '🚗 Transport',
  food:      '🍽️ Food',
  energy:    '⚡ Energy',
  shopping:  '🛍️ Shopping',
};

@Component({
  selector: 'eco-activity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CategoryIconComponent],
  template: `
    <div class="container py-4 px-3 px-md-4" style="max-width:640px">
      <div class="d-flex align-items-center gap-2 mb-4">
        <button class="btn btn-link p-0 text-muted" (click)="router.navigate(['/eco-tracker/footprint'])">
          <i class="icon-arrow-left"></i>
        </button>
        <h2 class="fw-bold text-eco mb-0">📊 Log Activity</h2>
      </div>

      <form (ngSubmit)="onSubmit()">
        <!-- Category Pills -->
        <div class="mb-4">
          <label class="form-label fw-semibold mb-2">Category <span class="text-danger">*</span></label>
          <div class="d-flex gap-2 flex-wrap">
            @for (cat of categories; track cat) {
              <button type="button" class="btn btn-sm d-flex align-items-center gap-2"
                      [class.btn-danger]="selectedCategory() === cat"
                      [class.btn-outline-secondary]="selectedCategory() !== cat"
                      (click)="selectCategory(cat)">
                <eco-category-icon [category]="cat" [size]="24" />
                {{ LABELS[cat] }}
              </button>
            }
          </div>
        </div>

        @if (selectedCategory()) {
          <!-- Activity Type -->
          <div class="mb-3">
            <label class="form-label fw-semibold">Activity Type <span class="text-danger">*</span></label>
            <select class="form-select" [(ngModel)]="selectedType" name="type" required>
              <option value="">Select an activity…</option>
              @for (factor of factorsForCategory(); track factor.type) {
                <option [value]="factor.type">{{ factor.label }} ({{ factor.unit }})</option>
              }
            </select>
          </div>

          <!-- Value -->
          @if (selectedType) {
            <div class="mb-3">
              <label class="form-label fw-semibold">
                Amount ({{ selectedFactor()?.unit ?? '' }}) <span class="text-danger">*</span>
              </label>
              <input type="number" class="form-control" [(ngModel)]="value" name="value"
                     required min="0.01" step="0.1" [placeholder]="'Enter amount in ' + (selectedFactor()?.unit ?? '')" />
              @if (estimatedCo2() > 0) {
                <div class="mt-2 p-2 rounded-3 bg-eco-light d-flex align-items-center gap-2">
                  <span class="badge badge-emission">{{ estimatedCo2().toFixed(2) }} kg CO₂e</span>
                  <span class="small text-muted">estimated emission</span>
                </div>
              }
            </div>
          }

          <!-- Date -->
          <div class="mb-3">
            <label class="form-label fw-semibold">Date <span class="text-danger">*</span></label>
            <input type="date" class="form-control" [(ngModel)]="date" name="date"
                   required [max]="today" />
          </div>

          <!-- Notes -->
          <div class="mb-4">
            <label class="form-label fw-semibold">Notes (optional)</label>
            <input type="text" class="form-control" [(ngModel)]="notes" name="notes"
                   placeholder="e.g. Drove to work, return journey…" />
          </div>

          <!-- Actions -->
          <div class="d-flex gap-2 justify-content-end">
            <button type="button" class="btn btn-outline-secondary"
                    (click)="router.navigate(['/eco-tracker/footprint'])">
              Cancel
            </button>
            <button type="submit" class="btn btn-danger" [disabled]="saving() || !isValid()">
              @if (saving()) {
                <span class="spinner-border spinner-border-sm me-1"></span>Saving…
              } @else {
                <i class="icon-plus me-1"></i>Log Activity
              }
            </button>
          </div>
        }
      </form>
    </div>
  `,
})
export class ActivityFormComponent {
  protected readonly footprintService = inject(FootprintService);
  protected readonly router = inject(Router);
  protected readonly LABELS = CATEGORY_LABELS;
  protected readonly categories: ActivityCategory[] = ['transport', 'food', 'energy', 'shopping'];
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly selectedCategory = signal<ActivityCategory | null>(null);
  protected selectedType = '';
  protected value = 0;
  protected date = new Date().toISOString().slice(0, 10);
  protected notes = '';
  protected saving = signal(false);

  protected readonly factorsForCategory = computed(() => {
    const cat = this.selectedCategory();
    return cat ? this.footprintService.getFactorsByCategory(cat) : [];
  });

  protected readonly selectedFactor = computed(() =>
    this.footprintService.getFactorByType(this.selectedType),
  );

  protected readonly estimatedCo2 = computed(() => {
    const factor = this.selectedFactor();
    return factor ? Math.round(this.value * factor.co2ePerUnit * 100) / 100 : 0;
  });

  protected readonly isValid = computed(
    () => !!this.selectedCategory() && !!this.selectedType && this.value > 0 && !!this.date,
  );

  protected selectCategory(cat: ActivityCategory): void {
    this.selectedCategory.set(cat);
    this.selectedType = '';
    this.value = 0;
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid() || this.saving()) return;
    const cat = this.selectedCategory();
    const factor = this.selectedFactor();
    if (!cat || !factor) return;
    this.saving.set(true);
    await this.footprintService.logActivity({
      category: cat,
      type: this.selectedType,
      value: this.value,
      unit: factor.unit,
      date: this.date,
      notes: this.notes || undefined,
    });
    this.saving.set(false);
    await this.router.navigate(['/eco-tracker/footprint']);
  }
}
