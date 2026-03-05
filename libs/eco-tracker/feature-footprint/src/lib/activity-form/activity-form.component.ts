import {
  ChangeDetectionStrategy, Component, inject, signal, computed, effect
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem } from '@ng-bootstrap/ng-bootstrap';
import { FootprintService, FUEL_CO2_PER_LITRE } from '@ng-mfe-hub/eco-tracker-data-access';
import type { ActivityCategory, EmissionFactor } from '@ng-mfe-hub/eco-tracker-data-access';
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
  imports: [FormsModule, CategoryIconComponent, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem],
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
            <div ngbDropdown class="d-block">
              <button type="button" class="form-select text-start d-flex justify-content-between align-items-center"
                      ngbDropdownToggle>
                @if (selectedFactor(); as f) {
                  <span>{{ f.label }}</span>
                  <span class="badge ms-2" [class]="co2BadgeClass(f.co2ePerUnit)">
                    {{ f.co2ePerUnit }} {{ f.unit === 'meal' ? 'kg/meal' : 'kg/' + f.unit }}
                  </span>
                } @else {
                  <span class="text-muted">Select an activity…</span>
                }
              </button>
              <div ngbDropdownMenu class="w-100 py-1" style="max-height:320px;overflow-y:auto">
                @for (factor of factorsForCategory(); track factor.type) {
                  <button ngbDropdownItem type="button"
                          class="d-flex justify-content-between align-items-center px-3 py-2"
                          [class.active]="selectedType() === factor.type"
                          (click)="selectType(factor)">
                    <span>{{ factor.label }}</span>
                    <span class="badge ms-2" [class]="co2BadgeClass(factor.co2ePerUnit)">
                      {{ factor.co2ePerUnit }} kg/{{ factor.unit }}
                    </span>
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Value -->
          @if (selectedType()) {
            <div class="mb-3">
              <label class="form-label fw-semibold">
                Amount ({{ selectedFactor()?.unit ?? '' }}) <span class="text-danger">*</span>
              </label>
              <input type="number" class="form-control" [ngModel]="value()" (ngModelChange)="value.set($event)" name="value"
                     required min="0.01" step="0.1" [placeholder]="'Enter amount in ' + (selectedFactor()?.unit ?? '')" />
            </div>

            @if (fuelCo2PerLitre()) {
              <div class="mb-3">
                <label class="form-label fw-semibold">Vehicle Mileage</label>
                <div class="input-group" style="max-width:280px">
                  <input type="number" class="form-control" [ngModel]="mileage()" (ngModelChange)="onMileageChange($event)"
                         name="mileage" min="1" max="200" step="0.5" placeholder="e.g. 40" />
                  <span class="input-group-text">km/L</span>
                </div>
                <div class="form-text">
                  @if (mileage() > 0) {
                    Using <strong>{{ customCo2ePerKm().toFixed(3) }} kg/km</strong> from your mileage
                  } @else {
                    Optional — uses default avg ({{ selectedFactor()?.co2ePerUnit }} kg/km) if empty
                  }
                </div>
              </div>
            }

            @if (estimatedCo2() > 0) {
              <div class="mb-3 p-2 rounded-3 bg-eco-light d-flex align-items-center gap-2">
                <span class="badge badge-emission">{{ estimatedCo2().toFixed(2) }} kg CO₂e</span>
                <span class="small text-muted">estimated emission</span>
              </div>
            }
          }

          <!-- Date -->
          <div class="mb-3">
            <label class="form-label fw-semibold">Date <span class="text-danger">*</span></label>
            <input type="date" class="form-control" [ngModel]="date()" (ngModelChange)="date.set($event)" name="date"
                   required [max]="today" />
          </div>

          <!-- Notes -->
          <div class="mb-4">
            <label class="form-label fw-semibold">Notes (optional)</label>
            <input type="text" class="form-control" [ngModel]="notes()" (ngModelChange)="notes.set($event)" name="notes"
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

  private static readonly MILEAGE_KEY = 'eco-vehicle-mileage';

  protected readonly selectedCategory = signal<ActivityCategory | null>(null);
  protected readonly selectedType = signal('');
  protected readonly value = signal(0);
  protected readonly mileage = signal(0);
  protected readonly date = signal(new Date().toISOString().slice(0, 10));
  protected readonly notes = signal('');
  protected readonly saving = signal(false);

  constructor() {
    effect(() => {
      const type = this.selectedType();
      if (FUEL_CO2_PER_LITRE[type]) this.loadSavedMileage(type);
      else this.mileage.set(0);
    });
  }

  protected readonly factorsForCategory = computed(() => {
    const cat = this.selectedCategory();
    return cat ? this.footprintService.getFactorsByCategory(cat) : [];
  });

  protected readonly selectedFactor = computed(() =>
    this.footprintService.getFactorByType(this.selectedType()),
  );

  protected readonly fuelCo2PerLitre = computed(() =>
    FUEL_CO2_PER_LITRE[this.selectedType()] ?? 0,
  );

  protected readonly customCo2ePerKm = computed(() => {
    const fuel = this.fuelCo2PerLitre();
    const km = this.mileage();
    return fuel && km > 0 ? fuel / km : 0;
  });

  protected readonly effectiveCo2ePerUnit = computed(() => {
    const custom = this.customCo2ePerKm();
    return custom > 0 ? custom : (this.selectedFactor()?.co2ePerUnit ?? 0);
  });

  protected readonly estimatedCo2 = computed(() =>
    Math.round(this.value() * this.effectiveCo2ePerUnit() * 100) / 100,
  );

  protected readonly isValid = computed(
    () => !!this.selectedCategory() && !!this.selectedType() && this.value() > 0 && !!this.date(),
  );

  protected selectCategory(cat: ActivityCategory): void {
    this.selectedCategory.set(cat);
    this.selectedType.set('');
    this.value.set(0);
    this.mileage.set(0);
  }

  protected selectType(factor: EmissionFactor): void {
    this.selectedType.set(factor.type);
  }

  protected co2BadgeClass(co2e: number): string {
    if (co2e <= 0) return 'bg-success bg-opacity-75 text-white';
    if (co2e < 0.3) return 'bg-success bg-opacity-25 text-success';
    if (co2e < 1) return 'bg-warning bg-opacity-25 text-dark';
    if (co2e < 3) return 'bg-danger bg-opacity-25 text-danger';
    return 'bg-danger text-white';
  }

  protected onMileageChange(val: number): void {
    this.mileage.set(val);
    if (val > 0) this.saveMileage(this.selectedType(), val);
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid() || this.saving()) return;
    const cat = this.selectedCategory();
    const factor = this.selectedFactor();
    if (!cat || !factor) return;
    this.saving.set(true);
    const custom = this.customCo2ePerKm();
    const co2Override = custom > 0 ? Math.round(this.value() * custom * 100) / 100 : undefined;
    await this.footprintService.logActivity({
      category: cat,
      type: this.selectedType(),
      value: this.value(),
      unit: factor.unit,
      date: this.date(),
      notes: this.notes() || undefined,
    }, co2Override);
    this.saving.set(false);
    await this.router.navigate(['/eco-tracker/footprint']);
  }

  protected loadSavedMileage(type: string): void {
    try {
      const saved = JSON.parse(localStorage.getItem(ActivityFormComponent.MILEAGE_KEY) ?? '{}');
      this.mileage.set(saved[type] ?? 0);
    } catch {
      this.mileage.set(0);
    }
  }

  private saveMileage(type: string, kmPerL: number): void {
    try {
      const saved = JSON.parse(localStorage.getItem(ActivityFormComponent.MILEAGE_KEY) ?? '{}');
      saved[type] = kmPerL;
      localStorage.setItem(ActivityFormComponent.MILEAGE_KEY, JSON.stringify(saved));
    } catch { /* noop */ }
  }
}
