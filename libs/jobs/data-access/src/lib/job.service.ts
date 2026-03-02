import { Injectable, signal, computed } from '@angular/core';
import { Job, JobSearchQuery, DEFAULT_QUERY } from './job.model';
import { MOCK_JOBS } from './job-mock-data';

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly _allJobs = signal<Job[]>(MOCK_JOBS);
  private readonly _query = signal<JobSearchQuery>(DEFAULT_QUERY);
  private readonly _loading = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly query = this._query.asReadonly();

  readonly results = computed(() => {
    const q = this._query();
    return this._allJobs().filter((job) => this._matches(job, q));
  });

  readonly totalCount = computed(() => this.results().length);

  updateQuery(query: Partial<JobSearchQuery>): void {
    this._query.update((prev) => ({ ...prev, ...query }));
  }

  resetQuery(): void {
    this._query.set(DEFAULT_QUERY);
  }

  /**
   * Placeholder for real HTTP aggregation.
   * Replace this method body with:
   *   - GET https://devapi.naukri.com/v1/jobs?q=...  (Naukri Partner API)
   *   - GET https://api.linkedin.com/v2/jobSearch?...  (LinkedIn Jobs API)
   *   - GET https://api.indeed.com/ads/apisearch?...  (Indeed Publisher API)
   */
  async fetchFromPlatforms(_query: JobSearchQuery): Promise<void> {
    this._loading.set(true);
    await new Promise((r) => setTimeout(r, 600)); // simulates network delay
    this._loading.set(false);
  }

  private _matches(job: Job, q: JobSearchQuery): boolean {
    const kw = q.keyword.toLowerCase().trim();
    if (kw) {
      const haystack = `${job.title} ${job.company} ${job.skills.join(' ')} ${job.description}`.toLowerCase();
      if (!haystack.includes(kw)) return false;
    }

    if (q.location.trim()) {
      if (!job.location.toLowerCase().includes(q.location.toLowerCase().trim())) return false;
    }

    if (q.platforms.length && !q.platforms.includes(job.platform)) return false;
    if (q.types.length && !q.types.includes(job.type)) return false;
    if (q.experienceLevels.length && !q.experienceLevels.includes(job.experience)) return false;

    return true;
  }
}
