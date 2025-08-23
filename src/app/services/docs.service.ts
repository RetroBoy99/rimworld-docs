import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, of } from 'rxjs';
import { DocsIndex, Type, CategorizedDocs, Member, OverrideInfo } from '../models/docs.models';
import { SearchService } from './search.service';
import { CommentsService } from './comments.service';
import { XmlTranslationService } from './xml-translation.service';
import { UtilsService } from './utils.service';
import { APP_CONSTANTS } from '../constants/app.constants';

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
  
  // Pagination settings
  private readonly PAGE_SIZE = APP_CONSTANTS.PAGE_SIZE;

  constructor(
    private http: HttpClient,
    private searchService: SearchService,
    private commentsService: CommentsService,
    private xmlTranslationService: XmlTranslationService,
    private utilsService: UtilsService
  ) {}

  // Core data loading
  loadDocs(): Observable<DocsIndex> {
    if (this.docsData()) {
      return of(this.docsData()!);
    }

    this.loading.set(true);
    this.error.set(null);

    return this.http.get<DocsIndex>(APP_CONSTANTS.ASSETS.DOCS_INDEX).pipe(
      map(data => {
        this.docsData.set(data);
        this.loading.set(false);
        this.storeFullDataForLazyLoading(data);
        return data;
      }),
      shareReplay(1)
    );
  }

  // Type existence checking
  typeExists(typeName: string): boolean {
    // Try categorized data first
    const categorizedData = this.categorizedData();
    if (categorizedData) {
      return categorizedData.typeIndex.has(typeName);
    }

    // If data isn't loaded yet, be optimistic for common type names
    if (this.loadedTypes.size === 0) {
      return this.utilsService.isLikelyTypeName(typeName);
    }
    
    return this.getType(typeName) !== null;
  }

  // Type retrieval
  getType(typeName: string): { type: Type; namespace: string; category: string } | null {
    // Try categorized data first (faster lookup)
    const categorizedData = this.categorizedData();
    if (categorizedData) {
      const type = categorizedData.typeIndex.get(typeName);
      if (type) {
        return { 
          type, 
          namespace: '<global>',
          category: type.kind
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

  // Search functionality (delegated to SearchService)
  search(query: string): Observable<any[]> {
    const allTypes = this.loadedTypes.get('<global>') || [];
    return this.searchService.search(query, allTypes);
  }

  // Comments functionality (delegated to CommentsService)
  loadComments() { return this.commentsService.loadComments(); }
  getCommentForKey(key: string) { return this.commentsService.getCommentForKey(key); }
  generateTypeCommentKey(type: Type) { return this.commentsService.generateTypeCommentKey(type); }
  generateMemberCommentKey(type: Type, member: Member) { return this.commentsService.generateMemberCommentKey(type, member); }
  getTypeComment(type: Type) { return this.commentsService.getTypeComment(type); }
  getMemberComment(type: Type, member: Member) { return this.commentsService.getMemberComment(type, member); }
  getAllComments() { return this.commentsService.getAllComments(); }
  searchComments(query: string) { return this.commentsService.searchComments(query); }
  getCommentsStats() { return this.commentsService.getCommentsStats(); }

  // XML & Translation functionality (delegated to XmlTranslationService)
  loadXmlClassLinks() { return this.xmlTranslationService.loadXmlClassLinks(); }
  loadTranslationLinks() { return this.xmlTranslationService.loadTranslationLinks(); }
  getXmlUsageForClass(className: string) { return this.xmlTranslationService.getXmlUsageForClass(className); }
  getXmlTagGroupsForClass(className: string) { return this.xmlTranslationService.getXmlTagGroupsForClass(className); }
  getXmlUsageStats() { return this.xmlTranslationService.getXmlUsageStats(); }
  getTranslationUsageForKey(translationKey: string) { return this.xmlTranslationService.getTranslationUsageForKey(translationKey); }
  getTranslationKeysForFile(csharpFile: string) { return this.xmlTranslationService.getTranslationKeysForFile(csharpFile); }
  getXmlFilesForTranslationKey(translationKey: string) { return this.xmlTranslationService.getXmlFilesForTranslationKey(translationKey); }
  getTranslationUsageStats() { return this.xmlTranslationService.getTranslationUsageStats(); }

  // Utility functions (delegated to UtilsService)
  findTypeReferences(text: string) { return this.utilsService.findTypeReferences(text); }
  formatSignatureWithLinks(signature: string) { return this.utilsService.formatSignatureWithLinks(signature); }
  
  // Override getReferencedTypes to check actual existence in documentation
  getReferencedTypes(signature: string): Array<{typeName: string, exists: boolean}> {
    const typeReferences = this.utilsService.getReferencedTypes(signature);
    
    // Filter to only include types that actually exist in our documentation
    return typeReferences.filter(({typeName}) => this.typeExists(typeName))
      .map(({typeName}) => ({
        typeName,
        exists: true // We know they exist because we just filtered for them
      }));
  }
  getFileName(path: string) { return this.utilsService.getFileName(path); }
  getDirectory(path: string) { return this.utilsService.getDirectory(path); }
  getCategoryDisplayName(category: string) { return this.utilsService.getCategoryDisplayName(category); }
  getCategoryRoute(category: string) { return this.utilsService.getCategoryRoute(category); }
  getTypeIcon(type: any) { return this.utilsService.getTypeIcon(type); }
  getMemberIcon(member: any) { return this.utilsService.getMemberIcon(member); }
  getMatchTypeLabel(matchType: string) { return this.utilsService.getMatchTypeLabel(matchType); }
  getMatchTypeColor(matchType: string) { return this.utilsService.getMatchTypeColor(matchType); }
  getNamespaceDisplayName(namespace: string) { return this.utilsService.getNamespaceDisplayName(namespace); }

  // Category-based data access
  getCategories(): string[] {
    return [
      APP_CONSTANTS.CATEGORIES.CLASS,
      APP_CONSTANTS.CATEGORIES.ENUM,
      APP_CONSTANTS.CATEGORIES.INTERFACE,
      APP_CONSTANTS.CATEGORIES.STRUCT
    ];
  }

  getTypesByCategory(category: string, page: number = 0): Observable<Type[]> {
    const categorizedData = this.categorizedData();
    if (!categorizedData) {
      return of([]);
    }

    const categoryMap = categorizedData.categories[category + (category === 'class' ? 'es' : 's') as keyof typeof categorizedData.categories];
    if (!categoryMap) {
      return of([]);
    }

    const allTypes = Array.from(categoryMap.values());
    const startIndex = page * this.PAGE_SIZE;
    const endIndex = startIndex + this.PAGE_SIZE;
    
    return of(allTypes.slice(startIndex, endIndex));
  }

  // Get all types for a category (no pagination)
  getAllTypesByCategory(category: string): Observable<Type[]> {
    const categorizedData = this.categorizedData();
    if (!categorizedData) {
      return of([]);
    }

    const categoryKey = category + (category === 'class' ? 'es' : 's') as keyof typeof categorizedData.categories;
    const categoryMap = categorizedData.categories[categoryKey];
    if (!categoryMap) {
      return of([]);
    }

    const allTypes = Array.from(categoryMap.values());
    return of(allTypes);
  }

  // Legacy method for backward compatibility
  getTypesByCategoryPaginated(category: string, page: number = 0): Observable<Type[]> {
    return this.getTypesByCategory(category, page);
  }

  getCategoryTypeCount(category: string): number {
    const categorizedData = this.categorizedData();
    if (!categorizedData) return 0;

    const categoryMap = categorizedData.categories[category + (category === 'class' ? 'es' : 's') as keyof typeof categorizedData.categories];
    return categoryMap ? categoryMap.size : 0;
  }

  // Inheritance and override functionality
  getInheritance(typeName: string): string[] {
    const data = this.categorizedData();
    if (!data) return [];
    
    const inheritance = data.inheritance.get(typeName);
    return inheritance ? inheritance : [];
  }

  getDerivedTypes(typeName: string): string[] {
    const data = this.categorizedData();
    if (!data) return [];
    
    const derivedTypes = data.derivedTypes.get(typeName);
    return derivedTypes ? derivedTypes : [];
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

  // Get member info from a member key
  getMemberFromKey(memberKey: string): Member | null {
    const parsed = this.parseMemberKey(memberKey);
    const categorized = this.categorizedData();
    if (!categorized || !parsed.typeName) return null;

    const members = categorized.memberIndex.get(parsed.typeName);
    if (!members) return null;

    return members.find(m => m.name === parsed.memberName) || null;
  }

  // Legacy namespace support (for backward compatibility)
  getNamespaces(): any[] {
    const data = this.docsData();
    if (!data) return [];
    
    // Create a virtual global namespace from the flat structure
    return [{
      name: '<global>',
      type_count: data.total_types,
      types: [] // Will be loaded lazily
    }];
  }

  getNamespaceTypes(namespaceName: string, page: number = 0): Observable<Type[]> {
    const allTypes = this.loadedTypes.get(namespaceName) || [];
    const startIndex = page * this.PAGE_SIZE;
    const endIndex = startIndex + this.PAGE_SIZE;
    
    return of(allTypes.slice(startIndex, endIndex));
  }

  getNamespaceTypeCount(namespaceName: string): number {
    const allTypes = this.loadedTypes.get(namespaceName) || [];
    return allTypes.length;
  }

  getNamespacePageCount(namespaceName: string): number {
    const typeCount = this.getNamespaceTypeCount(namespaceName);
    return Math.ceil(typeCount / this.PAGE_SIZE);
  }

  getNamespace(name: string): any {
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

  // State accessors
  getLoading() { return this.loading(); }
  getError() { return this.error(); }
  getDocsData() { return this.docsData(); }
  getCategorizedData() { return this.categorizedData(); }

  // Private helper methods
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
      derivedTypes: new Map<string, string[]>(),
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

    // Build inheritance relationships after all types are indexed
    this.buildInheritanceRelationships(categorized);

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

  private buildInheritanceRelationships(categorized: CategorizedDocs) {
    // Build bidirectional inheritance relationships
    for (const type of categorized.typeIndex.values()) {
      if (type.base_types && type.base_types.length > 0) {
        // For each base type, record that this type derives from it
        for (const baseTypeName of type.base_types) {
          // Record the inheritance relationship
          if (!categorized.derivedTypes.has(baseTypeName)) {
            categorized.derivedTypes.set(baseTypeName, []);
          }
          categorized.derivedTypes.get(baseTypeName)!.push(type.name);
        }
      }
    }
  }

  private buildOverrideRelationships(categorized: CategorizedDocs) {
    // Build method override relationships
    for (const type of categorized.typeIndex.values()) {
      for (const member of type.members) {
        if (member.kind === 'method' && member.modifiers?.includes('override')) {
          // Find the base method this overrides
          const baseTypes = categorized.inheritance.get(type.name) || [];
          for (const baseTypeName of baseTypes) {
            const baseType = categorized.typeIndex.get(baseTypeName);
            if (baseType) {
              const baseMethod = baseType.members.find(m => 
                m.kind === 'method' && 
                m.name === member.name &&
                (m.modifiers?.includes('virtual') || m.modifiers?.includes('abstract'))
              );
              if (baseMethod) {
                const memberKey = `${type.name}.${member.name}`;
                const baseMemberKey = `${baseTypeName}.${baseMethod.name}`;
                
                                 categorized.overrides.set(memberKey, {
                   overrides: baseMemberKey,
                   overriddenBy: []
                 });
                 
                 // Add this method to the list of methods that override the base method
                 if (!categorized.overrides.has(baseMemberKey)) {
                   categorized.overrides.set(baseMemberKey, {
                     overrides: undefined,
                     overriddenBy: []
                   });
                 }
                categorized.overrides.get(baseMemberKey)!.overriddenBy.push(memberKey);
              }
            }
          }
        }
      }
    }
  }
}
