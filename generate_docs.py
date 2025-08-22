#!/usr/bin/env python3
"""
Simple C# Documentation Generator
Focused on extracting classes and their members with explicit access modifiers.
"""

import os
import re
import json
import argparse
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional


@dataclass
class Member:
    kind: str           # 'method', 'property', 'field', 'constructor', 'event'
    name: str
    signature: str
    access_modifier: str  # 'public', 'private', 'internal', 'protected'
    modifiers: List[str]  # ['static', 'virtual', etc.]
    return_type: Optional[str] = None
    line_number: Optional[int] = None


@dataclass
class TypeInfo:
    name: str
    kind: str            # 'class', 'interface', 'struct', 'enum'
    access_modifier: str
    modifiers: List[str]
    file_path: str
    line_number: int
    members: List[Member]


class SimpleCSParser:
    def __init__(self):
        # Simple, focused patterns
        
        # Type patterns: require access modifier
        self.class_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'(?:(static|sealed|abstract|partial)\s+)*'       # Optional modifiers
            r'class\s+'                                        # 'class' keyword
            r'([A-Za-z_]\w*)'                                 # Class name
        )
        
        self.interface_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'(?:(partial)\s+)*'                              # Optional modifiers
            r'interface\s+'                                   # 'interface' keyword
            r'([A-Za-z_]\w*)'                                 # Interface name
        )
        
        self.struct_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'(?:(partial|readonly)\s+)*'                     # Optional modifiers
            r'struct\s+'                                      # 'struct' keyword
            r'([A-Za-z_]\w*)'                                 # Struct name
        )
        
        self.enum_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'enum\s+'                                        # 'enum' keyword
            r'([A-Za-z_]\w*)'                                 # Enum name
        )
        
        # Member patterns: ALL require access modifiers
        self.method_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'(?:(static|virtual|override|abstract|sealed|new|async)\s+)*'  # Optional modifiers
            r'([A-Za-z_]\w*(?:\[\])?(?:\?)?)\s+'              # Return type (simplified)
            r'([A-Za-z_]\w*)\s*\('                            # Method name + opening paren
        )
        
        self.property_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'(?:(static|virtual|override|abstract|sealed|new)\s+)*'  # Optional modifiers
            r'([A-Za-z_]\w*(?:\[\])?(?:\?)?)\s+'              # Property type
            r'([A-Za-z_]\w*)\s*\{'                            # Property name + opening brace
        )
        
        self.field_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'(?:(static|readonly|volatile)\s+)*'             # Optional modifiers (NO const!)
            r'([A-Za-z_]\w*(?:\[\])?(?:\?)?)\s+'              # Field type
            r'([A-Za-z_]\w*)\s*[=;]'                          # Field name + = or ;
        )
        
        self.constructor_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'(?:(static)\s+)?'                               # Optional static
            r'([A-Za-z_]\w*)\s*\('                            # Constructor name (same as class)
        )
        
        self.event_pattern = re.compile(
            r'^\s*(public|internal|protected|private)\s+'     # REQUIRED access modifier
            r'(?:(static|virtual|override|abstract|sealed|new)\s+)*'  # Optional modifiers
            r'event\s+'                                       # 'event' keyword
            r'([A-Za-z_]\w*(?:\[\])?(?:\?)?)\s+'              # Event type
            r'([A-Za-z_]\w*)'                                 # Event name
        )
        
        # Enum value pattern (no access modifier needed for enum values)
        self.enum_value_pattern = re.compile(
            r'^\s*([A-Za-z_]\w*)\s*(?:=\s*[^,}]+)?\s*[,}]?'   # Enum value name, optional = value
        )
        
        # Interface member patterns (no access modifier - implicitly public)
        self.interface_method_pattern = re.compile(
            r'^\s*([A-Za-z_]\w*(?:\[\])?(?:\?)?)\s+'           # Return type
            r'([A-Za-z_]\w*)\s*\('                            # Method name + opening paren
        )
        
        self.interface_property_pattern = re.compile(
            r'^\s*([A-Za-z_]\w*(?:\[\])?(?:\?)?)\s+'           # Property type
            r'([A-Za-z_]\w*)\s*\{'                            # Property name + opening brace
        )
        
        self.interface_event_pattern = re.compile(
            r'^\s*event\s+'                                   # 'event' keyword
            r'([A-Za-z_]\w*(?:\[\])?(?:\?)?)\s+'              # Event type
            r'([A-Za-z_]\w*)'                                 # Event name
        )

    def strip_comments(self, line: str) -> str:
        """Remove comments from a line."""
        if '//' in line:
            line = line[:line.index('//')]
        return line.strip()

    def parse_file(self, file_path: Path) -> List[TypeInfo]:
        """Parse a single C# file and extract types (classes, interfaces, structs, enums)."""
        types = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
        except Exception as e:
            print(f"Warning: Could not read {file_path}: {e}")
            return types

        current_type = None
        brace_depth = 0
        
        for line_num, line in enumerate(lines, 1):
            stripped = self.strip_comments(line)
            if not stripped:
                continue

            # Track brace depth
            brace_depth += stripped.count('{') - stripped.count('}')

            # Look for type declarations
            type_match = None
            type_kind = None
            
            # Check for class
            class_match = self.class_pattern.match(stripped)
            if class_match:
                type_match = class_match
                type_kind = 'class'
            
            # Check for interface
            interface_match = self.interface_pattern.match(stripped)
            if interface_match:
                type_match = interface_match
                type_kind = 'interface'
            
            # Check for struct
            struct_match = self.struct_pattern.match(stripped)
            if struct_match:
                type_match = struct_match
                type_kind = 'struct'
            
            # Check for enum
            enum_match = self.enum_pattern.match(stripped)
            if enum_match:
                access_modifier = enum_match.group(1)
                type_name = enum_match.group(2)
                
                current_type = TypeInfo(
                    name=type_name,
                    kind='enum',
                    access_modifier=access_modifier,
                    modifiers=[access_modifier],
                    file_path=str(file_path),
                    line_number=line_num,
                    members=[]
                )
                types.append(current_type)
                continue
            
            # Handle other types (class, interface, struct)
            if type_match and type_kind:
                access_modifier = type_match.group(1)
                modifiers_str = type_match.group(2) or ""
                type_name = type_match.group(3)
                
                modifiers = [access_modifier]
                if modifiers_str:
                    modifiers.extend(modifiers_str.split())
                
                current_type = TypeInfo(
                    name=type_name,
                    kind=type_kind,
                    access_modifier=access_modifier,
                    modifiers=modifiers,
                    file_path=str(file_path),
                    line_number=line_num,
                    members=[]
                )
                types.append(current_type)
                continue

            # If we're inside a type, look for members
            if current_type and brace_depth > 0:
                # For enums, look for enum values
                if current_type.kind == 'enum':
                    enum_value_match = self.enum_value_pattern.match(stripped)
                    if enum_value_match and enum_value_match.group(1):
                        value_name = enum_value_match.group(1)
                        # Skip if it looks like a method or property (contains parentheses or spaces)
                        if '(' not in value_name and not value_name.isspace():
                            current_type.members.append(Member(
                                kind='enum_value',
                                name=value_name,
                                signature=stripped,
                                access_modifier='public',  # Enum values are always public
                                modifiers=['public'],
                                line_number=line_num
                            ))
                    continue
                
                # For classes and structs, check for constructors (must match type name)
                if current_type.kind in ['class', 'struct']:
                    constructor_match = self.constructor_pattern.match(stripped)
                    if constructor_match and constructor_match.group(3) == current_type.name:
                        access_modifier = constructor_match.group(1)
                        is_static = constructor_match.group(2) == "static"
                        
                        modifiers = [access_modifier]
                        if is_static:
                            modifiers.append("static")
                        
                        current_type.members.append(Member(
                            kind='constructor',
                            name=current_type.name,
                            signature=stripped,
                            access_modifier=access_modifier,
                            modifiers=modifiers,
                            line_number=line_num
                        ))
                        continue

                # Check for methods (classes, interfaces, structs can have methods)
                if current_type.kind in ['class', 'struct']:
                    method_match = self.method_pattern.match(stripped)
                    if method_match:
                        access_modifier = method_match.group(1)
                        modifiers_str = method_match.group(2) or ""
                        return_type = method_match.group(3)
                        method_name = method_match.group(4)
                        
                        modifiers = [access_modifier]
                        if modifiers_str:
                            modifiers.extend(modifiers_str.split())
                        
                        current_type.members.append(Member(
                            kind='method',
                            name=method_name,
                            signature=stripped,
                            access_modifier=access_modifier,
                            modifiers=modifiers,
                            return_type=return_type,
                            line_number=line_num
                        ))
                        continue
                
                # Special handling for interface methods (no access modifier required)
                if current_type.kind == 'interface':
                    interface_method_match = self.interface_method_pattern.match(stripped)
                    if interface_method_match:
                        return_type = interface_method_match.group(1)
                        method_name = interface_method_match.group(2)
                        
                        current_type.members.append(Member(
                            kind='method',
                            name=method_name,
                            signature=stripped,
                            access_modifier='public',  # Interface members are implicitly public
                            modifiers=['public'],
                            return_type=return_type,
                            line_number=line_num
                        ))
                        continue

                # Check for properties (classes and structs need access modifiers)
                if current_type.kind in ['class', 'struct']:
                    property_match = self.property_pattern.match(stripped)
                    if property_match:
                        access_modifier = property_match.group(1)
                        modifiers_str = property_match.group(2) or ""
                        property_type = property_match.group(3)
                        property_name = property_match.group(4)
                        
                        modifiers = [access_modifier]
                        if modifiers_str:
                            modifiers.extend(modifiers_str.split())
                        
                        current_type.members.append(Member(
                            kind='property',
                            name=property_name,
                            signature=stripped,
                            access_modifier=access_modifier,
                            modifiers=modifiers,
                            return_type=property_type,
                            line_number=line_num
                        ))
                        continue
                
                # Special handling for interface properties (no access modifier required)
                if current_type.kind == 'interface':
                    interface_property_match = self.interface_property_pattern.match(stripped)
                    if interface_property_match:
                        property_type = interface_property_match.group(1)
                        property_name = interface_property_match.group(2)
                        
                        current_type.members.append(Member(
                            kind='property',
                            name=property_name,
                            signature=stripped,
                            access_modifier='public',  # Interface members are implicitly public
                            modifiers=['public'],
                            return_type=property_type,
                            line_number=line_num
                        ))
                        continue

                # Check for fields (classes and structs can have fields, excludes const automatically!)
                if current_type.kind in ['class', 'struct']:
                    field_match = self.field_pattern.match(stripped)
                    if field_match:
                        access_modifier = field_match.group(1)
                        modifiers_str = field_match.group(2) or ""
                        field_type = field_match.group(3)
                        field_name = field_match.group(4)
                        
                        modifiers = [access_modifier]
                        if modifiers_str:
                            modifiers.extend(modifiers_str.split())
                        
                        current_type.members.append(Member(
                            kind='field',
                            name=field_name,
                            signature=stripped,
                            access_modifier=access_modifier,
                            modifiers=modifiers,
                            return_type=field_type,
                            line_number=line_num
                        ))
                        continue

                # Check for events (classes and structs need access modifiers)
                if current_type.kind in ['class', 'struct']:
                    event_match = self.event_pattern.match(stripped)
                    if event_match:
                        access_modifier = event_match.group(1)
                        modifiers_str = event_match.group(2) or ""
                        event_type = event_match.group(3)
                        event_name = event_match.group(4)
                        
                        modifiers = [access_modifier]
                        if modifiers_str:
                            modifiers.extend(modifiers_str.split())
                        
                        current_type.members.append(Member(
                            kind='event',
                            name=event_name,
                            signature=stripped,
                            access_modifier=access_modifier,
                            modifiers=modifiers,
                            return_type=event_type,
                            line_number=line_num
                        ))
                        continue
                
                # Special handling for interface events (no access modifier required)
                if current_type.kind == 'interface':
                    interface_event_match = self.interface_event_pattern.match(stripped)
                    if interface_event_match:
                        event_type = interface_event_match.group(1)
                        event_name = interface_event_match.group(2)
                        
                        current_type.members.append(Member(
                            kind='event',
                            name=event_name,
                            signature=stripped,
                            access_modifier='public',  # Interface members are implicitly public
                            modifiers=['public'],
                            return_type=event_type,
                            line_number=line_num
                        ))
                        continue

        return types

    def scan_directory(self, root_path: Path) -> List[TypeInfo]:
        """Scan directory for C# files and extract all types."""
        all_types = []
        
        # Find all .cs files
        cs_files = list(root_path.rglob('*.cs'))
        print(f"Found {len(cs_files)} C# files")
        
        for file_path in cs_files:
            types = self.parse_file(file_path)
            all_types.extend(types)
        
        return all_types


