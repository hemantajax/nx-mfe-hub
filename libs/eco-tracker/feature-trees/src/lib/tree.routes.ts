import { Route } from '@angular/router';

export const TREE_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./tree-list/tree-list.component').then((m) => m.TreeListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./tree-form/tree-form.component').then((m) => m.TreeFormComponent),
  },
  {
    path: 'species',
    loadComponent: () => import('./species-list/species-list.component').then((m) => m.SpeciesListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./tree-detail/tree-detail.component').then((m) => m.TreeDetailComponent),
  },
];
