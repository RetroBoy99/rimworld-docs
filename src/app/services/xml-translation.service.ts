import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, of } from 'rxjs';
import { XmlClassLinksIndex, TranslationLinksIndex, XmlClassLink, TranslationUsage } from '../models/docs.models';
import { APP_CONSTANTS } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class XmlTranslationService {
  private xmlClassLinksData = signal<XmlClassLinksIndex | null>(null);
  private translationLinksData = signal<TranslationLinksIndex | null>(null);

  constructor(private http: HttpClient) {}

  loadXmlClassLinks(): Observable<XmlClassLinksIndex> {
    if (this.xmlClassLinksData()) {
      return of(this.xmlClassLinksData()!);
    }

    return this.http.get<XmlClassLinksIndex>(APP_CONSTANTS.ASSETS.XML_CLASS_LINKS).pipe(
      map(data => {
        this.xmlClassLinksData.set(data);
        return data;
      }),
      shareReplay(1)
    );
  }

  loadTranslationLinks(): Observable<TranslationLinksIndex> {
    if (this.translationLinksData()) {
      return of(this.translationLinksData()!);
    }

    return this.http.get<TranslationLinksIndex>(APP_CONSTANTS.ASSETS.TRANSLATION_LINKS).pipe(
      map(data => {
        this.translationLinksData.set(data);
        return data;
      }),
      shareReplay(1)
    );
  }

  // XML Usage Methods
  getXmlUsageForClass(className: string): XmlClassLink[] {
    const xmlData = this.xmlClassLinksData();
    if (!xmlData) return [];

    const results: XmlClassLink[] = [];
    for (const [tagGroup, links] of Object.entries(xmlData.tag_groups)) {
      for (const link of links) {
        if (link.csharp_class === className) {
          results.push(link);
        }
      }
    }
    return results;
  }

  getXmlTagGroupsForClass(className: string): string[] {
    const xmlData = this.xmlClassLinksData();
    if (!xmlData) return [];

    const tagGroups = new Set<string>();
    for (const [tagGroup, links] of Object.entries(xmlData.tag_groups)) {
      for (const link of links) {
        if (link.csharp_class === className) {
          tagGroups.add(tagGroup);
        }
      }
    }
    return Array.from(tagGroups);
  }

  getXmlUsageStats() {
    const xmlData = this.xmlClassLinksData();
    if (!xmlData) return null;

    const totalLinks = Object.values(xmlData.tag_groups).reduce((sum, links) => sum + links.length, 0);
    const uniqueClasses = new Set<string>();
    const totalXmlFiles = new Set<string>();

    for (const [tagGroup, links] of Object.entries(xmlData.tag_groups)) {
      for (const link of links) {
        uniqueClasses.add(link.csharp_class);
        totalXmlFiles.add(link.xml_file);
      }
    }

    return {
      generatedAt: xmlData.generated_at,
      totalLinks,
      uniqueClasses: uniqueClasses.size,
      totalXmlFiles: totalXmlFiles.size,
      tagGroupCount: Object.keys(xmlData.tag_groups).length
    };
  }

  // Translation Usage Methods
  getTranslationUsageForKey(translationKey: string): TranslationUsage[] {
    const translationData = this.translationLinksData();
    if (!translationData) return [];

    return translationData.translation_links[translationKey] || [];
  }

  getTranslationKeysForFile(csharpFile: string): string[] {
    const translationData = this.translationLinksData();
    if (!translationData) return [];

    const keys: string[] = [];
    for (const [key, usages] of Object.entries(translationData.translation_links)) {
      for (const usage of usages) {
        if (usage.csharp_file === csharpFile) {
          keys.push(key);
          break; // Only add each key once per file
        }
      }
    }
    return keys;
  }

  getXmlFilesForTranslationKey(translationKey: string): string[] {
    const translationData = this.translationLinksData();
    if (!translationData) return [];

    const xmlFiles = new Set<string>();
    const usages = translationData.translation_links[translationKey] || [];
    for (const usage of usages) {
      for (const xmlFile of usage.xml_files) {
        xmlFiles.add(xmlFile);
      }
    }
    return Array.from(xmlFiles);
  }

  getTranslationUsageStats() {
    const translationData = this.translationLinksData();
    if (!translationData) return null;

    const totalTranslateCalls = Object.values(translationData.translation_links).reduce((sum, usages) => sum + usages.length, 0);
    const uniqueTranslationKeys = Object.keys(translationData.translation_links).length;
    
    const linkedTranslations = Object.values(translationData.translation_links).reduce((sum, usages) => {
      return sum + usages.filter(usage => usage.xml_files.length > 0).length;
    }, 0);

    return {
      generatedAt: translationData.generated_at,
      totalTranslateCalls,
      uniqueTranslationKeys,
      linkedTranslations
    };
  }
}
