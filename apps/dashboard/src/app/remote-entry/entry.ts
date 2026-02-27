import { Component } from '@angular/core';
import { HomeComponent } from './home.component';

@Component({
  imports: [HomeComponent],
  selector: 'app-dashboard-entry',
  template: `<app-home />`,
})
export class RemoteEntry {}
