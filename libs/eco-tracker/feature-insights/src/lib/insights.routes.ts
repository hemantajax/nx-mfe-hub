import { Route } from '@angular/router';

export const INSIGHTS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./insights-page/insights-page.component').then((m) => m.InsightsPageComponent),
  },
  {
    path: 'goals',
    loadComponent: () => import('./goals-page/goals-page.component').then((m) => m.GoalsPageComponent),
  },
  {
    path: 'achievements',
    loadComponent: () => import('./achievements-page/achievements-page.component').then((m) => m.AchievementsPageComponent),
  },
];
