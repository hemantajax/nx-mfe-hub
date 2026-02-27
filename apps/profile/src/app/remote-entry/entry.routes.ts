import { Route } from '@angular/router';
import { RemoteEntry } from './entry';
import { HomeComponent } from './home.component';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    children: [
      { path: '', component: HomeComponent },
      {
        path: 'theme-preview',
        loadComponent: () =>
          import('@ng-mfe-hub/ui').then(m => m.ThemePreviewComponent),
      },
    ],
  },
];
