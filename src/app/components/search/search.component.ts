import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DocsService } from '../../services/docs.service';
import { SearchResult } from '../../models/docs.models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
  searchQuery = signal('');
  searchResults = signal<SearchResult[]>([]);
  loading = signal(false);
  hasSearched = signal(false);

  constructor(
    private docsService: DocsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const query = params['q'];
      if (query) {
        this.searchQuery.set(query);
        this.performSearch(query);
      }
    });
  }

  onSearch() {
    const query = this.searchQuery().trim();
    if (query) {
      this.performSearch(query);
    }
  }

  private performSearch(query: string) {
    this.loading.set(true);
    this.hasSearched.set(true);
    
    // Ensure docs are loaded before searching
    this.docsService.loadDocs().subscribe({
      next: () => {
        // Perform search
        this.docsService.search(query).subscribe({
          next: (results) => {
            this.searchResults.set(results);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Error during search:', err);
            this.loading.set(false);
            this.searchResults.set([]);
          }
        });
      },
      error: (err) => {
        console.error('Error loading docs for search:', err);
        this.loading.set(false);
        this.searchResults.set([]);
      }
    });
  }

  getTypeIcon(type: any): string {
    switch (type.kind) {
      case 'class': return '🔷';
      case 'interface': return '🔶';
      case 'struct': return '🔸';
      case 'enum': return '🔹';
      default: return '📄';
    }
  }

  getMatchTypeLabel(matchType: string): string {
    switch (matchType) {
      case 'name': return 'Name match';
      case 'signature': return 'Method match';
      case 'file': return 'File match';
      default: return 'Match';
    }
  }

  getMatchTypeColor(matchType: string): string {
    switch (matchType) {
      case 'name': return '#ff6b35';
      case 'signature': return '#4fc3f7';
      case 'file': return '#81c784';
      default: return '#888';
    }
  }

  trackByTypeName(index: number, result: SearchResult): string {
    return result.type.name;
  }

  trackBySignature(index: number, member: any): string {
    return member.signature;
  }

  getNamespaceDisplayName(namespace: string): string {
    return namespace === '<global>' ? 'Global' : namespace;
  }

  getCategoryDisplayName(category: string): string {
    return this.docsService.getCategoryDisplayName(category);
  }

  getCategoryRoute(category: string): string {
    return this.docsService.getCategoryRoute(category);
  }
}
