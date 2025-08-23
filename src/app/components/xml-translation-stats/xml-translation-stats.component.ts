import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocsService } from '../../services/docs.service';
import { XmlClassLink, TranslationUsage } from '../../models/docs.models';

@Component({
  selector: 'app-xml-translation-stats',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './xml-translation-stats.component.html',
  styleUrls: ['./xml-translation-stats.component.scss']
})
export class XmlTranslationStatsComponent implements OnInit {
  xmlStats = signal<any>(null);
  translationStats = signal<any>(null);
  xmlTagGroups = signal<{[key: string]: XmlClassLink[]}>({});
  translationKeys = signal<string[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // UI state
  activeTab = signal<'stats' | 'xml' | 'translations'>('stats');
  expandedXmlGroups = signal<Set<string>>(new Set());
  expandedTranslationKeys = signal<Set<string>>(new Set());
  searchQuery = signal('');

  constructor(private docsService: DocsService) {}

  ngOnInit() {
    this.loadStats();
  }

  private loadStats() {
    this.loading.set(true);
    
    // Load both XML and translation data
    this.docsService.loadXmlClassLinks().subscribe({
      next: (xmlData) => {
        this.xmlStats.set(this.docsService.getXmlUsageStats());
        this.xmlTagGroups.set(xmlData.tag_groups);
        
        // Load translation data after XML data
        this.docsService.loadTranslationLinks().subscribe({
          next: (translationData) => {
            this.translationStats.set(this.docsService.getTranslationUsageStats());
            this.translationKeys.set(Object.keys(translationData.translation_links));
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Error loading translation stats:', err);
            this.error.set('Failed to load translation statistics');
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error loading XML stats:', err);
        this.error.set('Failed to load XML statistics');
        this.loading.set(false);
      }
    });
  }

  retry() {
    this.error.set(null);
    this.loadStats();
  }

  setActiveTab(tab: 'stats' | 'xml' | 'translations') {
    this.activeTab.set(tab);
  }

  toggleXmlGroup(groupName: string) {
    const expanded = this.expandedXmlGroups();
    if (expanded.has(groupName)) {
      expanded.delete(groupName);
    } else {
      expanded.add(groupName);
    }
    this.expandedXmlGroups.set(new Set(expanded));
  }

  toggleTranslationKey(key: string) {
    const expanded = this.expandedTranslationKeys();
    if (expanded.has(key)) {
      expanded.delete(key);
    } else {
      expanded.add(key);
    }
    this.expandedTranslationKeys.set(new Set(expanded));
  }

  isXmlGroupExpanded(groupName: string): boolean {
    return this.expandedXmlGroups().has(groupName);
  }

  isTranslationKeyExpanded(key: string): boolean {
    return this.expandedTranslationKeys().has(key);
  }

  getFilteredXmlGroups(): {[key: string]: XmlClassLink[]} {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.xmlTagGroups();
    
    const filtered: {[key: string]: XmlClassLink[]} = {};
    for (const [groupName, links] of Object.entries(this.xmlTagGroups())) {
      const filteredLinks = links.filter(link => 
        link.csharp_class.toLowerCase().includes(query) ||
        link.xml_value.toLowerCase().includes(query) ||
        link.xml_file.toLowerCase().includes(query)
      );
      if (filteredLinks.length > 0) {
        filtered[groupName] = filteredLinks;
      }
    }
    return filtered;
  }

  getFilteredTranslationKeys(): string[] {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.translationKeys();
    
    return this.translationKeys().filter(key => 
      key.toLowerCase().includes(query)
    );
  }

  getFileName(path: string): string {
    return path.split('\\').pop() || path;
  }

  getDirectory(path: string): string {
    const parts = path.split('\\');
    return parts.slice(0, -1).join('\\');
  }

  getTranslationUsageForKey(key: string): TranslationUsage[] {
    return this.docsService.getTranslationUsageForKey(key);
  }

  getXmlFilesForTranslationKey(key: string): string[] {
    return this.docsService.getXmlFilesForTranslationKey(key);
  }

  getXmlTagGroupsCount(): number {
    return Object.keys(this.xmlTagGroups()).length;
  }

  getXmlGroupsArray(): {name: string, links: XmlClassLink[]}[] {
    const filteredGroups = this.getFilteredXmlGroups();
    return Object.entries(filteredGroups).map(([name, links]) => ({
      name,
      links
    }));
  }
}
