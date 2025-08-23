import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SearchResult, Type } from '../models/docs.models';
import { APP_CONSTANTS } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchCache = new Map<string, SearchResult[]>();
  private readonly SEARCH_RESULT_LIMIT = APP_CONSTANTS.SEARCH_RESULT_LIMIT;

  constructor() {}

  search(query: string, allTypes: Type[]): Observable<SearchResult[]> {
    if (!query.trim()) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    // Check cache first
    const cacheKey = query.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      return new Observable(observer => {
        observer.next(this.searchCache.get(cacheKey)!);
        observer.complete();
      });
    }

    return new Observable(observer => {
      const results: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      for (const type of allTypes) {
        let relevance = 0;
        let matchType: 'name' | 'signature' | 'file' = 'name';

        // Check type name
        if (type.name.toLowerCase().includes(lowerQuery)) {
          relevance += 10;
          if (type.name.toLowerCase().startsWith(lowerQuery)) {
            relevance += 5;
          }
        }

        // Check file name
        if (type.file.toLowerCase().includes(lowerQuery)) {
          relevance += 3;
          matchType = 'file';
        }

        // Check access modifier
        if (type.access_modifier && type.access_modifier.toLowerCase().includes(lowerQuery)) {
          relevance += 3;
        }

        // Check modifiers
        if (type.modifiers) {
          for (const modifier of type.modifiers) {
            if (modifier.toLowerCase().includes(lowerQuery)) {
              relevance += 3;
            }
          }
        }

        // Limit member search for performance on large datasets
        const memberLimit = 10;
        for (let j = 0; j < Math.min(type.members.length, memberLimit); j++) {
          const member = type.members[j];
          
          if (member.signature.toLowerCase().includes(lowerQuery)) {
            relevance += 2;
            matchType = 'signature';
          }
          
          if (member.name && member.name.toLowerCase().includes(lowerQuery)) {
            relevance += 3;
            matchType = 'signature';
          }

          if (member.return_type && member.return_type.toLowerCase().includes(lowerQuery)) {
            relevance += 2;
            matchType = 'signature';
          }

          if (member.access_modifier && member.access_modifier.toLowerCase().includes(lowerQuery)) {
            relevance += 2;
            matchType = 'signature';
          }
        }

        if (relevance > 0) {
          results.push({
            type,
                         namespace: APP_CONSTANTS.DEFAULTS.GLOBAL_NAMESPACE,
            category: type.kind,
            matchType,
            relevance
          });
        }
      }

      // Sort by relevance and limit results
      const sortedResults = results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, this.SEARCH_RESULT_LIMIT);
      
      // Cache results
      this.searchCache.set(cacheKey, sortedResults);
      observer.next(sortedResults);
      observer.complete();
    });
  }

  clearCache(): void {
    this.searchCache.clear();
  }
}
