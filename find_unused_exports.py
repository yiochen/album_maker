import os
import re

def get_exports(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Matches: export const foo = ..., export function foo()..., export class Foo...
    # simple regex, might miss some edge cases but good enough for a start
    matches = re.findall(r'export\s+(?:const|function|class|type|interface|enum)\s+([a-zA-Z0-9_]+)', content)

    # Handle: export { foo, bar }
    # This is harder to parse with simple regex.

    return set(matches)

def find_usage(root_dir, symbol, exclude_file):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if not filename.endswith(('.ts', '.tsx', '.js', '.jsx')):
                continue

            filepath = os.path.join(dirpath, filename)
            if filepath == exclude_file:
                continue

            with open(filepath, 'r') as f:
                if symbol in f.read():
                    return True
    return False

root_dir = 'src'
unused_exports = []

for dirpath, _, filenames in os.walk(root_dir):
    for filename in filenames:
        if not filename.endswith(('.ts', '.tsx')):
            continue

        filepath = os.path.join(dirpath, filename)

        # Skip index files for now as they often re-export
        if filename == 'index.ts' or filename == 'index.tsx':
             continue

        exports = get_exports(filepath)
        for export in exports:
            # Skip common React component names if they match the filename (already checked file usage)
            # Actually, we should check them too.

            if not find_usage(root_dir, export, filepath):
                unused_exports.append((filepath, export))

for filepath, export in unused_exports:
    print(f"Potential unused export: {export} in {filepath}")
