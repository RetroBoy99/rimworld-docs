# Services Architecture

This directory contains all the services used by the Rimworld Documentation application.

## Service Overview

### Core Services

- **`DocsService`** - Main service for loading and managing documentation data
- **`SearchService`** - Handles search functionality and result caching
- **`CommentsService`** - Manages developer comments and notes
- **`XmlTranslationService`** - Handles XML and translation usage data
- **`UtilsService`** - Provides utility functions for common operations

## Service Responsibilities

### DocsService
- Loads and caches main documentation data (`docs_index.json`)
- Provides categorized data access (classes, enums, interfaces, structs)
- Manages inheritance and override relationships
- Handles type lookups and member access
- Provides legacy namespace support

### SearchService
- Performs text-based search across all types and members
- Implements relevance scoring and result ranking
- Caches search results for performance
- Limits search scope for large datasets

### CommentsService
- Loads and manages developer comments (`comments.json`)
- Generates comment keys for types and members
- Handles method overload parameter parsing
- Provides comment search functionality

### XmlTranslationService
- Loads XML class usage data (`xml_class_links.json`)
- Loads translation usage data (`translation_links.json`)
- Provides statistics and usage information
- Handles cross-references between C# and XML

### UtilsService
- Type linking and reference detection
- Signature formatting and syntax highlighting
- File path utilities
- Category and icon management
- Search result formatting

## Usage

All services are provided at the root level and can be injected into components:

```typescript
import { DocsService, SearchService } from '../services';

constructor(
  private docsService: DocsService,
  private searchService: SearchService
) {}
```

## Data Flow

1. **Initialization**: `DocsService` loads main documentation data
2. **Categorization**: Data is organized by type categories
3. **Relationship Building**: Inheritance and override relationships are established
4. **Caching**: All data is cached for performance
5. **Access**: Components access data through service methods

## Performance Considerations

- All services use Angular signals for reactive state management
- Search results are cached to avoid repeated computations
- Large datasets are processed in chunks
- Lazy loading is implemented for type details
