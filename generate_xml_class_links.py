#!/usr/bin/env python3
"""
XML to C# Class Links Generator
Uses existing docs_index.json to link XML tags to C# classes without parsing C# files.
"""

import json
import os
import re
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Set

@dataclass
class XmlClassLink:
    xml_tag: str
    xml_value: str
    csharp_class: str
    csharp_file: str
    xml_file: str
    xml_line: int

class XmlClassLinker:
    def __init__(self):
        self.csharp_classes = self.load_csharp_classes()
        # Common XML tags that reference C# classes
        self.class_reference_tags = {
            'verbClass', 'compClass', 'defClass', 'thingClass', 'jobClass',
            'workType', 'skillDef', 'traitDef', 'hediffDef', 'abilityDef',
            'class', 'type', 'def', 'operation', 'patch'
        }
    
    def load_csharp_classes(self) -> Dict[str, str]:
        """Load C# class names and their file paths from docs_index.json"""
        with open('docs_index.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        classes = {}
        for class_info in data.get('types', []):
            class_name = class_info.get('name')
            file_path = class_info.get('file')
            if class_name and file_path:
                classes[class_name] = file_path
        
        return classes
    
    def parse_xml_file(self, file_path: str) -> List[XmlClassLink]:
        """Parse XML file and find class references"""
        links = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                # Find XML tags that might reference C# classes
                for tag in self.class_reference_tags:
                    pattern = rf'<{tag}[^>]*>(.*?)</{tag}>'
                    matches = re.findall(pattern, line, re.IGNORECASE)
                    
                    for match in matches:
                        class_name = match.strip()
                        if class_name in self.csharp_classes:
                            links.append(XmlClassLink(
                                xml_tag=tag,
                                xml_value=class_name,
                                csharp_class=class_name,
                                csharp_file=self.csharp_classes[class_name],
                                xml_file=file_path,
                                xml_line=line_num
                            ))
        
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
        
        return links
    
    def scan_directory(self, data_dir: str) -> List[XmlClassLink]:
        """Scan Data directory for XML files"""
        all_links = []
        xml_files = []
        
        # Find all XML files
        for root, dirs, files in os.walk(data_dir):
            for file in files:
                if file.endswith('.xml'):
                    xml_files.append(os.path.join(root, file))
        
        print(f"Found {len(xml_files)} XML files")
        
        # Process files in batches
        batch_size = 50
        for i in range(0, len(xml_files), batch_size):
            batch = xml_files[i:i + batch_size]
            print(f"Processing batch {i//batch_size + 1}/{(len(xml_files) + batch_size - 1)//batch_size}")
            
            for file_path in batch:
                links = self.parse_xml_file(file_path)
                all_links.extend(links)
        
        return all_links
    
    def generate_class_links(self, data_dir: str = "Data") -> Dict:
        """Generate XML to C# class links"""
        print("Generating XML to C# class links...")
        
        # Scan for class links
        links = self.scan_directory(data_dir)
        
        # Group by XML tag type
        tag_groups = {}
        for link in links:
            if link.xml_tag not in tag_groups:
                tag_groups[link.xml_tag] = []
            tag_groups[link.xml_tag].append({
                'xml_value': link.xml_value,
                'csharp_class': link.csharp_class,
                'csharp_file': link.csharp_file,
                'xml_file': link.xml_file,
                'xml_line': link.xml_line
            })
        
        # Create output
        output = {
            'generated_at': str(datetime.now()),
            'total_links': len(links),
            'unique_classes': len(set(link.csharp_class for link in links)),
            'tag_groups': tag_groups,
            'all_links': [
                {
                    'xml_tag': link.xml_tag,
                    'xml_value': link.xml_value,
                    'csharp_class': link.csharp_class,
                    'csharp_file': link.csharp_file,
                    'xml_file': link.xml_file,
                    'xml_line': link.xml_line
                }
                for link in links
            ]
        }
        
        return output

def main():
    linker = XmlClassLinker()
    result = linker.generate_class_links()
    
    # Save to JSON
    output_file = 'xml_class_links.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\nGenerated {result['total_links']} XML to C# class links")
    print(f"Found {result['unique_classes']} unique C# classes")
    print(f"Results saved to {output_file}")
    
    # Show summary by tag type
    print("\nLinks by XML tag type:")
    for tag, links in result['tag_groups'].items():
        print(f"  {tag}: {len(links)} links")

if __name__ == "__main__":
    main()
