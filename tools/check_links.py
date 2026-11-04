"""Check every link on the Stressie site.

Usage: python tools/check_links.py [site_dir] [--offline]   (site_dir defaults to the repo root)

Checks, for every .html page in site_dir:
  - local pages, images, CSS and JS exist (query strings ignored)
  - #anchors exist as an id on the target page
  - external http(s) links answer with a status below 400
  - mailto: and tel: links are well formed
Exits 1 if anything is broken.
"""
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) StressieLinkCheck/1.0"
# Sites that block bots but are fine in a browser; report, don't fail.
SOFT_HOSTS = ("linkedin.com", "instagram.com")


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        # contact.html picks a topic or industry from a plain #token (see site.js)
        if tag == "input" and a.get("name") == "topic":
            self.ids.add(a.get("value", ""))
        if tag == "input" and a.get("data-key"):
            self.ids.add(a["data-key"])
        if tag == "link" and a.get("rel") in ("preconnect", "dns-prefetch"):
            return
        for key in ("href", "src"):
            val = a.get(key)
            if val and not (tag == "use" or val.startswith("data:")):
                self.refs.append((tag, key, val.strip(), self.getpos()[0]))
        if tag == "meta" and a.get("http-equiv", "").lower() == "refresh":
            m = re.search(r"url=(.+)", a.get("content", ""), re.I)
            if m:
                self.refs.append((tag, "refresh", m.group(1).strip(), self.getpos()[0]))


def parse(path):
    p = Links()
    p.feed(path.read_text(encoding="utf-8"))
    return p


def check_external(url):
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.status
        except urllib.error.HTTPError as e:
            if method == "GET" or e.code not in (403, 405, 400, 999):
                return e.code
        except Exception as e:  # DNS, timeout, TLS
            if method == "GET":
                return f"error: {e.__class__.__name__}"
    return None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    offline = "--offline" in sys.argv
    site = Path(args[0] if args else Path(__file__).resolve().parent.parent).resolve()
    pages = {p.name: parse(p) for p in sorted(site.glob("*.html"))}
    problems, external = [], {}

    for name, page in pages.items():
        for tag, key, ref, line in page.refs:
            where = f"{name}:{line}"
            if ref.startswith(("http://", "https://")):
                external.setdefault(ref, []).append(where)
                continue
            if ref.startswith("mailto:"):
                if not re.match(r"mailto:[^@\s?]+@[^@\s?]+\.[a-z]{2,}", ref, re.I):
                    problems.append((where, ref, "bad mailto"))
                continue
            if ref.startswith("tel:"):
                if not re.match(r"tel:\+?[\d-]+$", ref):
                    problems.append((where, ref, "bad tel"))
                continue
            if ref.startswith(("javascript:", "//")):
                problems.append((where, ref, "unexpected scheme"))
                continue
            parts = urlsplit(ref)
            target = name if not parts.path else unquote(parts.path)
            file = (site / target).resolve()
            if not file.exists():
                problems.append((where, ref, "missing file"))
                continue
            if parts.fragment and file.suffix == ".html":
                ids = pages[file.name].ids if file.name in pages else parse(file).ids
                if parts.fragment not in ids:
                    problems.append((where, ref, f"no id '{parts.fragment}' on {file.name}"))

    soft = []
    if not offline:
        with ThreadPoolExecutor(8) as pool:
            results = dict(zip(external, pool.map(check_external, external)))
        for url, status in results.items():
            ok = isinstance(status, int) and status < 400
            if not ok:
                row = (", ".join(external[url][:3]), url, f"HTTP {status}")
                (soft if any(h in url for h in SOFT_HOSTS) else problems).append(row)

    total = sum(len(p.refs) for p in pages.values())
    print(f"Checked {total} links on {len(pages)} pages ({len(external)} unique external).")
    for where, ref, why in soft:
        print(f"  WARN  {where}  {ref}  ({why}, site blocks bots; open it by hand)")
    for where, ref, why in problems:
        print(f"  FAIL  {where}  {ref}  ({why})")
    if not problems:
        print("All links OK.")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
