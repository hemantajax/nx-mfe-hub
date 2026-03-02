import { ChangeDetectionStrategy, Component } from '@angular/core';
import { JobSearchComponent } from '@ng-mfe-hub/jobs-feature-search';

@Component({
  selector: 'app-jobs-home',
  standalone: true,
  imports: [JobSearchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<lib-job-search />`,
})
export class HomeComponent {}
