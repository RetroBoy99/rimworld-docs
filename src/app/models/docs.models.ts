export interface DocsIndex {
  generated_at: string;
  total_types: number;
  total_members: number;
  type_counts: {
    class: number;
    struct: number;
    interface: number;
    enum: number;
  };
  types: Type[];
}

// New categorized data structure
export interface CategorizedDocs {
  metadata: {
    generated_at: string;
    total_types: number;
    total_members: number;
    type_counts: {
      class: number;
      struct: number;
      interface: number;
      enum: number;
    };
  };
  categories: {
    classes: Map<string, Type>;
    enums: Map<string, Type>;
    interfaces: Map<string, Type>;
    structs: Map<string, Type>;
  };
  // Cross-reference maps for fast lookups
  typeIndex: Map<string, Type>; // name -> Type
  memberIndex: Map<string, Member[]>; // typeName -> Members[]
  inheritance: Map<string, string[]>; // typeName -> base types (if available)
  derivedTypes: Map<string, string[]>; // typeName -> types that inherit from it
  references: Map<string, Set<string>>; // typeName -> types that reference it
  overrides: Map<string, OverrideInfo>; // "TypeName.MethodName" -> override info
}

export interface Namespace {
  name: string;
  type_count: number;
  types: Type[];
}

export interface Type {
  name: string;
  kind: 'class' | 'interface' | 'struct' | 'enum';
  access_modifier: string;
  modifiers: string[];
  base_types: string[];
  file: string;
  line: number;
  member_count: number;
  members: Member[];
}

export interface Member {
  kind: 'method' | 'property' | 'field' | 'constructor';
  name: string;
  access_modifier: string;
  modifiers: string[];
  return_type?: string;
  signature: string;
  line: number;
}

export interface Parameter {
  name: string;
  type: string;
  default_value?: string;
}

export interface OverrideInfo {
  overrides?: string;        // "BaseClass.MethodName" - what this method overrides
  overriddenBy: string[];    // ["Derived1.Method", "Derived2.Method"] - what overrides this
}

export interface SearchResult {
  type: Type;
  namespace: string;
  category: string;
  matchType: 'name' | 'signature' | 'file';
  relevance: number;
}
