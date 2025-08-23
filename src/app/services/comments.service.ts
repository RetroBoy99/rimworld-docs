import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, of } from 'rxjs';
import { CommentsIndex, Type, Member } from '../models/docs.models';
import { APP_CONSTANTS } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class CommentsService {
  private commentsData = signal<CommentsIndex | null>(null);

  constructor(private http: HttpClient) {}

  loadComments(): Observable<CommentsIndex> {
    if (this.commentsData()) {
      return of(this.commentsData()!);
    }
    return this.http.get<CommentsIndex>(APP_CONSTANTS.ASSETS.COMMENTS).pipe(
      map(data => {
        this.commentsData.set(data);
        return data;
      }),
      shareReplay(1)
    );
  }

  getCommentForKey(key: string): string | null {
    const comments = this.commentsData();
    if (!comments) return null;
    return comments.comments[key] || null;
  }

  generateTypeCommentKey(type: Type): string {
    // Extract namespace from the file path if available
    let namespace: string = APP_CONSTANTS.DEFAULTS.NAMESPACE; // Default namespace
    if (type.file) {
      const pathParts = type.file.split('\\');
      if (pathParts.length > 1) {
        namespace = pathParts[1]; // Usually the namespace is the second part
      }
    }
    return `Assembly-CSharp.Version.${namespace}.${type.name}`;
  }

  generateMemberCommentKey(type: Type, member: Member): string {
    const typeKey = this.generateTypeCommentKey(type);
    
    // For methods with parameters, include the parameter list
    if (member.kind === 'method' || member.kind === 'constructor') {
      const paramsMatch = member.signature.match(/\(([^)]*)\)/);
      if (paramsMatch && paramsMatch[1].trim()) {
        // Extract parameter types more accurately, handling nullable types and default values
        const params = paramsMatch[1].split(',').map(p => {
          const param = p.trim();
          // Remove default values (everything after =)
          const paramWithoutDefault = param.split('=')[0].trim();
          // Look for the type name (handle nullable types like DamageInfo?)
          const typeMatch = paramWithoutDefault.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
          return typeMatch ? typeMatch[1] : 'object';
        }).join(', ');
        return `${typeKey}.${member.name}(${params})`;
      }
    }
    
    // Default case: no parameters or non-method
    return `${typeKey}.${member.name}`;
  }

  getTypeComment(type: Type): string | null {
    return this.getCommentForKey(this.generateTypeCommentKey(type));
  }

  getMemberComment(type: Type, member: Member): string | null {
    return this.getCommentForKey(this.generateMemberCommentKey(type, member));
  }

  getAllComments(): { [key: string]: string } {
    const comments = this.commentsData();
    return comments ? comments.comments : {};
  }

  searchComments(query: string): { key: string; comment: string }[] {
    const comments = this.commentsData();
    if (!comments) return [];
    
    const results: { key: string; comment: string }[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [key, comment] of Object.entries(comments.comments)) {
      if (key.toLowerCase().includes(lowerQuery) || comment.toLowerCase().includes(lowerQuery)) {
        results.push({ key, comment });
      }
    }
    
    return results;
  }

  getCommentsStats() {
    const comments = this.commentsData();
    if (!comments) return null;
    return {
      totalComments: comments.metadata.total_comments,
      lastUpdated: comments.metadata.last_updated,
      version: comments.metadata.version,
      description: comments.metadata.description
    };
  }
}
