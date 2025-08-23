import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocsService } from '../../services/docs.service';
import { Namespace, Type } from '../../models/docs.models';

@Component({
  selector: 'app-docs-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './docs-home.component.html',
  styleUrls: ['./docs-home.component.scss']
})
export class DocsHomeComponent implements OnInit {
  namespaces = signal<Namespace[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  stats = signal({
    totalTypes: 0,
    totalNamespaces: 0,
    generatedAt: ''
  });
  
  // Pagination state for types display
  namespacePagination = signal<{[key: string]: {page: number, types: Type[]}}>({});
  readonly PREVIEW_TYPE_LIMIT = 10; // Show first 10 types as preview

  constructor(private docsService: DocsService) {}

  ngOnInit() {
    this.loading.set(true);
    this.docsService.loadDocs().subscribe({
      next: (data) => {
        const namespaces = this.docsService.getNamespaces();
        this.namespaces.set(namespaces);
        
        // Load preview types for each namespace
        this.loadNamespaceTypePreviews(namespaces);
        
        this.stats.set({
          totalTypes: data.total_types,
          totalNamespaces: 1, // Single global namespace in new structure
          generatedAt: new Date(data.generated_at).toLocaleDateString()
        });
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Failed to load documentation data');
        this.loading.set(false);
        console.error('Error loading docs:', err);
      }
    });
  }

  private loadNamespaceTypePreviews(namespaces: Namespace[]) {
    const pagination: {[key: string]: {page: number, types: Type[]}} = {};
    
    namespaces.forEach(namespace => {
      // Load only first page (preview) of types for each namespace
      this.docsService.getNamespaceTypes(namespace.name, 0).subscribe(types => {
        pagination[namespace.name] = {
          page: 0,
          types: types.slice(0, this.PREVIEW_TYPE_LIMIT)
        };
        this.namespacePagination.set({...pagination});
      });
    });
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

  trackByNamespace(index: number, namespace: Namespace): string {
    return namespace.name;
  }

  trackByType(index: number, type: Type): string {
    return type.name;
  }

  getDisplayName(name: string): string {
    return name === '<global>' ? 'Global Namespace' : name;
  }

  getTypesForNamespace(namespaceName: string): Type[] {
    const pagination = this.namespacePagination();
    return pagination[namespaceName]?.types || [];
  }

  getTotalTypeCount(namespaceName: string): number {
    return this.docsService.getNamespaceTypeCount(namespaceName);
  }

  getDisplayedTypeCount(namespaceName: string): number {
    return this.getTypesForNamespace(namespaceName).length;
  }

  hasMoreTypes(namespaceName: string): boolean {
    return this.getTotalTypeCount(namespaceName) > this.getDisplayedTypeCount(namespaceName);
  }
}
