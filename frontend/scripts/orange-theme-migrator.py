import os
import glob
import re

TARGET_DIR = '/Users/priyanshu/Desktop/smart-student-management-system/frontend/src'

REPLACEMENTS = {
    # Replace purple/cyan/emerald theme with premium orange/amber/yellow theme
    "#8a5cf6": "#f97316", # Purple -> Orange 500
    "#06b6d4": "#f59e0b", # Cyan -> Amber 500
    "#10b981": "#eab308", # Emerald -> Yellow 500
    "#f59e0b": "#ef4444", # Amber -> Red 500
    "#ec4899": "#ea580c", # Pink -> Orange 600
    "#3b82f6": "#d97706", # Blue -> Amber 600
    
    # Text hover accents (if any use tailwind named colors)
    "hover:text-[#8a5cf6]": "hover:text-orange-500",
    "text-[#8a5cf6]": "text-orange-500",
    "bg-[#8a5cf6]": "bg-orange-500",
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # We must be careful not to double replace. Since the old colors are specific hex, it's safe.
    for old, new in REPLACEMENTS.items():
        content = content.replace(old, new)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def main():
    tsx_files = glob.glob(os.path.join(TARGET_DIR, '**/*.tsx'), recursive=True)
    ts_files = glob.glob(os.path.join(TARGET_DIR, '**/*.ts'), recursive=True)
    
    for file in tsx_files + ts_files:
        process_file(file)

if __name__ == '__main__':
    main()
