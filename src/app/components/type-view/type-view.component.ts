import { Component, OnInit, signal, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { DocsService } from '../../services/docs.service';
import { Type, Member } from '../../models/docs.models';
import { filter } from 'rxjs/operators';
import { XmlUsageComponent } from '../xml-usage/xml-usage.component';
import { TranslationUsageComponent } from '../translation-usage/translation-usage.component';
import { CommentDisplayComponent } from '../comment-display/comment-display.component';

@Component({
  selector: 'app-type-view',
  standalone: true,
  imports: [CommonModule, RouterLink, XmlUsageComponent, TranslationUsageComponent, CommentDisplayComponent],
  templateUrl: './type-view.component.html',
  styleUrls: ['./type-view.component.scss']
})
export class TypeViewComponent implements OnInit, AfterViewInit {
  type = signal<Type | null>(null);
  namespace = signal<string>('');
  category = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  
     // State for collapsible override sections
   private expandedOverriddenBy = new Set<string>();
   
   // State for collapsible inheritance sections
   private expandedDerivedTypes = new Set<string>();
   
     // Filter state for members
  memberFilters = signal<{[key: string]: boolean}>({});

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

    // Listen for navigation to handle smart scrolling
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.handleNavigationScroll(event.url);
    });
  }

  ngAfterViewInit() {
    // Handle initial load with fragment
    this.handleInitialFragment();
  }

  private loadType(typeName: string) {
    this.docsService.getTypeAsync(typeName).subscribe({
      next: (result) => {
        if (result) {
          this.type.set(result.type);
          this.namespace.set(result.namespace);
          this.category.set(result.category);
          
          // Initialize member filters based on available member kinds
          this.initializeMemberFilters(result.type);
          
          // Load comments for this type
          this.docsService.loadComments().subscribe({
            next: () => {
              this.loading.set(false);
            },
            error: (err: any) => {
              console.error('Error loading comments:', err);
              this.loading.set(false);
            }
          });
        } else {
          this.error.set(`Type '${typeName}' not found`);
          this.loading.set(false);
        }
      },
      error: (err: any) => {
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

  getOverrideInfo(memberName: string) {
    const typeName = this.type()?.name;
    if (!typeName) return null;
    return this.docsService.getOverrideInfo(typeName, memberName);
  }

  parseMemberKey(memberKey: string) {
    return this.docsService.parseMemberKey(memberKey);
  }

  toggleOverriddenBy(memberName: string) {
    if (this.expandedOverriddenBy.has(memberName)) {
      this.expandedOverriddenBy.delete(memberName);
    } else {
      this.expandedOverriddenBy.add(memberName);
    }
  }

  isOverriddenByExpanded(memberName: string): boolean {
    return this.expandedOverriddenBy.has(memberName);
  }

  // Anchor navigation methods
  getMemberAnchorId(member: Member): string {
    const typeName = this.type()?.name || '';
    return `${typeName}-${member.kind}-${member.name}`.replace(/[^a-zA-Z0-9-]/g, '-');
  }

  getMemberAnchorIdFromKey(memberKey: string): string {
    const parsed = this.parseMemberKey(memberKey);
    // We need to determine the member kind - let's get it from the service
    const memberInfo = this.docsService.getMemberFromKey(memberKey);
    if (memberInfo) {
      return `${parsed.typeName}-${memberInfo.kind}-${parsed.memberName}`.replace(/[^a-zA-Z0-9-]/g, '-');
    }
    // Fallback - assume it's a method
    return `${parsed.typeName}-method-${parsed.memberName}`.replace(/[^a-zA-Z0-9-]/g, '-');
  }

  copyMemberLink(member: Member): void {
    const url = window.location.origin + window.location.pathname + '#' + this.getMemberAnchorId(member);
    navigator.clipboard.writeText(url).then(() => {
      // You could add a toast notification here
      console.log('Link copied to clipboard:', url);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  }

  private handleNavigationScroll(url: string): void {
    setTimeout(() => {
      const fragment = url.split('#')[1];
      if (fragment) {
        // Navigate to specific anchor - don't scroll to top
        const element = document.getElementById(fragment);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        // No fragment - scroll to top for new page navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100); // Small delay to ensure DOM is updated
  }

     private handleInitialFragment(): void {
     const fragment = this.route.snapshot.fragment;
     if (fragment) {
       setTimeout(() => {
         const element = document.getElementById(fragment);
         if (element) {
           element.scrollIntoView({ behavior: 'smooth', block: 'start' });
         }
       }, 300); // Longer delay for initial load
     }
   }

   // Inheritance helper methods
   getInheritance(): string[] {
     const typeName = this.type()?.name;
     if (!typeName) return [];
     return this.docsService.getInheritance(typeName);
   }

   getDerivedTypes(): string[] {
     const typeName = this.type()?.name;
     if (!typeName) return [];
     return this.docsService.getDerivedTypes(typeName);
   }

   toggleDerivedTypes(): void {
     const typeName = this.type()?.name;
     if (!typeName) return;
     
     if (this.expandedDerivedTypes.has(typeName)) {
       this.expandedDerivedTypes.delete(typeName);
     } else {
       this.expandedDerivedTypes.add(typeName);
     }
   }

   isDerivedTypesExpanded(): boolean {
     const typeName = this.type()?.name;
     if (!typeName) return false;
     return this.expandedDerivedTypes.has(typeName);
   }

   // Member filtering methods
  getFilteredMembers(): Member[] {
    const type = this.type();
    if (!type) return [];
    
    const filters = this.memberFilters();
    return type.members.filter(member => filters[member.kind as keyof typeof filters]);
  }

  toggleMemberFilter(kind: string): void {
    const currentFilters = this.memberFilters();
    if (kind in currentFilters) {
      this.memberFilters.set({
        ...currentFilters,
        [kind]: !currentFilters[kind as keyof typeof currentFilters]
      });
    }
  }

  getMemberKindCounts(): {[key: string]: number} {
    const type = this.type();
    if (!type) return {};
    
    return type.members.reduce((counts, member) => {
      counts[member.kind] = (counts[member.kind] || 0) + 1;
      return counts;
    }, {} as {[key: string]: number});
  }

  getFilteredMemberCount(): number {
    return this.getFilteredMembers().length;
  }

  getAllMemberKinds(): string[] {
    const type = this.type();
    if (!type) return [];
    
    const kinds = new Set(type.members.map(m => m.kind));
    return Array.from(kinds).sort();
  }

  isMemberFilterActive(kind: string): boolean {
    const filters = this.memberFilters();
    return kind in filters && filters[kind as keyof typeof filters];
  }

  private initializeMemberFilters(type: Type): void {
    const memberKinds = new Set(type.members.map(m => m.kind));
    const filters: {[key: string]: boolean} = {};
    
    // Initialize all member kinds to true
    memberKinds.forEach(kind => {
      filters[kind] = true;
    });
    
    this.memberFilters.set(filters);
  }

  clearMemberFilters(): void {
    const type = this.type();
    if (!type) return;
    
    const memberKinds = new Set(type.members.map(m => m.kind));
    const filters: {[key: string]: boolean} = {};
    
    // Set all member kinds to true
    memberKinds.forEach(kind => {
      filters[kind] = true;
    });
    
    this.memberFilters.set(filters);
  }

  // Method to extract translation keys from a signature
  getTranslationKeysFromSignature(signature: string): string[] {
    // Look for patterns like "SomeKey".Translate(...)
    const translatePattern = /"([^"]+)"\.Translate/g;
    const keys: string[] = [];
    let match;
    
    while ((match = translatePattern.exec(signature)) !== null) {
      keys.push(match[1]);
    }
    
    return keys;
  }

  // Method to check if a member has translation keys
  hasTranslationKeys(member: Member): boolean {
    const keys = this.getTranslationKeysFromSignature(member.signature);
    return keys.length > 0;
  }

  // Method to get translation keys for a member
  getTranslationKeysForMember(member: Member): string[] {
    return this.getTranslationKeysFromSignature(member.signature);
  }

  // Method to generate comment key for the type
  getTypeCommentKey(): string {
    if (!this.type()) return '';
    return this.docsService.generateTypeCommentKey(this.type()!);
  }

  // Method to generate comment key for a member
  getMemberCommentKey(member: Member): string {
    if (!this.type()) return '';
    return this.docsService.generateMemberCommentKey(this.type()!, member);
  }

  // Method to check if a type has a comment
  hasTypeComment(): boolean {
    return this.docsService.getTypeComment(this.type()!) !== null;
  }

  // Method to check if a member has a comment
  hasMemberComment(member: Member): boolean {
    return this.docsService.getMemberComment(this.type()!, member) !== null;
  }
}
