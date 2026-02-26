import { Routes } from '@angular/router';

export const FEATURE_USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/user-list').then((m) => m.UserList),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./containers/user-detail').then((m) => m.UserDetail),
  },
];