def generate_documentation(types: List[TypeInfo], output_file: str):
    """Generate JSON documentation."""
    
    # Sort types by file path then by name
    sorted_types = sorted(types, key=lambda t: (t.file_path, t.name))
    
    # Count types by kind
    type_counts = {}
    for t in types:
        type_counts[t.kind] = type_counts.get(t.kind, 0) + 1
    
    # Convert to JSON-serializable format
    output_data = {
        'generated_at': datetime.now().isoformat(),
        'total_types': len(types),
        'total_members': sum(len(t.members) for t in types),
        'type_counts': type_counts,
        'types': []
    }
    
    for type_info in sorted_types:
        # Sort members by kind then by name
        sorted_members = sorted(type_info.members, key=lambda m: (m.kind, m.name))
        
        type_data = {
            'name': type_info.name,
            'kind': type_info.kind,
            'access_modifier': type_info.access_modifier,
            'modifiers': type_info.modifiers,
            'file': type_info.file_path,
            'line': type_info.line_number,
            'member_count': len(sorted_members),
            'members': [
                {
                    'kind': member.kind,
                    'name': member.name,
                    'access_modifier': member.access_modifier,
                    'modifiers': member.modifiers,
                    'return_type': member.return_type,
                    'signature': member.signature,
                    'line': member.line_number
                }
                for member in sorted_members
            ]
        }
        output_data['types'].append(type_data)
    
    # Write JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"Generated documentation: {output_file}")
    print(f"Total types: {output_data['total_types']}")
    print(f"Type breakdown: {output_data['type_counts']}")
    print(f"Total members: {output_data['total_members']}")


def main():
    parser = argparse.ArgumentParser(description='Enhanced C# Documentation Generator')
    parser.add_argument('--root', default='.', help='Root directory to scan')
    parser.add_argument('--output', default='docs_enhanced.json', help='Output JSON file')
    
    args = parser.parse_args()
    
    root_path = Path(args.root)
    if not root_path.exists():
        print(f"Error: Directory '{root_path}' does not exist")
        return 1
    
    print(f"Scanning directory: {root_path}")
    
    # Parse C# files
    parser = SimpleCSParser()
    types = parser.scan_directory(root_path)
    
    # Generate documentation
    generate_documentation(types, args.output)
    
    return 0


if __name__ == '__main__':
    exit(main())
