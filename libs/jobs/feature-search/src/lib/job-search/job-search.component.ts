import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { JobService } from '@ng-mfe-hub/jobs-data-access';
import {
  SearchBarComponent,
  SearchBarValue,
  FilterPanelComponent,
  FilterState,
  JobCardComponent,
} from '@ng-mfe-hub/jobs-ui';

@Component({
  selector: 'lib-job-search',
  standalone: true,
  imports: [SearchBarComponent, FilterPanelComponent, JobCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid py-4">

      <!-- Hero / Search Bar -->
      <div class="row justify-content-center mb-2">
        <div class="col-12 col-xl-10">
          <div class="text-center mb-4">
            <h2 class="fw-bold mb-1">
              <i class="ti-briefcase me-2 text-primary"></i>Find Your Next Role
            </h2>
            <p class="text-muted">Aggregating top listings from Naukri, LinkedIn &amp; Indeed</p>
          </div>
          <lib-search-bar (searched)="onSearch($event)" />
        </div>
      </div>

      <!-- Platform stats pills -->
      <div class="row justify-content-center mb-4">
        <div class="col-12 col-xl-10">
          <div class="d-flex flex-wrap gap-2 justify-content-center">
            @for (stat of platformStats(); track stat.name) {
              <span class="badge rounded-pill px-3 py-2 fs-6" [class]="stat.badgeClass">
                <i class="me-1" [class]="stat.icon"></i>{{ stat.name }}: {{ stat.count }} jobs
              </span>
            }
          </div>
        </div>
      </div>

      <!-- Body: Filters + Results -->
      <div class="row justify-content-center">
        <div class="col-12 col-xl-10">
          <div class="row g-4">

            <!-- Filter Sidebar -->
            <div class="col-12 col-md-3">
              <lib-filter-panel
                [selectedPlatforms]="activePlatforms()"
                [selectedTypes]="activeTypes()"
                [selectedExperience]="activeExperience()"
                (filterChanged)="onFilterChange($event)"
              />
            </div>

            <!-- Results Grid -->
            <div class="col-12 col-md-9">

              <!-- Results header -->
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0 fw-semibold text-muted">
                  {{ jobService.totalCount() }} job{{ jobService.totalCount() === 1 ? '' : 's' }} found
                </h6>
                @if (hasActiveFilters()) {
                  <button class="btn btn-outline-danger btn-sm" (click)="clearAll()">
                    <i class="ti-close me-1"></i>Clear filters
                  </button>
                }
              </div>

              <!-- Loading state -->
              @if (jobService.loading()) {
                <div class="d-flex justify-content-center py-5">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading…</span>
                  </div>
                </div>
              }

              <!-- Empty state -->
              @if (!jobService.loading() && jobService.totalCount() === 0) {
                <div class="text-center py-5">
                  <i class="ti-search display-4 text-muted d-block mb-3"></i>
                  <h5 class="text-muted">No jobs match your search</h5>
                  <p class="text-muted small">Try different keywords, location, or clear some filters.</p>
                  <button class="btn btn-outline-primary" (click)="clearAll()">Reset Search</button>
                </div>
              }

              <!-- Job Cards Grid -->
              @if (!jobService.loading() && jobService.totalCount() > 0) {
                <div class="row row-cols-1 row-cols-lg-2 g-3">
                  @for (job of jobService.results(); track job.id) {
                    <div class="col">
                      <lib-job-card [job]="job" />
                    </div>
                  }
                </div>
              }

            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class JobSearchComponent implements OnInit {
  protected readonly jobService = inject(JobService);

  protected readonly activePlatforms = signal<import('@ng-mfe-hub/jobs-data-access').JobPlatform[]>([]);
  protected readonly activeTypes = signal<import('@ng-mfe-hub/jobs-data-access').JobType[]>([]);
  protected readonly activeExperience = signal<import('@ng-mfe-hub/jobs-data-access').ExperienceLevel[]>([]);

  protected readonly platformStats = () => {
    const all = this.jobService.results();
    const counts = { naukri: 0, linkedin: 0, indeed: 0 };
    for (const j of all) counts[j.platform]++;
    return [
      { name: 'Naukri', count: counts.naukri, badgeClass: 'bg-warning text-dark', icon: 'ti-star' },
      { name: 'LinkedIn', count: counts.linkedin, badgeClass: 'bg-primary text-white', icon: 'ti-linkedin' },
      { name: 'Indeed', count: counts.indeed, badgeClass: 'bg-success text-white', icon: 'ti-briefcase' },
    ];
  };

  protected hasActiveFilters(): boolean {
    const q = this.jobService.query();
    return !!(q.keyword || q.location || q.platforms.length || q.types.length || q.experienceLevels.length);
  }

  ngOnInit(): void {
    this.jobService.fetchFromPlatforms(this.jobService.query());
  }

  protected onSearch(val: SearchBarValue): void {
    this.jobService.updateQuery({ keyword: val.keyword, location: val.location });
    this.jobService.fetchFromPlatforms(this.jobService.query());
  }

  protected onFilterChange(state: FilterState): void {
    this.activePlatforms.set(state.platforms);
    this.activeTypes.set(state.types);
    this.activeExperience.set(state.experienceLevels);
    this.jobService.updateQuery({
      platforms: state.platforms,
      types: state.types,
      experienceLevels: state.experienceLevels,
    });
  }

  protected clearAll(): void {
    this.activePlatforms.set([]);
    this.activeTypes.set([]);
    this.activeExperience.set([]);
    this.jobService.resetQuery();
  }
}
