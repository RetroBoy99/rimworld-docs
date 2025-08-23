export const APP_CONSTANTS = {
  // Pagination
  PAGE_SIZE: 50,
  SEARCH_RESULT_LIMIT: 100,
  
  // Routes
  ROUTES: {
    HOME: '/docs',
    SEARCH: '/search',
    CATEGORY: '/docs/category',
    TYPE: '/docs/type',
    XML_STATS: '/docs/xml-translation-stats'
  },
  
  // Categories
  CATEGORIES: {
    CLASS: 'class',
    ENUM: 'enum',
    INTERFACE: 'interface',
    STRUCT: 'struct'
  },
  
  // Icons
  ICONS: {
    CLASS: '🔷',
    ENUM: '🔹',
    INTERFACE: '🔶',
    STRUCT: '🔸',
    METHOD: '⚡',
    PROPERTY: '📦',
    FIELD: '📁',
    CONSTRUCTOR: '🔨',
    EVENT: '📡',
    DEFAULT: '📄'
  },
  
  // Colors
  COLORS: {
    NAME_MATCH: '#ff6b35',
    SIGNATURE_MATCH: '#4fc3f7',
    FILE_MATCH: '#81c784',
    DEFAULT: '#888'
  },
  
  // File paths
  ASSETS: {
    DOCS_INDEX: 'assets/docs_index.json',
    COMMENTS: 'assets/comments.json',
    XML_CLASS_LINKS: 'assets/xml_class_links.json',
    TRANSLATION_LINKS: 'assets/translation_links.json'
  },
  
  // Default values
  DEFAULTS: {
    NAMESPACE: 'Verse',
    GLOBAL_NAMESPACE: '<global>'
  }
} as const;
