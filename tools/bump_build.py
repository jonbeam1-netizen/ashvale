"""Bump the Ashvale BUILD id before a deploy (no build step: this only rewrites two small text blocks).

    python tools/bump_build.py            # BUILD = current UTC time, e.g. 20261019-153012
    python tools/bump_build.py my-label   # explicit BUILD id ([A-Za-z0-9._-] only)
    python tools/bump_build.py --check    # only list the module graph, change nothing

What it does
  1. Scans the static import graph from src/main.js (import/export ... from '...', import '...').
  2. Rewrites the generated block in index.html between /* BUILD:modules */ and /* /BUILD:modules */:
     `BUILD` (the id) and `MODULES` (every module of the graph). The inline loader in index.html turns that
     list into <link rel="modulepreload"> tags and an import map that maps every module URL to `?v=BUILD`,
     so a deploy can never mix cached old modules with new ones (GitHub Pages caches for ~10 minutes).
  3. Writes version.json {"build": BUILD}. index.html fetches it uncached on boot; if it names a newer build
     than the (possibly cached) page, the page reloads itself once as ?v=<new build>.

Run it whenever you deploy (and after adding new modules, so they are preloaded/versioned too). Locally
(localhost / file:) the loader skips versioning so edits show up without bumping.
"""
import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
VERSION = ROOT / 'version.json'
ENTRY = 'src/main.js'

IMPORT_RE = re.compile(
    r"""(?:^|[;\s])(?:import|export)\s+(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]""",
    re.M,
)
BLOCK_RE = re.compile(r'/\* BUILD:modules \*/.*?/\* /BUILD:modules \*/', re.S)


def strip_comments(src: str) -> str:
    src = re.sub(r'/\*.*?\*/', ' ', src, flags=re.S)
    return re.sub(r'(^|[^:\'"])//[^\n]*', r'\1', src)


def module_graph():
    """Modules reachable from ENTRY by static imports (repo-relative posix paths, entry first)."""
    order, seen, queue, bare = [], set(), [ENTRY], set()
    while queue:
        rel = queue.pop(0)
        if rel in seen:
            continue
        path = ROOT / rel
        if not path.is_file():
            print(f'  warning: {rel} is imported but does not exist', file=sys.stderr)
            continue
        seen.add(rel)
        order.append(rel)
        src = strip_comments(path.read_text(encoding='utf-8'))
        for spec in IMPORT_RE.findall(src):
            if spec.startswith(('./', '../', '/')):
                target = (path.parent / spec).resolve() if not spec.startswith('/') else (ROOT / spec.lstrip('/'))
                try:
                    queue.append(target.relative_to(ROOT).as_posix())
                except ValueError:
                    print(f'  warning: {spec} in {rel} points outside the repo', file=sys.stderr)
            else:
                bare.add(spec)
    return order, sorted(bare)


def main(argv):
    check = '--check' in argv
    args = [a for a in argv if not a.startswith('--')]
    build = args[0] if args else datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    if not re.fullmatch(r'[A-Za-z0-9._-]{1,40}', build):
        sys.exit('BUILD id may only use letters, digits, ".", "_" and "-" (max 40).')
    modules, bare = module_graph()
    print(f'{len(modules)} modules reachable from {ENTRY}; bare imports: {", ".join(bare) or "none"}')
    if check:
        for m in modules:
            print('  ' + m)
        return
    html = INDEX.read_text(encoding='utf-8')
    if not BLOCK_RE.search(html):
        sys.exit('index.html has no /* BUILD:modules */ block')
    lines = ',\n'.join(f'        {json.dumps(m)}' for m in modules)
    block = (
        '/* BUILD:modules */\n'
        f'      var BUILD = {json.dumps(build)};\n'
        f'      var MODULES = [\n{lines}\n      ];\n'
        '      /* /BUILD:modules */'
    )
    html = BLOCK_RE.sub(lambda _m: block, html, count=1)
    INDEX.write_text(html, encoding='utf-8', newline='\n')
    VERSION.write_text(json.dumps({'build': build}) + '\n', encoding='utf-8', newline='\n')
    print(f'BUILD = {build}: updated index.html and version.json')


if __name__ == '__main__':
    main(sys.argv[1:])
