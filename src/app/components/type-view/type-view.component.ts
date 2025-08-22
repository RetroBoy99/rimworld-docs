import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { DocsService } from '../../services/docs.service';
import { Type } from '../../models/docs.models';

@Component({
  selector: 'app-type-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './type-view.component.html',
  styleUrls: ['./type-view.component.scss']
})
export class TypeViewComponent implements OnInit {
  type = signal<Type | null>(null);
  namespace = signal<string>('');
  category = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private docsService: DocsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loading.set(true);
    
    this.route.params.subscribe(params => {
      const typeName = params['typeName'];
      if (typeName) {
        this.loadType(typeName);
      }
    });
  }

  private loadType(typeName: string) {
    this.docsService.getTypeAsync(typeName).subscribe({
      next: (result) => {
        if (result) {
          this.type.set(result.type);
          this.namespace.set(result.namespace);
          this.category.set(result.category);
          this.loading.set(false);
        } else {
          this.error.set(`Type '${typeName}' not found`);
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set('Failed to load type data');
        this.loading.set(false);
        console.error('Error loading type:', err);
      }
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

  getMemberIcon(member: any): string {
    switch (member.kind) {
      case 'method': return '⚡';
      case 'property': return '🔧';
      case 'field': return '📦';
      case 'constructor': return '🏗️';
      default: return '📄';
    }
  }

  formatSignature(signature: string): string {
    // Use the enhanced signature formatting (clean syntax highlighting)
    return this.docsService.formatSignatureWithLinks(signature);
  }

  getReferencedTypes(signature: string): Array<{typeName: string, exists: boolean}> {
    return this.docsService.getReferencedTypes(signature);
  }

  trackBySignature(index: number, member: any): string {
    return member.signature;
  }

  getNamespaceDisplayName(namespace: string): string {
    return namespace === '<global>' ? 'Global' : namespace;
  }

  typeExists(typeName: string): boolean {
    // Use the service's typeExists method which handles loading states
    return this.docsService.typeExists(typeName);
  }

  getCategoryDisplayName(): string {
    return this.docsService.getCategoryDisplayName(this.category());
  }

  getCategoryRoute(): string {
    return this.docsService.getCategoryRoute(this.category());
  }
}
