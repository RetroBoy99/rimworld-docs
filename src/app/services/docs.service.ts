import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, BehaviorSubject, of, forkJoin } from 'rxjs';
import { DocsIndex, Namespace, Type, SearchResult, CategorizedDocs, Member, OverrideInfo } from '../models/docs.models';

@Injectable({
  providedIn: 'root'
})
export class DocsService {
  private docsData = signal<DocsIndex | null>(null);
  private categorizedData = signal<CategorizedDocs | null>(null);
  private loading = signal(false);
  private error = signal<string | null>(null);
  
  // Legacy support - will be replaced by categorized approach
  private loadedTypes = new Map<string, Type[]>(); 
  private typeLoadingState = new BehaviorSubject<{[key: string]: boolean}>({});
  private searchCache = new Map<string, SearchResult[]>();
  
  // Pagination settings
  private readonly PAGE_SIZE = 50;
  private readonly SEARCH_RESULT_LIMIT = 100;

  constructor(private http: HttpClient) {}

  // Type linking utilities
  findTypeReferences(text: string): Array<{typeName: string, exists: boolean}> {
    const typePattern = /\b([A-Z][a-zA-Z0-9_]*(?:<[^>]+>)?)\b/g;
    const matches = [...text.matchAll(typePattern)];
    const uniqueTypes = new Set(matches.map(m => m[1]));
    
    return Array.from(uniqueTypes).map(typeName => ({
      typeName: this.cleanTypeName(typeName),
      exists: this.typeExists(this.cleanTypeName(typeName))
    }));
  }

  private cleanTypeName(typeName: string): string {
    // Remove generic parameters for lookup
    return typeName.split('<')[0];
  }

  typeExists(typeName: string): boolean {
    // Try categorized data first
    const categorizedData = this.categorizedData();
    if (categorizedData) {
      return categorizedData.typeIndex.has(typeName);
    }

    // If data isn't loaded yet, be optimistic for common type names
    if (this.loadedTypes.size === 0) {
      // Return true for likely type names to enable linking
      return /^[A-Z][a-zA-Z0-9_]*$/.test(typeName) && typeName.length > 2;
    }
    
    return this.getType(typeName) !== null;
  }

