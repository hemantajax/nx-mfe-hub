import { Component } from '@angular/core';
import { ThemePreviewComponent } from '@ng-mfe-hub/ui';

@Component({
  imports: [ThemePreviewComponent],
  selector: 'app-theme-entry',
  template: `<ui-theme-preview />`,
})
export class RemoteEntry {}
