import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DocsService } from '../../services/docs.service';
import { Namespace, Type } from '../../models/docs.models';

@Component({
  selector: 'app-namespace-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './namespace-view.component.html',
  styleUrls: ['./namespace-view.component.scss']
})
export class NamespaceViewComponent implements OnInit {
  namespace = signal<Namespace | null>(null);
  namespaceName = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Pagination
  currentPage = signal(0);
  types = signal<Type[]>([]);
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
      const namespaceName = params['namespace'];
      if (namespaceName) {
        this.namespaceName.set(namespaceName);
        this.loadNamespace(namespaceName);
      }
    });
  }

  private loadNamespace(name: string) {
    // First load the namespace metadata
    this.docsService.loadDocs().subscribe({
      next: () => {
        const namespace = this.docsService.getNamespace(name);
        if (namespace) {
          this.namespace.set(namespace);
          this.totalTypes.set(this.docsService.getNamespaceTypeCount(name));
          this.totalPages.set(this.docsService.getNamespacePageCount(name));
          
          // Load first page of types
          this.loadTypes(0);
        } else {
          this.error.set(`Namespace '${name}' not found`);
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set('Failed to load namespace data');
        this.loading.set(false);
        console.error('Error loading namespace:', err);
      }
    });
  }

  private loadTypes(page: number) {
    this.loadingMore.set(true);
    
    this.docsService.getNamespaceTypes(this.namespaceName(), page).subscribe({
      next: (newTypes) => {
        if (page === 0) {
          // First page - replace all types
          this.types.set(newTypes);
        } else {
          // Additional page - append to existing types
          this.types.set([...this.types(), ...newTypes]);
        }
        
        this.currentPage.set(page);
        this.loadingMore.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load types');
        this.loadingMore.set(false);
        this.loading.set(false);
        console.error('Error loading types:', err);
      }
    });
  }

  loadMoreTypes() {
    const nextPage = this.currentPage() + 1;
    if (nextPage < this.totalPages()) {
      this.loadTypes(nextPage);
    }
  }

  hasMoreTypes(): boolean {
    return this.currentPage() + 1 < this.totalPages();
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
    if (type.member_count === 1) return '1 member';
    return `${type.member_count} members`;
  }

  trackByType(index: number, type: Type): string {
    return type.name;
  }

  trackBySignature(index: number, member: any): string {
    return member.signature;
  }

  getDisplayName(name: string): string {
    return name === '<global>' ? 'Global Namespace' : name;
  }
}
