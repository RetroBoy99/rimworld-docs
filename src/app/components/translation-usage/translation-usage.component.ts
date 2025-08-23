import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocsService } from '../../services/docs.service';
import { TranslationUsage } from '../../models/docs.models';

@Component({
  selector: 'app-translation-usage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './translation-usage.component.html',
  styleUrls: ['./translation-usage.component.scss']
})
export class TranslationUsageComponent implements OnInit {
  @Input() translationKey: string = '';
  
  translationUsage = signal<TranslationUsage[]>([]);
  xmlFiles = signal<string[]>([]);
  loading = signal(false);
  expanded = signal(false);

  constructor(private docsService: DocsService) {}

  ngOnInit() {
    if (this.translationKey) {
      this.loadTranslationUsage();
    }
  }

  private loadTranslationUsage() {
    this.loading.set(true);
    
    // Load translation links data
    this.docsService.loadTranslationLinks().subscribe({
      next: () => {
        const usage = this.docsService.getTranslationUsageForKey(this.translationKey);
        const xmlFiles = this.docsService.getXmlFilesForTranslationKey(this.translationKey);
        
        this.translationUsage.set(usage);
        this.xmlFiles.set(xmlFiles);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading translation usage:', err);
        this.loading.set(false);
      }
    });
  }

  toggleExpanded() {
    this.expanded.set(!this.expanded());
  }

  getUsageCount(): number {
    return this.translationUsage().length;
  }

  getXmlFilesCount(): number {
    return this.xmlFiles().length;
  }

  getFileName(path: string): string {
    return path.split('\\').pop() || path;
  }

  getDirectory(path: string): string {
    const parts = path.split('\\');
    return parts.slice(0, -1).join('\\');
  }

  getCSharpFileName(path: string): string {
    return path.split('\\').pop() || path;
  }

  getCSharpDirectory(path: string): string {
    const parts = path.split('\\');
    return parts.slice(0, -1).join('\\');
  }
}
