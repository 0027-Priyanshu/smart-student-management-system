import os
import glob
import re

TARGET_DIR = '/Users/priyanshu/Desktop/smart-student-management-system/frontend/src'

REPLACEMENTS = {
    # Backgrounds
    "bg-[#0b0c10]": "bg-slate-50",
    "bg-[#12141c]": "bg-white",
    "bg-[#12141c]/50": "bg-white",
    
    # Text colors
    "text-white": "text-slate-900",
    "text-[#f3f4f6]": "text-slate-800",
    "text-gray-300": "text-slate-700",
    "text-gray-400": "text-slate-500",
    "text-gray-500": "text-slate-400",
    
    # Borders and dividers
    "border-white/5": "border-slate-200",
    "border-white/10": "border-slate-300",
    "divide-white/5": "divide-slate-200",
    
    # Hover states & interactive backgrounds
    "hover:bg-white/1": "hover:bg-slate-50",
    "hover:bg-white/2": "hover:bg-slate-50",
    "hover:bg-white/5": "hover:bg-slate-100",
    "bg-white/2": "bg-slate-50",
    "bg-white/3": "bg-slate-100",
    "bg-white/5": "bg-slate-100",
    
    # Focus rings & inputs
    "focus:border-[#8a5cf6]": "focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20",
    
    # Custom tweaks for modals/dialogs backdrop
    "bg-black/60": "bg-slate-900/40",
    "bg-black/70": "bg-slate-900/50",
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # Order matters: replace longer strings first if there's overlap, but here they are mostly distinct
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
