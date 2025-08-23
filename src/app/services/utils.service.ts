import { Injectable } from '@angular/core';
import { APP_CONSTANTS } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  
  // Type linking utilities
  findTypeReferences(text: string): Array<{typeName: string, exists: boolean}> {
    // Common C# keywords and built-in types to exclude
    const excludedWords = new Set([
      'public', 'private', 'protected', 'internal', 'static', 'virtual', 'abstract', 'override', 'sealed',
      'readonly', 'const', 'volatile', 'extern', 'unsafe', 'fixed', 'stackalloc', 'checked', 'unchecked',
      'bool', 'void', 'string', 'int', 'object', 'float', 'double', 'long', 'short', 'byte', 'char',
      'decimal', 'uint', 'ulong', 'ushort', 'sbyte', 'nint', 'nuint', 'var', 'dynamic', 'ref', 'out', 'in',
      'params', 'this', 'base', 'new', 'typeof', 'is', 'as', 'default', 'null', 'true', 'false',
      'if', 'else', 'switch', 'case', 'default', 'for', 'foreach', 'while', 'do', 'break', 'continue',
      'return', 'throw', 'try', 'catch', 'finally', 'using', 'namespace', 'class', 'struct', 'interface',
      'enum', 'delegate', 'event', 'property', 'get', 'set', 'add', 'remove', 'operator', 'implicit', 'explicit'
    ]);
    
    // Extract method name from signature to exclude it from type references
    const methodNameMatch = text.match(/\b(?:public|private|protected|internal|static|virtual|abstract|override|readonly)\s+(?:\w+)\s+(\w+)\s*\(/);
    const methodName = methodNameMatch ? methodNameMatch[1] : null;
    
    // Find potential type references (capitalized words)
    const typePattern = /\b([A-Z][a-zA-Z0-9_]*(?:<[^>]+>)?)\b/g;
    const matches = [...text.matchAll(typePattern)];
    const uniqueTypes = new Set<string>();
    
    matches.forEach(match => {
      const typeName = this.cleanTypeName(match[1]);
      
      // Skip if it's an excluded word or too short
      if (excludedWords.has(typeName.toLowerCase()) || typeName.length < 3) {
        return;
      }
      
      // Skip if it's the method name itself
      if (methodName && typeName === methodName) {
        return;
      }
      
      // Skip if it looks like a method name (contains common method patterns)
      if (typeName.includes('And') || typeName.includes('Or') || typeName.includes('Is') || typeName.includes('Get') || typeName.includes('Set')) {
        // Additional check: if it appears to be a method name in the context, skip it
        const context = text.substring(Math.max(0, match.index! - 20), Math.min(text.length, match.index! + typeName.length + 20));
        if (context.includes('(') && context.includes(')') && !context.includes('new ' + typeName) && !context.includes('typeof ' + typeName)) {
          return;
        }
      }
      
      uniqueTypes.add(typeName);
    });
    
    return Array.from(uniqueTypes).map(typeName => ({
      typeName,
      exists: this.isLikelyTypeName(typeName)
    }));
  }

  private cleanTypeName(typeName: string): string {
    // Remove generic parameters for lookup
    return typeName.split('<')[0];
  }

  isLikelyTypeName(typeName: string): boolean {
    // Return true for likely type names to enable linking
    return /^[A-Z][a-zA-Z0-9_]*$/.test(typeName) && typeName.length > 2;
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

  // File path utilities
  getFileName(path: string): string {
    return path.split('\\').pop() || path;
  }

  getDirectory(path: string): string {
    const parts = path.split('\\');
    return parts.slice(0, -1).join('\\');
  }

  // Category utilities
  getCategoryDisplayName(category: string): string {
    switch (category) {
      case APP_CONSTANTS.CATEGORIES.CLASS: return 'Classes';
      case APP_CONSTANTS.CATEGORIES.ENUM: return 'Enums';
      case APP_CONSTANTS.CATEGORIES.INTERFACE: return 'Interfaces';
      case APP_CONSTANTS.CATEGORIES.STRUCT: return 'Structs';
      default: return category.charAt(0).toUpperCase() + category.slice(1) + 's';
    }
  }

  getCategoryRoute(category: string): string {
    return `${APP_CONSTANTS.ROUTES.CATEGORY}/${category}`;
  }

  // Type icon utilities
  getTypeIcon(type: any): string {
    switch (type.kind) {
      case APP_CONSTANTS.CATEGORIES.CLASS: return APP_CONSTANTS.ICONS.CLASS;
      case APP_CONSTANTS.CATEGORIES.INTERFACE: return APP_CONSTANTS.ICONS.INTERFACE;
      case APP_CONSTANTS.CATEGORIES.STRUCT: return APP_CONSTANTS.ICONS.STRUCT;
      case APP_CONSTANTS.CATEGORIES.ENUM: return APP_CONSTANTS.ICONS.ENUM;
      default: return APP_CONSTANTS.ICONS.DEFAULT;
    }
  }

  getMemberIcon(member: any): string {
    switch (member.kind) {
      case 'method': return APP_CONSTANTS.ICONS.METHOD;
      case 'property': return APP_CONSTANTS.ICONS.PROPERTY;
      case 'field': return APP_CONSTANTS.ICONS.FIELD;
      case 'constructor': return APP_CONSTANTS.ICONS.CONSTRUCTOR;
      case 'event': return APP_CONSTANTS.ICONS.EVENT;
      default: return APP_CONSTANTS.ICONS.DEFAULT;
    }
  }

  // Search utilities
  getMatchTypeLabel(matchType: string): string {
    switch (matchType) {
      case 'name': return 'Name match';
      case 'signature': return 'Method match';
      case 'file': return 'File match';
      default: return 'Match';
    }
  }

  getMatchTypeColor(matchType: string): string {
    switch (matchType) {
      case 'name': return APP_CONSTANTS.COLORS.NAME_MATCH;
      case 'signature': return APP_CONSTANTS.COLORS.SIGNATURE_MATCH;
      case 'file': return APP_CONSTANTS.COLORS.FILE_MATCH;
      default: return APP_CONSTANTS.COLORS.DEFAULT;
    }
  }

  // Namespace utilities
  getNamespaceDisplayName(namespace: string): string {
    return namespace === APP_CONSTANTS.DEFAULTS.GLOBAL_NAMESPACE ? 'Global' : namespace;
  }
}
