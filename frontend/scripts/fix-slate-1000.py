import os
import glob

TARGET_DIR = '/Users/priyanshu/Desktop/smart-student-management-system/frontend/src'

def main():
    files = glob.glob(os.path.join(TARGET_DIR, '**/*.tsx'), recursive=True) + glob.glob(os.path.join(TARGET_DIR, '**/*.ts'), recursive=True)
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'bg-slate-1000' in content:
            new_content = content.replace('bg-slate-1000', 'bg-white')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed invalid bg-slate-1000 in: {filepath}")

if __name__ == '__main__':
    main()
