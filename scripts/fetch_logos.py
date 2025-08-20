#!/usr/bin/env python3
import csv, re, sys, time
from pathlib import Path
from urllib.parse import quote_plus
import requests, yaml

# ------------ config ------------
try:
    REPO_ROOT = Path(__file__).resolve().parents[1]
except NameError:
    # Fallback when __file__ is not defined (e.g., in some online environments)
    REPO_ROOT = Path.cwd()

OUTPUT_DIR = REPO_ROOT / "public" / "logos"
CATALOG_FILE = REPO_ROOT / "assets" / "catalog.txt"
DOMAINS_FILE = REPO_ROOT / "assets" / "domains.yaml"
REPORT_CSV = REPO_ROOT / "assets" / "logo_report.csv"
USER_AGENT = "KYCutLogoFetcher/1.0 (+https://kycut.com)"
TIMEOUT = 20
RETRY = 2
# ---------------------------------

SI_CDN = "https://cdn.simpleicons.org/{slug}"  # SVGs
CLEARBIT = "https://logo.clearbit.com/{domain}"  # often PNG
WIKIMEDIA = "https://commons.wikimedia.org/w/api.php"

SVG_PLACEHOLDER = """<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256">
<rect width="100%" height="100%" fill="#eee"/>
<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="28" fill="#444">{text}</text>
</svg>"""

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})

def read_catalog(path: Path):
    items = []
    if not path.exists():
        sys.exit(f"Missing {path}. Create it and paste the catalog.")
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) != 3:
            continue
        name, price, filename = parts
        items.append({"name": name, "price": price, "filename": filename})
    return items

def read_domains(path: Path):
    if not path.exists():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}

def slug_candidates(brand: str):
    s = brand.lower()
    s = re.sub(r"\s*$$.*?$$\s*", "", s)
    s = s.replace("+", "plus").replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    cands = {s, s.replace("-", "")}
    specials = {
        "crypto-com": "cryptocom",
        "wu": "westernunion", "wu-plus": "westernunion",
        "deutsche-bank": "deutschebank",
        "caixa-bank": "caixabank",
        "postepay": "posteitaliane", "poste-it": "posteitaliane",
        "gate-io": "gateio",
        "blockchain": "blockchain-dot-com",
        "paypal-business": "paypal",
        "wise-business": "wise",
        "revolut-business": "revolut",
        "revolut-business-merchant": "revolut",
        "kraken-business": "kraken",
        "airwallex-business-without-merchant": "airwallex",
        "n26-business": "n26",
        "illimity-it": "illimity",
    }
    if s in specials: cands.add(specials[s])
    return list(cands)

def http_get(url):
    for i in range(RETRY + 1):
        try:
            r = session.get(url, timeout=TIMEOUT)
            if r.status_code == 200:
                return r
            if r.status_code in (403, 404):
                return None
        except requests.RequestException:
            if i == RETRY: return None
            time.sleep(0.7 * (i+1))
    return None

def fetch_simple_icons(brand: str):
    for s in slug_candidates(brand):
        url = SI_CDN.format(slug=quote_plus(s))
        r = http_get(url)
        if r and r.headers.get("content-type","").startswith("image/svg+xml"):
            return r.content, "svg", f"simpleicons:{s}"
    return None, None, None

def fetch_clearbit(domain: str):
    r = http_get(CLEARBIT.format(domain=domain))
    if r and r.headers.get("content-type","").startswith("image/"):
        return r.content, r.headers.get("content-type").split("/")[-1], f"clearbit:{domain}"
    return None, None, None

def fetch_wikimedia_svg(query: str):
    params = {"action":"query","format":"json","origin":"*","prop":"imageinfo","generator":"search",
              "gsrsearch": f'filetype:bitmap|drawing {query} logo', "gsrlimit":"5","iiprop":"url|mime"}
    r = session.get(WIKIMEDIA, params=params, timeout=TIMEOUT)
    if r.status_code != 200: return (None, None, None)
    data = r.json()
    pages = (data.get("query") or {}).get("pages") or {}
    for _, page in pages.items():
        for info in page.get("imageinfo") or []:
            if (info.get("mime") or "").endswith("svg+xml"):
                svg_url = info.get("url")
                r2 = http_get(svg_url)
                if r2 and r2.headers.get("content-type","").endswith("svg+xml"):
                    return r2.content, "svg", f"wikimedia:{page.get('title','')}"
    return None, None, None

def ensure_dir(p: Path): p.mkdir(parents=True, exist_ok=True)

def save_bytes(path: Path, content: bytes):
    ensure_dir(path.parent); path.write_bytes(content)

def png_to_svg_wrapper(png_bytes: bytes, label: str):
    import base64
    b64 = base64.b64encode(png_bytes).decode("ascii")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <image href="data:image/png;base64,{b64}" x="0" y="0" height="512" width="512" />
  <!-- source:{label} -->
</svg>'''.encode("utf-8")

def main():
    catalog = read_catalog(CATALOG_FILE)
    domains = read_domains(DOMAINS_FILE)
    results = []

    for item in catalog:
        brand = item["name"]
        outfile = OUTPUT_DIR / item["filename"]
        data = None; fmt=""; source=""

        c, f, s = fetch_simple_icons(brand)
        if c: data, fmt, source = c, f, s

        if data is None:
            dom = domains.get(brand) or domains.get(brand.upper()) or domains.get(brand.lower())
            if dom:
                c, f, s = fetch_clearbit(dom)
                if c:
                    if item["filename"].lower().endswith(".svg") and f != "svg+xml":
                        data, fmt, source = png_to_svg_wrapper(c, s), "svg", s + " (wrapped)"
                    else:
                        data, fmt, source = c, f, s

        if data is None:
            c, f, s = fetch_wikimedia_svg(brand)
            if c: data, fmt, source = c, f, s

        if data is None:
            data, fmt, source = SVG_PLACEHOLDER.replace("{text}", brand).encode("utf-8"), "svg", "placeholder"

        save_bytes(outfile, data)
        status = "ok" if source != "placeholder" else "placeholder"
        results.append({"brand": brand, "filename": str(outfile.relative_to(REPO_ROOT)),
                        "status": status, "source": source, "format": fmt})
        print(f"[{status:11}] {brand} -> {outfile.name}  ({source})")

    with REPORT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["brand","filename","status","source","format"])
        w.writeheader(); w.writerows(results)
    print(f"\nReport written to {REPORT_CSV} ({len(results)} items).")

if __name__ == "__main__":
    main()
