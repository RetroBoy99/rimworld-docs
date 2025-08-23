import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocsService } from '../../services/docs.service';
import { XmlClassLink } from '../../models/docs.models';

@Component({
  selector: 'app-xml-usage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './xml-usage.component.html',
  styleUrls: ['./xml-usage.component.scss']
})
export class XmlUsageComponent implements OnInit {
  @Input() className: string = '';
  
  xmlUsage = signal<XmlClassLink[]>([]);
  tagGroups = signal<string[]>([]);
  loading = signal(false);
  expanded = signal(false);

  constructor(private docsService: DocsService) {}

  ngOnInit() {
    if (this.className) {
      this.loadXmlUsage();
    }
  }

  private loadXmlUsage() {
    this.loading.set(true);
    
    // Load XML class links data
    this.docsService.loadXmlClassLinks().subscribe({
      next: () => {
        const usage = this.docsService.getXmlUsageForClass(this.className);
        const groups = this.docsService.getXmlTagGroupsForClass(this.className);
        
        this.xmlUsage.set(usage);
        this.tagGroups.set(groups);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading XML usage:', err);
        this.loading.set(false);
      }
    });
  }

  toggleExpanded() {
    this.expanded.set(!this.expanded());
  }

  getXmlUsageCount(): number {
    return this.xmlUsage().length;
  }

  getTagGroupsCount(): number {
    return this.tagGroups().length;
  }

  getUsageByTagGroup(tagGroup: string): XmlClassLink[] {
    return this.xmlUsage().filter(usage => {
      // Check if this usage belongs to the given tag group
      // We'll use a simpler approach since we can't access the internal data directly
      return usage.xml_value && usage.xml_value.includes(tagGroup);
    });
  }

  getFileName(path: string): string {
    return path.split('\\').pop() || path;
  }

  getDirectory(path: string): string {
    const parts = path.split('\\');
    return parts.slice(0, -1).join('\\');
  }
}
