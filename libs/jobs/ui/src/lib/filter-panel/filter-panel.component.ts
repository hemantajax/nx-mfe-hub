import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JobPlatform, JobType, ExperienceLevel } from '@ng-mfe-hub/jobs-data-access';

export interface FilterState {
  platforms: JobPlatform[];
  types: JobType[];
  experienceLevels: ExperienceLevel[];
}

@Component({
  selector: 'lib-filter-panel',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card border-0 shadow-sm h-100">
      <div class="card-header bg-white border-bottom py-3">
        <h6 class="mb-0 fw-bold text-primary">
          <i class="ti-filter me-2"></i>Filters
        </h6>
      </div>
      <div class="card-body">

        <!-- Platforms -->
        <div class="mb-4">
          <p class="fw-semibold small text-uppercase text-muted mb-2 ls-wide">Platform</p>
          @for (p of platforms; track p.value) {
            <div class="form-check mb-1">
              <input
                class="form-check-input"
                type="checkbox"
                [id]="'plat-' + p.value"
                [value]="p.value"
                [checked]="isChecked(selectedPlatforms(), p.value)"
                (change)="togglePlatform(p.value, $event)"
              />
              <label class="form-check-label d-flex align-items-center gap-2" [for]="'plat-' + p.value">
                <span
                  class="rounded-circle d-inline-block flex-shrink-0"
                  style="width:10px;height:10px"
                  [style.background-color]="p.color">
                </span>
                {{ p.label }}
              </label>
            </div>
          }
        </div>

        <!-- Job Type -->
        <div class="mb-4">
          <p class="fw-semibold small text-uppercase text-muted mb-2">Job Type</p>
          @for (t of jobTypes; track t.value) {
            <div class="form-check mb-1">
              <input
                class="form-check-input"
                type="checkbox"
                [id]="'type-' + t.value"
                [checked]="isChecked(selectedTypes(), t.value)"
                (change)="toggleType(t.value, $event)"
              />
              <label class="form-check-label" [for]="'type-' + t.value">{{ t.label }}</label>
            </div>
          }
        </div>

        <!-- Experience -->
        <div class="mb-3">
          <p class="fw-semibold small text-uppercase text-muted mb-2">Experience</p>
          @for (e of experienceLevels; track e.value) {
            <div class="form-check mb-1">
              <input
                class="form-check-input"
                type="checkbox"
                [id]="'exp-' + e.value"
                [checked]="isChecked(selectedExperience(), e.value)"
                (change)="toggleExperience(e.value, $event)"
              />
              <label class="form-check-label" [for]="'exp-' + e.value">{{ e.label }}</label>
            </div>
          }
        </div>

        <button class="btn btn-outline-secondary btn-sm w-100" (click)="onReset()">
          <i class="ti-close me-1"></i>Clear All
        </button>
      </div>
    </div>
  `,
})
export class FilterPanelComponent {
  readonly selectedPlatforms = input<JobPlatform[]>([]);
  readonly selectedTypes = input<JobType[]>([]);
  readonly selectedExperience = input<ExperienceLevel[]>([]);
  readonly filterChanged = output<FilterState>();

  protected readonly platforms: { value: JobPlatform; label: string; color: string }[] = [
    { value: 'naukri', label: 'Naukri', color: '#ff7555' },
    { value: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
    { value: 'indeed', label: 'Indeed', color: '#2164f3' },
  ];

  protected readonly jobTypes: { value: JobType; label: string }[] = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'remote', label: 'Remote' },
    { value: 'contract', label: 'Contract' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'internship', label: 'Internship' },
  ];

  protected readonly experienceLevels: { value: ExperienceLevel; label: string }[] = [
    { value: 'fresher', label: 'Fresher / 0 yr' },
    { value: 'junior', label: 'Junior / 1-3 yr' },
    { value: 'mid', label: 'Mid / 3-6 yr' },
    { value: 'senior', label: 'Senior / 6-10 yr' },
    { value: 'lead', label: 'Lead / 10+ yr' },
  ];

  protected isChecked(list: string[], value: string): boolean {
    return list.includes(value);
  }

  protected togglePlatform(value: JobPlatform, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedPlatforms();
    const updated = checked ? [...current, value] : current.filter((v) => v !== value);
    this.filterChanged.emit({ platforms: updated, types: this.selectedTypes(), experienceLevels: this.selectedExperience() });
  }

  protected toggleType(value: JobType, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedTypes();
    const updated = checked ? [...current, value] : current.filter((v) => v !== value);
    this.filterChanged.emit({ platforms: this.selectedPlatforms(), types: updated, experienceLevels: this.selectedExperience() });
  }

  protected toggleExperience(value: ExperienceLevel, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.selectedExperience();
    const updated = checked ? [...current, value] : current.filter((v) => v !== value);
    this.filterChanged.emit({ platforms: this.selectedPlatforms(), types: this.selectedTypes(), experienceLevels: updated });
  }

  protected onReset(): void {
    this.filterChanged.emit({ platforms: [], types: [], experienceLevels: [] });
  }
}
