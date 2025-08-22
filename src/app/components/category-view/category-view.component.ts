import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DocsService } from '../../services/docs.service';
import { Type } from '../../models/docs.models';

@Component({
  selector: 'app-category-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './category-view.component.html',
  styleUrls: ['./category-view.component.scss']
})
export class CategoryViewComponent implements OnInit {
  category = signal<'class' | 'enum' | 'interface' | 'struct'>('class');
  types = signal<Type[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Pagination
  currentPage = signal(0);
  totalPages = signal(0);
  totalTypes = signal(0);
  loadingMore = signal(false);

  constructor(
    private docsService: DocsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loading.set(true);
    
    this.route.params.subscribe(params => {
      const categoryParam = params['category'] as 'class' | 'enum' | 'interface' | 'struct';
      this.category.set(categoryParam);
      this.loadCategory(categoryParam);
    });
  }

  private loadCategory(category: 'class' | 'enum' | 'interface' | 'struct') {
    this.docsService.loadDocs().subscribe({
      next: () => {
        this.loadTypes(0);
        this.totalTypes.set(this.docsService.getCategoryCount(category));
        this.totalPages.set(this.docsService.getCategoryPageCount(category));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load category data');
        this.loading.set(false);
        console.error('Error loading category:', err);
      }
    });
  }

  private loadTypes(page: number) {
    this.docsService.getTypesByCategoryPaginated(this.category(), page).subscribe({
      next: (types) => {
        if (page === 0) {
          this.types.set(types);
        } else {
          this.types.update(current => [...current, ...types]);
        }
        this.currentPage.set(page);
        this.loadingMore.set(false);
      },
      error: (err) => {
        console.error('Error loading types:', err);
        this.loadingMore.set(false);
      }
    });
  }

  loadMoreTypes() {
    if (this.hasMoreTypes()) {
      this.loadingMore.set(true);
      this.loadTypes(this.currentPage() + 1);
    }
  }

  hasMoreTypes(): boolean {
    return this.currentPage() < this.totalPages() - 1;
  }

  getTypeIcon(type: Type): string {
    switch (type.kind) {
      case 'class': return '🔷';
      case 'interface': return '🔶';
      case 'struct': return '🔸';
      case 'enum': return '🔹';
      default: return '📄';
    }
  }

  getMemberCount(type: Type): string {
    if (type.member_count === 0) return 'No members';
    return `${type.member_count} member${type.member_count !== 1 ? 's' : ''}`;
  }

  getCategoryDisplayName(): string {
    const category = this.category();
    return category.charAt(0).toUpperCase() + category.slice(1) + 
           (category === 'class' ? 'es' : category === 'interface' ? 's' : 's');
  }

  trackByType(index: number, type: Type): string {
    return type.name;
  }
}
