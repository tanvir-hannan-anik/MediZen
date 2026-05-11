"""
Scrapes all medicine brand names from medex.com.bd/brands (839 pages)
and saves them to data/medicines.json and data/medicines.csv

Usage:
    python scrape_medicines.py                  # scrape all 839 pages
    python scrape_medicines.py --pages 5        # scrape first 5 pages (test)
    python scrape_medicines.py --resume         # resume from last saved page
"""

import argparse
import csv
import json
import os
import time
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://medex.com.bd/brands"
OUTPUT_DIR = Path(__file__).parent / "data"
JSON_FILE = OUTPUT_DIR / "medicines.json"
CSV_FILE = OUTPUT_DIR / "medicines.csv"
PROGRESS_FILE = OUTPUT_DIR / "scrape_progress.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

DELAY_SECONDS = 1.0   # polite delay between requests
MAX_RETRIES = 3
SAVE_INTERVAL = 50    # save to disk every N pages


def get_total_pages(session: requests.Session) -> int:
    """Fetch page 1 and detect the last page number from pagination."""
    resp = session.get(BASE_URL, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    # Find all pagination links like ?page=N, grab the maximum
    max_page = 1
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "page=" in href:
            try:
                page_num = int(href.split("page=")[-1].strip())
                if page_num > max_page:
                    max_page = page_num
            except ValueError:
                pass
    return max_page


def parse_page(html: str) -> list[dict]:
    """Extract all medicine brand entries from a single page's HTML.

    HTML structure (from medex.com.bd):
      <a class="hoverable-block" href="/brands/<id>/<slug>">
        <div class="row data-row">
          <div class="col-xs-12 data-row-top">
            <span class="md-icon-container"><img alt="Tablet" ...></span>
            Brand Name
          </div>
          <div class="col-xs-12 data-row-strength">
            <span class="grey-ligten">100 mg</span>
          </div>
          <div class="col-xs-12">Generic Name</div>
          <div class="col-xs-12"><span class="data-row-company">Manufacturer</span></div>
        </div>
      </a>
    """
    soup = BeautifulSoup(html, "html.parser")
    medicines = []

    for a_tag in soup.find_all("a", class_="hoverable-block", href=True):
        href = a_tag["href"]
        if "/brands/" not in href:
            continue

        # Brand name: text directly inside data-row-top (after removing img container)
        top_div = a_tag.find("div", class_="data-row-top")
        if not top_div:
            continue

        # Dosage form from img alt (read before decomposing)
        img = top_div.find("img", class_="dosage-icon")
        dosage_form = img.get("alt", "").strip() if img else ""

        icon_span = top_div.find("span", class_="md-icon-container")
        if icon_span:
            icon_span.decompose()
        brand_name = top_div.get_text(strip=True)
        if not brand_name:
            continue

        # Strength
        strength_span = a_tag.find("span", class_="grey-ligten")
        strength = strength_span.get_text(strip=True) if strength_span else ""

        # Generic name: 3rd col-xs-12 div (no special class, just plain text)
        all_col_divs = a_tag.find_all("div", class_="col-xs-12")
        generic_name = ""
        if len(all_col_divs) >= 3:
            generic_name = all_col_divs[2].get_text(strip=True)

        # Manufacturer
        company_span = a_tag.find("span", class_="data-row-company")
        manufacturer = company_span.get_text(strip=True) if company_span else ""

        medicines.append({
            "brand_name": brand_name,
            "strength": strength,
            "generic_name": generic_name,
            "manufacturer": manufacturer,
            "dosage_form": dosage_form,
            "url": href if href.startswith("http") else f"https://medex.com.bd{href}",
        })

    return medicines


def scrape_page(session: requests.Session, page: int) -> list[dict]:
    """Fetch a single page with retries."""
    url = f"{BASE_URL}?page={page}"
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            return parse_page(resp.text)
        except requests.RequestException as e:
            if attempt == MAX_RETRIES:
                print(f"  [ERROR] Page {page} failed after {MAX_RETRIES} attempts: {e}")
                return []
            wait = attempt * 3
            print(f"  [RETRY {attempt}] Page {page} error: {e}. Waiting {wait}s...")
            time.sleep(wait)
    return []


def save_progress(page: int, total: int) -> None:
    PROGRESS_FILE.write_text(json.dumps({"last_page": page, "total": total}))


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text())
    return {}


def write_outputs(all_medicines: list[dict]) -> None:
    """Write the full dataset to JSON and CSV."""
    OUTPUT_DIR.mkdir(exist_ok=True)

    JSON_FILE.write_text(
        json.dumps(all_medicines, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["brand_name", "strength", "generic_name", "manufacturer", "dosage_form", "url"],
        )
        writer.writeheader()
        writer.writerows(all_medicines)


def main():
    parser = argparse.ArgumentParser(description="Scrape medicine brands from medex.com.bd")
    parser.add_argument("--pages", type=int, default=None, help="Limit to first N pages (for testing)")
    parser.add_argument("--resume", action="store_true", help="Resume from last saved page")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)
    session = requests.Session()

    # Determine page range
    print("Fetching page 1 to detect total page count...")
    total_pages = get_total_pages(session)
    if args.pages:
        total_pages = min(args.pages, total_pages)
    print(f"Total pages to scrape: {total_pages}")

    start_page = 1
    all_medicines: list[dict] = []

    if args.resume:
        progress = load_progress()
        if progress:
            start_page = progress.get("last_page", 1) + 1
            # Load existing data
            if JSON_FILE.exists():
                all_medicines = json.loads(JSON_FILE.read_text(encoding="utf-8"))
            print(f"Resuming from page {start_page} with {len(all_medicines)} existing entries.")

    # Also include page 1 results already fetched (re-fetch to parse)
    for page in range(start_page, total_pages + 1):
        medicines = scrape_page(session, page)
        all_medicines.extend(medicines)

        pct = page / total_pages * 100
        print(f"Page {page:>4}/{total_pages}  ({pct:5.1f}%)  +{len(medicines):>3} brands  total={len(all_medicines):>6}")

        # Incremental save
        if page % SAVE_INTERVAL == 0 or page == total_pages:
            write_outputs(all_medicines)
            save_progress(page, total_pages)
            print(f"  -> Saved {len(all_medicines)} entries to data/")

        time.sleep(DELAY_SECONDS)

    # Final deduplication by URL
    seen = set()
    unique = []
    for m in all_medicines:
        if m["url"] not in seen:
            seen.add(m["url"])
            unique.append(m)

    print(f"\nDone! {len(all_medicines)} total entries, {len(unique)} unique brands.")
    write_outputs(unique)
    PROGRESS_FILE.unlink(missing_ok=True)

    print(f"Saved to:")
    print(f"  {JSON_FILE}")
    print(f"  {CSV_FILE}")


if __name__ == "__main__":
    main()
