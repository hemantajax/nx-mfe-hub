import { Route } from '@angular/router';

export const COMMUNITY_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./community-list/community-list.component').then((m) => m.CommunityListComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./community-settings/community-settings.component').then((m) => m.CommunitySettingsComponent),
  },
  {
    path: ':uid',
    loadComponent: () => import('./community-detail/community-detail.component').then((m) => m.CommunityDetailComponent),
  },
];
