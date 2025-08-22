import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/docs', pathMatch: 'full' },
  { path: 'docs', loadComponent: () => import('./components/docs-home/docs-home.component').then(m => m.DocsHomeComponent) },
  { path: 'docs/namespace/:namespace', loadComponent: () => import('./components/namespace-view/namespace-view.component').then(m => m.NamespaceViewComponent) },
  { path: 'docs/category/:category', loadComponent: () => import('./components/category-view/category-view.component').then(m => m.CategoryViewComponent) },
  { path: 'docs/type/:typeName', loadComponent: () => import('./components/type-view/type-view.component').then(m => m.TypeViewComponent) },
  { path: 'search', loadComponent: () => import('./components/search/search.component').then(m => m.SearchComponent) }
];
