import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-theme-preview',
  imports: [],
  templateUrl: './theme-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePreviewComponent {}
