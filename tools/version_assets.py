"""Adds a content hash to every local script/stylesheet URL in the HTML pages (js/app.js -> js/app.js?v=1a2b3c4d).

GitHub Pages lets browsers cache JS and CSS for 10 minutes. Without a version in the URL, a visitor who loaded the
site recently can get new HTML together with an old script right after a deploy. A content hash changes the URL
only when the file really changes, so unchanged files stay cached and changed files are fetched fresh.

Usage (run from anywhere, before committing a change to any js/ or css/ file):
    python tools/version_assets.py            # rewrite the HTML files
    python tools/version_assets.py --check    # exit 1 if any reference is missing or stale (used by the tests)
"""
import hashlib
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'.git', '.claude', 'node_modules', 'docs', 'tests', 'tools'}
PATTERN = re.compile(r'(?P<attr>(?:src|href)=")(?P<prefix>(?:\.\./)?)(?P<path>(?:js|css)/[A-Za-z0-9_.\-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?(?P<end>")')


def file_hash(rel_path):
    with open(os.path.join(ROOT, rel_path.replace('/', os.sep)), 'rb') as f:
        data = f.read().replace(b'\r\n', b'\n')  # same hash on Windows and Linux checkouts
    return hashlib.sha1(data).hexdigest()[:8]


def html_files():
    for folder, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if name.endswith('.html'):
                yield os.path.join(folder, name)


def rewrite(text):
    problems = []

    def repl(match):
        path = match.group('path')
        if not os.path.exists(os.path.join(ROOT, path.replace('/', os.sep))):
            problems.append('missing file: ' + path)
            return match.group(0)
        return match.group('attr') + match.group('prefix') + path + '?v=' + file_hash(path) + match.group('end')

    return PATTERN.sub(repl, text), problems


def main():
    check = '--check' in sys.argv
    stale = []
    changed = 0
    for path in html_files():
        with io.open(path, encoding='utf-8', newline='') as f:
            original = f.read()
        updated, problems = rewrite(original)
        for problem in problems:
            stale.append(os.path.relpath(path, ROOT) + ': ' + problem)
        if updated != original:
            if check:
                stale.append(os.path.relpath(path, ROOT) + ': versions out of date')
            else:
                with io.open(path, 'w', encoding='utf-8', newline='') as f:
                    f.write(updated)
                changed += 1
    if check:
        if stale:
            print('\n'.join(stale))
            sys.exit(1)
        print('asset versions are up to date')
    else:
        print('updated %d HTML files' % changed)
        if stale:
            print('\n'.join(stale))
            sys.exit(1)


if __name__ == '__main__':
    main()
