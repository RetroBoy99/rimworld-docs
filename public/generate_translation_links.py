#!/usr/bin/env python3
"""
Translation Links Generator
Searches C# files for .Translate() calls and links them to XML translation keys.
"""

import json
import os
import re
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Set

@dataclass
class TranslationLink:
    translation_key: str
    csharp_file: str
    csharp_line: int
    csharp_code: str
    xml_files: List[str] = None

class TranslationLinker:
    def __init__(self):
        self.translation_keys = set()
        self.translation_links = []
    
    def find_translate_calls(self, csharp_dir: str = "Assembly-CSharp") -> List[TranslationLink]:
        """Find all .Translate() calls in C# files"""
        links = []
        csharp_files = []
        
        # Find all C# files
        for root, dirs, files in os.walk(csharp_dir):
            for file in files:
                if file.endswith('.cs'):
                    csharp_files.append(os.path.join(root, file))
        
        print(f"Found {len(csharp_files)} C# files")
        
        # Process files in batches
        batch_size = 100
        for i in range(0, len(csharp_files), batch_size):
            batch = csharp_files[i:i + batch_size]
            print(f"Processing batch {i//batch_size + 1}/{(len(csharp_files) + batch_size - 1)//batch_size}")
            
            for file_path in batch:
                file_links = self.parse_csharp_file(file_path)
                links.extend(file_links)
        
        return links
    
    def parse_csharp_file(self, file_path: str) -> List[TranslationLink]:
        """Parse C# file and find .Translate() calls"""
        links = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                # Find .Translate() calls with parameters (actual replacements)
                # Pattern: "Key".Translate(param1, param2, ...) or Key.Translate(param1, param2, ...)
                translate_pattern = r'["\']([^"\']+)["\']\.Translate\([^)]+\)|(\w+)\.Translate\([^)]+\)'
                matches = re.findall(translate_pattern, line)
                
                for match in matches:
                    # match[0] is quoted string, match[1] is unquoted identifier
                    translation_key = match[0] if match[0] else match[1]
                    
                    if translation_key:
                        links.append(TranslationLink(
                            translation_key=translation_key,
                            csharp_file=file_path,
                            csharp_line=line_num,
                            csharp_code=line.strip()
                        ))
                        self.translation_keys.add(translation_key)
        
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
        
        return links
    
    def find_xml_translation_keys(self, data_dir: str = "Data") -> Dict[str, List[str]]:
        """Find translation keys in XML files"""
        key_to_files = {}
        
        # Find all XML files
        xml_files = []
        for root, dirs, files in os.walk(data_dir):
            for file in files:
                if file.endswith('.xml'):
                    xml_files.append(os.path.join(root, file))
        
        print(f"Scanning {len(xml_files)} XML files for translation keys...")
        
        # Process files in batches
        batch_size = 50
        for i in range(0, len(xml_files), batch_size):
            batch = xml_files[i:i + batch_size]
            
            for file_path in batch:
                keys = self.parse_xml_translation_keys(file_path)
                for key in keys:
                    if key not in key_to_files:
                        key_to_files[key] = []
                    key_to_files[key].append(file_path)
        
        return key_to_files
    
    def parse_xml_translation_keys(self, file_path: str) -> Set[str]:
        """Parse XML file and find translation keys"""
        keys = set()
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for translation keys in XML content
            # Pattern: <key>TranslationKey</key> or key="TranslationKey"
            key_patterns = [
                r'<(\w+)>([^<]+)</\1>',  # <key>value</key>
                r'(\w+)="([^"]+)"',      # key="value"
            ]
            
            for pattern in key_patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    if len(match) == 2:
                        key_name, key_value = match
                        # Check if this looks like a translation key
                        if (key_name.lower() in ['key', 'defname', 'label', 'description', 'text'] or
                            key_value and not key_value.startswith('{') and not key_value.isdigit()):
                            keys.add(key_value)
        
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
        
        return keys
    
    def link_translations(self, csharp_dir: str = "Assembly-CSharp", data_dir: str = "Data") -> Dict:
        """Generate translation links"""
        print("Finding .Translate() calls in C# files...")
        csharp_links = self.find_translate_calls(csharp_dir)
        
        print("Finding translation keys in XML files...")
        xml_keys = self.find_xml_translation_keys(data_dir)
        
        print("Linking translations...")
        
        # Link C# calls to XML keys
        linked_translations = {}
        for link in csharp_links:
            key = link.translation_key
            if key in xml_keys:
                if key not in linked_translations:
                    linked_translations[key] = []
                linked_translations[key].append({
                    'csharp_file': link.csharp_file,
                    'csharp_line': link.csharp_line,
                    'csharp_code': link.csharp_code,
                    'xml_files': xml_keys[key]
                })
        
        # Create output
        output = {
            'generated_at': str(datetime.now()),
            'total_translate_calls': len(csharp_links),
            'unique_translation_keys': len(self.translation_keys),
            'linked_translations': len(linked_translations),
            'translation_links': linked_translations,
            'unlinked_csharp_calls': [
                {
                    'translation_key': link.translation_key,
                    'csharp_file': link.csharp_file,
                    'csharp_line': link.csharp_line,
                    'csharp_code': link.csharp_code
                }
                for link in csharp_links
                if link.translation_key not in xml_keys
            ]
        }
        
        return output

def main():
    linker = TranslationLinker()
    result = linker.link_translations()
    
    # Save to JSON
    output_file = 'translation_links.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\nFound {result['total_translate_calls']} .Translate() calls")
    print(f"Found {result['unique_translation_keys']} unique translation keys")
    print(f"Linked {result['linked_translations']} translations to XML files")
    print(f"Results saved to {output_file}")
    
    # Show some examples
    print("\nExample linked translations:")
    for i, (key, links) in enumerate(list(result['translation_links'].items())[:5]):
        print(f"  {key}: {len(links)} C# usages, {len(links[0]['xml_files'])} XML files")

if __name__ == "__main__":
    main()
