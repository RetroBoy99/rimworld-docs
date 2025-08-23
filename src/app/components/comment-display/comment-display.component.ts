import { Component, Input, OnInit, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocsService } from '../../services/docs.service';

@Component({
  selector: 'app-comment-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comment-display.component.html',
  styleUrls: ['./comment-display.component.scss']
})
export class CommentDisplayComponent implements OnInit, OnChanges {
  @Input() commentKey: string = '';
  @Input() showIcon: boolean = true;
  
  comment = signal<string | null>(null);
  loading = signal(false);
  expanded = signal(false);

  constructor(private docsService: DocsService) {}

  ngOnInit() {
    if (this.commentKey) {
      this.loadComment();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['commentKey'] && !changes['commentKey'].firstChange) {
      // Reset when navigating to a different type
      this.comment.set(null);
      this.expanded.set(false);
      if (this.commentKey) {
        this.loadComment();
      }
    }
  }

  private loadComment() {
    this.loading.set(true);
    this.docsService.loadComments().subscribe({
      next: () => {
        const comment = this.docsService.getCommentForKey(this.commentKey);
        this.comment.set(comment);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading comment:', err);
        this.loading.set(false);
      }
    });
  }

  toggleExpanded() {
    this.expanded.set(!this.expanded());
  }

  hasComment(): boolean {
    return this.comment() !== null;
  }
}
