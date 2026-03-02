import { Route } from '@angular/router';
import { RemoteEntry } from './entry';
import { HomeComponent } from './home.component';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    children: [{ path: '', component: HomeComponent }],
  },
];