  // Enhanced signature formatting with clean syntax highlighting
  formatSignatureWithLinks(signature: string): string {
    let formattedSignature = signature;
    
    // Apply clean syntax highlighting without type links
    formattedSignature = formattedSignature
      .replace(/(public|private|protected|internal|static|override|virtual|abstract|readonly)/g, '<span class="keyword">$1</span>')
      .replace(/(\w+)\s+(\w+)\s*\(/g, '<span class="return-type">$1</span> <span class="method-name">$2</span>(')
      .replace(/(\w+)\s*:\s*(\w+)/g, '<span class="param-name">$1</span>: <span class="param-type">$2</span>');
    
    return formattedSignature;
  }

  // Get referenced types from a signature for separate display
  getReferencedTypes(signature: string): Array<{typeName: string, exists: boolean}> {
    const typeReferences = this.findTypeReferences(signature);
    return typeReferences.filter(({typeName, exists}) => 
      exists && 
      typeName.length > 2 && 
      !['bool', 'void', 'string', 'int', 'object', 'float', 'double', 'long', 'short', 'byte', 'char'].includes(typeName.toLowerCase())
    );
  }

  loadDocs(): Observable<DocsIndex> {
    if (this.docsData()) {
      return of(this.docsData()!);
    }

    this.loading.set(true);
    this.error.set(null);

    return this.http.get<DocsIndex>('assets/docs_index.gz').pipe(
      map(data => {
        // Store the data and prepare for lazy loading
        this.docsData.set(data);
        this.loading.set(false);
        
        // Store all types in a single "global" namespace for lazy loading
        this.storeFullDataForLazyLoading(data);
        
        return data;
      }),
      shareReplay(1)
    );
  }

  private storeFullDataForLazyLoading(fullData: DocsIndex) {
    // Store all types in a global namespace since the new structure is flat
    this.loadedTypes.set('<global>', fullData.types);
    
    // Create categorized data structure
    this.categorizedData.set(this.categorizeData(fullData));
  }

  private categorizeData(rawData: DocsIndex): CategorizedDocs {
    const categorized: CategorizedDocs = {
      metadata: {
        generated_at: rawData.generated_at,
        total_types: rawData.total_types,
        total_members: rawData.total_members,
        type_counts: { ...rawData.type_counts }
      },
      categories: {
        classes: new Map<string, Type>(),
        enums: new Map<string, Type>(),
        interfaces: new Map<string, Type>(),
        structs: new Map<string, Type>()
      },
      typeIndex: new Map<string, Type>(),
      memberIndex: new Map<string, Member[]>(),
      inheritance: new Map<string, string[]>(),
      references: new Map<string, Set<string>>(),
      overrides: new Map<string, OverrideInfo>()
    };

    // Categorize types and build indexes
    for (const type of rawData.types) {
      // Add to category-specific map
      switch (type.kind) {
        case 'class':
          categorized.categories.classes.set(type.name, type);
          break;
        case 'enum':
          categorized.categories.enums.set(type.name, type);
          break;
        case 'interface':
          categorized.categories.interfaces.set(type.name, type);
          break;
        case 'struct':
          categorized.categories.structs.set(type.name, type);
          break;
      }

      // Add to general index
      categorized.typeIndex.set(type.name, type);
      
      // Index members by type
      categorized.memberIndex.set(type.name, type.members);

      // Store inheritance information
      if (type.base_types && type.base_types.length > 0) {
        categorized.inheritance.set(type.name, type.base_types);
      }

      // Build cross-references from member signatures
      this.buildCrossReferences(type, categorized.references);
    }

    // Build override relationships after all types are indexed
    this.buildOverrideRelationships(categorized);

    return categorized;
  }

  private buildCrossReferences(type: Type, references: Map<string, Set<string>>) {
    // Analyze member signatures to find type references
    for (const member of type.members) {
      const referencedTypes = this.findTypeReferences(member.signature);
      
      for (const { typeName } of referencedTypes) {
        if (!references.has(typeName)) {
          references.set(typeName, new Set<string>());
        }
        references.get(typeName)!.add(type.name);
      }
    }
  }

  private buildOverrideRelationships(categorized: CategorizedDocs) {
    // First pass: identify override methods and what they override
    for (const type of categorized.typeIndex.values()) {
      if (!type.base_types || type.base_types.length === 0) continue;

      for (const member of type.members) {
        if (member.modifiers.includes('override')) {
          const memberKey = `${type.name}.${member.name}`;
          
          // Find what this method overrides in base classes
          const overridesMethod = this.findOverriddenMethod(type, member, categorized);
          
          if (overridesMethod) {
            categorized.overrides.set(memberKey, {
              overrides: overridesMethod,
              overriddenBy: []
            });
          }
        }
      }
    }

    // Second pass: build reverse relationships (what overrides this method)
    for (const [memberKey, overrideInfo] of categorized.overrides.entries()) {
      if (overrideInfo.overrides) {
        const baseMemberKey = overrideInfo.overrides;
        
        // Get or create override info for the base method
        let baseOverrideInfo = categorized.overrides.get(baseMemberKey);
        if (!baseOverrideInfo) {
          baseOverrideInfo = { overriddenBy: [] };
          categorized.overrides.set(baseMemberKey, baseOverrideInfo);
        }
        
        // Add this method to the base method's overridden list
        baseOverrideInfo.overriddenBy.push(memberKey);
      }
    }
  }

  private findOverriddenMethod(type: Type, member: Member, categorized: CategorizedDocs): string | undefined {
    // Look through base types to find the method being overridden
    for (const baseTypeName of type.base_types) {
      const baseType = categorized.typeIndex.get(baseTypeName);
      if (!baseType) continue;

      // Look for method with same name in base type
      const baseMethod = baseType.members.find(m => 
        m.name === member.name && 
        (m.kind === member.kind || (m.kind === 'method' && member.kind === 'method'))
      );

      if (baseMethod) {
        return `${baseType.name}.${baseMethod.name}`;
      }

      // Recursively check base types of the base type
      if (baseType.base_types && baseType.base_types.length > 0) {
        const result = this.findOverriddenMethod(baseType, member, categorized);
        if (result) return result;
      }
    }

    return undefined;
  }

  getDocsData() {
    return this.docsData;
  }

  getCategorizedData() {
    return this.categorizedData;
  }

  getLoading() {
    return this.loading;
  }

  getError() {
    return this.error;
  }

  // Category-based API methods
  getTypesByCategory(category: 'class' | 'enum' | 'interface' | 'struct'): Type[] {
    const data = this.categorizedData();
    if (!data) return [];
    
    const categoryMap = data.categories[category === 'class' ? 'classes' : 
                                       category === 'enum' ? 'enums' :
                                       category === 'interface' ? 'interfaces' : 'structs'];
    
    return Array.from(categoryMap.values());
  }

  getTypesByCategoryPaginated(category: 'class' | 'enum' | 'interface' | 'struct', page: number = 0): Observable<Type[]> {
    const allTypes = this.getTypesByCategory(category);
    const startIndex = page * this.PAGE_SIZE;
    const endIndex = startIndex + this.PAGE_SIZE;
    return of(allTypes.slice(startIndex, endIndex));
  }

  getCategoryCount(category: 'class' | 'enum' | 'interface' | 'struct'): number {
    const data = this.categorizedData();
    if (!data) return 0;
    return data.metadata.type_counts[category];
  }

  getCategoryPageCount(category: 'class' | 'enum' | 'interface' | 'struct'): number {
    const typeCount = this.getCategoryCount(category);
    return Math.ceil(typeCount / this.PAGE_SIZE);
  }

  getTypeReferences(typeName: string): string[] {
    const data = this.categorizedData();
    if (!data) return [];
    
    const refs = data.references.get(typeName);
    return refs ? Array.from(refs) : [];
  }

  getAllCategories(): Array<{category: string, count: number, types: Type[]}> {
    const data = this.categorizedData();
    if (!data) return [];

    return [
      { 
        category: 'class', 
        count: data.metadata.type_counts.class, 
        types: Array.from(data.categories.classes.values()) 
      },
      { 
        category: 'enum', 
        count: data.metadata.type_counts.enum, 
        types: Array.from(data.categories.enums.values()) 
      },
      { 
        category: 'interface', 
        count: data.metadata.type_counts.interface, 
        types: Array.from(data.categories.interfaces.values()) 
      },
      { 
        category: 'struct', 
        count: data.metadata.type_counts.struct, 
        types: Array.from(data.categories.structs.values()) 
      }
    ];
  }

  // Helper methods for category display and routing
  getCategoryDisplayName(category: string): string {
    switch (category) {
      case 'class': return 'Classes';
      case 'enum': return 'Enums';
      case 'interface': return 'Interfaces';
      case 'struct': return 'Structs';
      default: return 'Types';
    }
  }

  getCategoryRoute(category: string): string {
    return `/docs/category/${category}`;
  }

  getInheritance(typeName: string): string[] {
    const data = this.categorizedData();
    if (!data) return [];
    
    const inheritance = data.inheritance.get(typeName);
    return inheritance ? inheritance : [];
  }

  getOverrideInfo(typeName: string, memberName: string): OverrideInfo | null {
    const data = this.categorizedData();
    if (!data) return null;
    
    const memberKey = `${typeName}.${memberName}`;
    return data.overrides.get(memberKey) || null;
  }

  // Parse a member key like "TypeName.MethodName" into parts
  parseMemberKey(memberKey: string): { typeName: string; memberName: string } {
    const lastDotIndex = memberKey.lastIndexOf('.');
    return {
      typeName: memberKey.substring(0, lastDotIndex),
      memberName: memberKey.substring(lastDotIndex + 1)
    };
  }

  getNamespaces(): Namespace[] {
    const data = this.docsData();
    if (!data) return [];
    
    // Create a virtual global namespace from the flat structure
    return [{
      name: '<global>',
      type_count: data.total_types,
      types: [] // Will be loaded lazily
    }];
  }

  // Get types for a namespace with pagination
  getNamespaceTypes(namespaceName: string, page: number = 0): Observable<Type[]> {
    const allTypes = this.loadedTypes.get(namespaceName) || [];
    const startIndex = page * this.PAGE_SIZE;
    const endIndex = startIndex + this.PAGE_SIZE;
    
    return of(allTypes.slice(startIndex, endIndex));
  }

  // Get total count of types in a namespace
  getNamespaceTypeCount(namespaceName: string): number {
    const allTypes = this.loadedTypes.get(namespaceName) || [];
    return allTypes.length;
  }

  // Get total pages for a namespace
  getNamespacePageCount(namespaceName: string): number {
    const typeCount = this.getNamespaceTypeCount(namespaceName);
    return Math.ceil(typeCount / this.PAGE_SIZE);
  }

  getNamespace(name: string): Namespace | null {
    const data = this.docsData();
    if (!data) return null;
    
    // Return virtual global namespace
    if (name === '<global>') {
      return {
        name: '<global>',
        type_count: data.total_types,
        types: [] // Will be loaded lazily
      };
    }
    
    return null;
  }

  getType(typeName: string): { type: Type; namespace: string; category: string } | null {
    // Try categorized data first (faster lookup)
    const categorizedData = this.categorizedData();
    if (categorizedData) {
      const type = categorizedData.typeIndex.get(typeName);
      if (type) {
        return { 
          type, 
          namespace: '<global>',
          category: type.kind // class, enum, interface, struct
        };
      }
    }

    // Fallback to legacy method
    for (const [namespaceName, types] of this.loadedTypes.entries()) {
      const type = types.find(t => t.name === typeName);
      if (type) {
        return { 
          type, 
          namespace: namespaceName,
          category: type.kind
        };
      }
    }
    return null;
  }

  // Async version that ensures data is loaded
  getTypeAsync(typeName: string): Observable<{ type: Type; namespace: string; category: string } | null> {
    // First check if data is already loaded
    const result = this.getType(typeName);
    if (result) {
      return of(result);
    }

    // If not found and data isn't loaded yet, load it first
    if (this.loadedTypes.size === 0) {
      return this.loadDocs().pipe(
        map(() => this.getType(typeName))
      );
    }

    // Data is loaded but type not found
    return of(null);
  }

  search(query: string): Observable<SearchResult[]> {
    if (!query.trim()) {
      return of([]);
    }

    // Check cache first
    const cacheKey = query.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      console.log('Search results from cache for:', query);
      return of(this.searchCache.get(cacheKey)!);
    }

    console.log('Starting search for:', query);
    return new Observable(observer => {
      const results: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();
      let processedNamespaces = 0;

      // Process search in chunks to avoid blocking UI
      const processChunk = () => {
        const namespaceEntries = Array.from(this.loadedTypes.entries());
        const chunkSize = 1; // Process one namespace at a time
        
        if (processedNamespaces >= namespaceEntries.length) {
          // Finished processing all namespaces
          const sortedResults = results
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, this.SEARCH_RESULT_LIMIT);
          
          // Cache results
          this.searchCache.set(cacheKey, sortedResults);
          console.log(`Search completed: found ${sortedResults.length} results (limited from ${results.length})`);
          
          observer.next(sortedResults);
          observer.complete();
          return;
        }

        // Process current chunk
        for (let i = 0; i < chunkSize && processedNamespaces < namespaceEntries.length; i++) {
          const [namespaceName, types] = namespaceEntries[processedNamespaces];
          
          for (const type of types) {
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
                namespace: namespaceName,
                category: type.kind,
                matchType,
                relevance
              });
            }
          }
          
          processedNamespaces++;
        }

        // Continue processing in next tick to avoid blocking UI
        setTimeout(processChunk, 0);
      };

      // Start processing
      processChunk();
    });
  }
}
