import { Routes } from '@angular/router';
import { DocsHomeComponent } from './components/docs-home/docs-home.component';
import { TypeViewComponent } from './components/type-view/type-view.component';
import { CategoryViewComponent } from './components/category-view/category-view.component';
import { XmlTranslationStatsComponent } from './components/xml-translation-stats/xml-translation-stats.component';
import { SearchComponent } from './components/search/search.component';

export const routes: Routes = [
  { path: '', redirectTo: '/docs', pathMatch: 'full' },
  { path: 'docs', component: DocsHomeComponent },
  { path: 'docs/category/:category', component: CategoryViewComponent },
  { path: 'docs/type/:typeName', component: TypeViewComponent },
  { path: 'docs/xml-translation-stats', component: XmlTranslationStatsComponent },
  { path: 'search', component: SearchComponent },
  { path: '**', redirectTo: '/docs' }
];
