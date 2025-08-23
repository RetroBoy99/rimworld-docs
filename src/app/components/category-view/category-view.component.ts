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
  totalTypes = signal(0);
  loadingMore = signal(false);
  
  // Filtering
  allTypes = signal<Type[]>([]);
  accessModifierFilter = signal<string>('all'); // 'all', 'public', 'private', 'protected', 'internal'
  modifierFilters = signal<{[key: string]: boolean}>({});
  searchQuery = signal<string>('');

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
        // Load all types for filtering
        this.docsService.getAllTypesByCategory(category).subscribe({
          next: (allCategoryTypes: Type[]) => {
            this.allTypes.set(allCategoryTypes);
            
            // Initialize modifier filters based on available modifiers
            this.initializeModifierFilters(allCategoryTypes);
            
            // Apply filters and load initial page
            this.applyFiltersAndUpdateDisplay();
            this.loading.set(false);
          },
          error: (err: any) => {
            this.error.set('Failed to load category data');
            this.loading.set(false);
            console.error('Error loading category types:', err);
          }
        });
      },
      error: (err: any) => {
        this.error.set('Failed to load category data');
        this.loading.set(false);
        console.error('Error loading category:', err);
      }
    });
  }



  loadMoreTypes() {
    if (this.hasMoreTypes()) {
      this.loadingMore.set(true);
      const filteredTypes = this.getFilteredTypes();
      this.loadFilteredTypesPage(this.currentPage() + 1, filteredTypes);
    }
  }

  hasMoreTypes(): boolean {
    const filteredTypes = this.getFilteredTypes();
    const totalPages = Math.ceil(filteredTypes.length / 50);
    return this.currentPage() < totalPages - 1;
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

  // Filtering methods
  private initializeModifierFilters(types: Type[]): void {
    const allModifiers = new Set<string>();
    types.forEach(type => {
      type.modifiers.forEach(modifier => allModifiers.add(modifier));
    });
    
    const modifierFilters: {[key: string]: boolean} = {};
    allModifiers.forEach(modifier => {
      modifierFilters[modifier] = true;
    });
    
    this.modifierFilters.set(modifierFilters);
  }

  private applyFiltersAndUpdateDisplay(): void {
    const filteredTypes = this.getFilteredTypes();
    this.totalTypes.set(filteredTypes.length);
    this.currentPage.set(0);
    
    // Load first page of filtered types
    this.loadFilteredTypesPage(0, filteredTypes);
  }

  private loadFilteredTypesPage(page: number, filteredTypes: Type[]): void {
    const startIndex = page * 50;
    const endIndex = startIndex + 50;
    const pageTypes = filteredTypes.slice(startIndex, endIndex);
    
    if (page === 0) {
      this.types.set(pageTypes);
    } else {
      this.types.update(current => [...current, ...pageTypes]);
    }
    this.currentPage.set(page);
    this.loadingMore.set(false);
  }

  private getFilteredTypes(): Type[] {
    let filtered = this.allTypes();
    
    // Apply search query filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(type => 
        type.name.toLowerCase().includes(query) ||
        type.file.toLowerCase().includes(query)
      );
    }
    
    // Apply access modifier filter
    const accessFilter = this.accessModifierFilter();
    if (accessFilter !== 'all') {
      filtered = filtered.filter(type => type.access_modifier === accessFilter);
    }
    
    // Apply modifier filters
    const modifierFilters = this.modifierFilters();
    const activeModifiers = Object.keys(modifierFilters).filter(mod => modifierFilters[mod]);
    if (activeModifiers.length > 0 && activeModifiers.length < Object.keys(modifierFilters).length) {
      filtered = filtered.filter(type => 
        type.modifiers.some(modifier => activeModifiers.includes(modifier))
      );
    }
    
    return filtered;
  }

  // Filter controls
  updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.applyFiltersAndUpdateDisplay();
  }

  updateAccessModifierFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.accessModifierFilter.set(target?.value || 'all');
    this.applyFiltersAndUpdateDisplay();
  }

  toggleModifierFilter(modifier: string): void {
    const current = this.modifierFilters();
    this.modifierFilters.set({
      ...current,
      [modifier]: !current[modifier]
    });
    this.applyFiltersAndUpdateDisplay();
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.accessModifierFilter.set('all');
    const modifierFilters = this.modifierFilters();
    const resetFilters: {[key: string]: boolean} = {};
    Object.keys(modifierFilters).forEach(key => {
      resetFilters[key] = true;
    });
    this.modifierFilters.set(resetFilters);
    this.applyFiltersAndUpdateDisplay();
  }

  getAvailableAccessModifiers(): string[] {
    const modifiers = new Set<string>();
    this.allTypes().forEach(type => {
      if (type.access_modifier) {
        modifiers.add(type.access_modifier);
      }
    });
    return Array.from(modifiers).sort();
  }

  getAvailableModifiers(): string[] {
    return Object.keys(this.modifierFilters());
  }

  getModifierCount(modifier: string): number {
    return this.allTypes().filter(type => type.modifiers.includes(modifier)).length;
  }
}
