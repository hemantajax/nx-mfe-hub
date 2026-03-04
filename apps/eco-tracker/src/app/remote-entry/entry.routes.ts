import { Route } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { RemoteEntry } from './entry';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    providers: [provideHttpClient(), provideCharts(withDefaultRegisterables())],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@ng-mfe-hub/eco-tracker-feature-dashboard').then(
            (m) => m.DashboardPageComponent,
          ),
      },
      {
        path: 'trees',
        loadChildren: () =>
          import('@ng-mfe-hub/eco-tracker-feature-trees').then(
            (m) => m.TREE_ROUTES,
          ),
      },
      {
        path: 'footprint',
        loadChildren: () =>
          import('@ng-mfe-hub/eco-tracker-feature-footprint').then(
            (m) => m.FOOTPRINT_ROUTES,
          ),
      },
      {
        path: 'insights',
        loadChildren: () =>
          import('@ng-mfe-hub/eco-tracker-feature-insights').then(
            (m) => m.INSIGHTS_ROUTES,
          ),
      },
    ],
  },
];
