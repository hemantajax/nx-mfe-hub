import { NxWelcome } from './nx-welcome';
import { Route } from '@angular/router';
import { loadRemote } from '@module-federation/enhanced/runtime';

export const appRoutes: Route[] = [
  {
    path: 'demos',
    loadChildren: () =>
      loadRemote<typeof import('demos/Routes')>('demos/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'theme',
    loadChildren: () =>
      loadRemote<typeof import('theme/Routes')>('theme/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'lab',
    loadChildren: () =>
      loadRemote<typeof import('lab/Routes')>('lab/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'profile',
    loadChildren: () =>
      loadRemote<typeof import('profile/Routes')>('profile/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      loadRemote<typeof import('dashboard/Routes')>('dashboard/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  {
    path: '',
    component: NxWelcome,
  },
];
