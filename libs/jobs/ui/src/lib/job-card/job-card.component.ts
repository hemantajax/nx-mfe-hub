import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { Job } from '@ng-mfe-hub/jobs-data-access';

@Component({
  selector: 'lib-job-card',
  standalone: true,
  imports: [DatePipe, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card h-100 border-0 shadow-sm job-card">
      <div class="card-body d-flex flex-column gap-2 p-4">

        <!-- Header: platform badge + posted date -->
        <div class="d-flex justify-content-between align-items-start">
          <span class="badge rounded-pill px-3 py-1" [class]="platformBadgeClass()">
            {{ job().platform | titlecase }}
          </span>
          <small class="text-muted">{{ job().postedAt | date:'d MMM' }}</small>
        </div>

        <!-- Title & Company -->
        <div>
          <h6 class="fw-bold mb-0 text-dark lh-sm">{{ job().title }}</h6>
          <p class="mb-0 text-primary fw-semibold small">{{ job().company }}</p>
        </div>

        <!-- Meta: location + type -->
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <span class="text-muted small">
            <i class="ti-location-pin me-1"></i>{{ job().location }}
          </span>
          <span class="badge bg-light text-secondary border small">{{ typelabel() }}</span>
          <span class="badge bg-light text-secondary border small">{{ experienceLabel() }}</span>
        </div>

        <!-- Salary -->
        <p class="fw-semibold text-success mb-0 small">
          <i class="ti-money me-1"></i>{{ job().salary }}
        </p>

        <!-- Skills -->
        <div class="d-flex flex-wrap gap-1">
          @for (skill of job().skills; track skill) {
            <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 small">{{ skill }}</span>
          }
        </div>

        <!-- Description -->
        <p class="text-muted small mb-0 flex-grow-1" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
          {{ job().description }}
        </p>

        <!-- Apply Button -->
        <a
          [href]="job().url"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary btn-sm mt-auto w-100"
        >
          <i class="ti-new-window me-1"></i>Apply on {{ job().platform | titlecase }}
        </a>
      </div>
    </div>
  `,
  styles: [`
    .job-card {
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .job-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
    }
  `],
})
export class JobCardComponent {
  readonly job = input.required<Job>();

  protected platformBadgeClass(): string {
    const map: Record<string, string> = {
      naukri: 'badge-naukri',
      linkedin: 'badge-linkedin',
      indeed: 'badge-indeed',
    };
    return map[this.job().platform] ?? 'bg-secondary text-white';
  }

  protected typelabel(): string {
    const map: Record<string, string> = {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      contract: 'Contract',
      remote: 'Remote',
      internship: 'Internship',
    };
    return map[this.job().type] ?? this.job().type;
  }

  protected experienceLabel(): string {
    const map: Record<string, string> = {
      fresher: 'Fresher',
      junior: 'Junior',
      mid: 'Mid-level',
      senior: 'Senior',
      lead: 'Lead',
    };
    return map[this.job().experience] ?? this.job().experience;
  }
}
