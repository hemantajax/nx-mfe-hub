import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SearchBarValue {
  keyword: string;
  location: string;
}

@Component({
  selector: 'lib-search-bar',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-body p-3">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-5">
            <label class="form-label fw-semibold small text-muted mb-1">
              <i class="ti-search me-1"></i>Job Title / Skills / Company
            </label>
            <input
              class="form-control"
              type="text"
              placeholder="e.g. Angular Developer, React, Infosys…"
              [(ngModel)]="keyword"
            />
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label fw-semibold small text-muted mb-1">
              <i class="ti-location-pin me-1"></i>Location
            </label>
            <input
              class="form-control"
              type="text"
              placeholder="e.g. Bengaluru, Remote, Pune…"
              [(ngModel)]="location"
            />
          </div>
          <div class="col-12 col-md-3">
            <button
              class="btn btn-primary w-100"
              type="button"
              (click)="onSearch()"
            >
              <i class="ti-search me-1"></i>Search Jobs
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SearchBarComponent {
  readonly initialKeyword = input<string>('');
  readonly initialLocation = input<string>('');
  readonly searched = output<SearchBarValue>();

  protected keyword = '';
  protected location = '';

  protected onSearch(): void {
    this.searched.emit({ keyword: this.keyword, location: this.location });
  }
}
