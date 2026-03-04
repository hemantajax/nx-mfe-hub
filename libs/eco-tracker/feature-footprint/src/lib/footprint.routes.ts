import { Route } from '@angular/router';

export const FOOTPRINT_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./activity-log/activity-log.component').then((m) => m.ActivityLogComponent),
  },
  {
    path: 'log',
    loadComponent: () => import('./activity-form/activity-form.component').then((m) => m.ActivityFormComponent),
  },
  {
    path: 'breakdown',
    loadComponent: () => import('./breakdown/breakdown.component').then((m) => m.BreakdownComponent),
  },
];
