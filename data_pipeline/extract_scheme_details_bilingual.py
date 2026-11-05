import html
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests

BASE_URL = "https://www.myscheme.gov.in"
DATA_DIR = Path(__file__).resolve().parent / "data"
INPUT_FILE = DATA_DIR / "schemes_combined.json"
CHECKPOINT_FILE = DATA_DIR / "schemes_detailed_checkpoint.json"
FINAL_FILE = DATA_DIR / "schemes_detailed_combined_All_schemes.json"
URL_INVENTORY_FILE = DATA_DIR / "scheme_url_inventory.json"
REPORT_FILE = DATA_DIR / "extraction_report.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; YojnaMitraDataResearch/1.0)",
    "Accept": "application/json",
}
TIMEOUT = (10, 30)
REQUEST_DELAY = 2.0
MAX_RETRIES = 3
CHECKPOINT_EVERY = 10

# None processes every input scheme. Keep at 3 while validating the pilot.
# Increase/remove this limit only after the pilot output has been reviewed.
MAX_SCHEMES = None

URL_RE = re.compile(r"""https?://[^\s<>"')\]]+""", re.IGNORECASE)


def now_utc():
    return datetime.now(timezone.utc).isoformat()


def clean_url(url):
    if not isinstance(url, str):
        return ""
    url = html.unescape(url.strip()).rstrip(".,;:")
    return url


def extract_urls(value):
    if not isinstance(value, str) or not value:
        return []
    result = []
    for url in URL_RE.findall(value):
        url = clean_url(url)
        if url and url not in result:
            result.append(url)
    return result


def is_http_url(value):
    if not isinstance(value, str):
        return False
    parsed = urlparse(value.strip())
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def clean_display_text(value):
    """Clean HTML entities/tags and common Markdown artifacts for display."""
    text = html.unescape(str(value or ""))

    # Convert common line-break/block tags before removing remaining tags.
    text = re.sub(r"<\s*br\s*/?\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</\s*(p|div|li|h[1-6])\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<\s*li\b[^>]*>", "- ", text, flags=re.IGNORECASE)

    # Some Hindi source strings literally contain the Hindi transliteration of <br>.
    text = re.sub(r"<\s*बीआर\s*/?\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<\s*br\s*/?\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)

    # Repair common malformed Markdown emphasis without spanning multiple lines.
    text = re.sub(r"(?m)^\s*\*\s+\*\s*(.*?)\s*\*\s+\*\s*$", r"**\1**", text)
    text = re.sub(r"(?m)\*\s+\*\s*(.*?)\s*\*\s+\*", r"**\1**", text)

    # Normalize leftover HTML entities/tags and common Markdown spacing.
    text = re.sub(r"(?i)&nbsp;?", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def safe_text(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return clean_display_text(value)
    if isinstance(value, (int, float, bool)):
        return str(value)
    return ""


def flatten_text(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return clean_display_text(value)
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        parts = [flatten_text(item) for item in value]
        return "\n".join(part for part in parts if part)
    if isinstance(value, dict):
        preferred = ("text", "label", "name", "value", "description", "title")
        parts = []
        for key in preferred:
            if key in value:
                part = flatten_text(value[key])
                if part and part not in parts:
                    parts.append(part)
        return "\n".join(parts) if parts else json.dumps(value, ensure_ascii=False)
    return ""


def get_label(value):
    if isinstance(value, dict):
        return safe_text(value.get("label") or value.get("name") or value.get("value"))
    return safe_text(value)


def extract_list_or_text(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [text for item in value if (text := flatten_text(item))]
    text = flatten_text(value)
    return [text] if text else []


def add_link(links, url, source, title=""):
    url = clean_url(url)
    if not is_http_url(url):
        return
    key = (url, source, title)
    if not any((x["url"], x["source"], x["title"]) == key for x in links):
        links.append({
            "url": url,
            "title": title,
            "source": source,
            "verification_status": "unverified",
        })


def collect_urls_recursively(value, source, links, title_hint=""):
    if isinstance(value, str):
        for url in extract_urls(value):
            add_link(links, url, source, title_hint)
        if is_http_url(value):
            add_link(links, value, source, title_hint)
        return
    if isinstance(value, list):
        for item in value:
            collect_urls_recursively(item, source, links, title_hint)
        return
    if isinstance(value, dict):
        title = (
            safe_text(value.get("title"))
            or safe_text(value.get("label"))
            or safe_text(value.get("name"))
            or title_hint
        )
        for key, child in value.items():
            if isinstance(child, str) and key.lower() in {
                "url", "link", "href", "website", "weburl", "applicationurl"
            }:
                add_link(links, child, source, title)
            else:
                collect_urls_recursively(child, source, links, title)


def fetch_json(session, slug, lang):
    endpoint = f"{BASE_URL}/api/apisetu/schemes"
    params = {"slug": slug, "lang": lang}

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(
                endpoint, params=params, headers=HEADERS, timeout=TIMEOUT
            )
            print(f"HTTP {response.status_code}: {slug} [{lang}]")

            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                wait_seconds = (
                    int(retry_after)
                    if retry_after and retry_after.isdigit()
                    else min(30 * attempt, 90)
                )
                print(f"Rate limited; waiting {wait_seconds}s.")
                time.sleep(wait_seconds)
                continue

            if response.status_code in (500, 502, 503, 504) and attempt < MAX_RETRIES:
                time.sleep(3 * attempt)
                continue

            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or payload.get("status") != "Success":
                print(f"API response was not successful: {slug} [{lang}]")
                return None

            data = payload.get("data")
            if not isinstance(data, dict) or not isinstance(data.get(lang), dict):
                print(f"No usable {lang} content returned: {slug}")
                return None
            return data

        except (requests.RequestException, ValueError) as exc:
            print(f"Attempt {attempt}/{MAX_RETRIES} failed for {slug} [{lang}]: {exc}")
            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)
    return None


def parse_language_detail(data, lang):
    language_block = data.get(lang, {})
    basic = language_block.get("basicDetails", {})
    content = language_block.get("schemeContent", {})
    eligibility = language_block.get("eligibilityCriteria", {})
    application_process = language_block.get("applicationProcess", [])

    basic = basic if isinstance(basic, dict) else {}
    content = content if isinstance(content, dict) else {}
    eligibility = eligibility if isinstance(eligibility, dict) else {}
    application_process = application_process if isinstance(application_process, list) else []
    references = content.get("references", [])
    references = references if isinstance(references, list) else []

    parsed_process = []
    for item in application_process:
        if isinstance(item, dict):
            parsed_process.append({
                "mode": flatten_text(item.get("mode", "")),
                "process": safe_text(item.get("process_md") or item.get("process") or ""),
                "url": safe_text(item.get("url", "")),
                "raw": item,
            })

    all_links = []
    collect_urls_recursively(application_process, "application_process", all_links)
    collect_urls_recursively(references, "scheme_reference", all_links)
    collect_urls_recursively(content, "scheme_content", all_links)
    collect_urls_recursively(basic, "basic_details", all_links)
    collect_urls_recursively(eligibility, "eligibility_criteria", all_links)

    return {
        "language": lang,
        "scheme_name": safe_text(basic.get("schemeName") or basic.get("name")),
        "scheme_level": get_label(basic.get("level")),
        "category": get_label(basic.get("category")),
        "ministry": get_label(basic.get("ministry")),
        "department": get_label(basic.get("department")),
        "state": get_label(basic.get("state")),
        "brief_description": safe_text(content.get("briefDescription")),
        "detailed_description": safe_text(
            content.get("detailedDescription_md")
            or content.get("detailedDescription")
            or content.get("description")
        ),
        "benefits": flatten_text(content.get("benefits_md") or content.get("benefits")),
        "eligibility": flatten_text(
            eligibility.get("eligibilityDescription_md")
            or eligibility.get("eligibilityDescription")
            or eligibility
        ),
        "application_process": parsed_process,
        "documents": extract_list_or_text(
            content.get("documents")
            or content.get("requiredDocuments")
            or basic.get("documents")
        ),
        "tags": extract_list_or_text(basic.get("tags") or content.get("tags")),
        "references": references,
        "all_extracted_urls": all_links,
        "raw_sections": {
            "basicDetails": basic,
            "schemeContent": content,
            "eligibilityCriteria": eligibility,
            "applicationProcess": application_process,
        },
        "source_id": data.get("_id"),
        "retrieved_at": now_utc(),
    }


def classify_url_candidate(link):
    url = link.get("url", "")
    title = (link.get("title") or "").lower()
    source = (link.get("source") or "").lower()
    combined = f"{title} {source} {url}".lower()
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    path = parsed.path.lower()

    if (
        any(word in combined for word in (
            "guideline", "notification", "brochure", "manual", "circular",
            "government order", "g.o."
        ))
        or path.endswith((".pdf", ".doc", ".docx"))
    ):
        return "guidelines_candidate"

    if any(word in combined for word in (
        "apply now", "application portal", "apply online",
        "online application", "application form", "applicationchannel"
    )):
        return "application_candidate"

    if host.endswith((".gov.in", ".nic.in", ".gov")):
        return "official_website_candidate"

    if source.startswith("application"):
        return "application_process_link_needs_review"
    return "other_link_needs_review"


def normalized_key(value):
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def find_metadata_value(source, possible_keys):
    """Find a metadata value by key in nested source metadata without inventing values."""
    wanted = {normalized_key(key) for key in possible_keys}
    if isinstance(source, dict):
        for key, value in source.items():
            if normalized_key(key) in wanted:
                label = get_label(value) if isinstance(value, dict) else flatten_text(value)
                if label:
                    return label
        for value in source.values():
            found = find_metadata_value(value, possible_keys)
            if found:
                return found
    elif isinstance(source, list):
        for value in source:
            found = find_metadata_value(value, possible_keys)
            if found:
                return found
    return ""


def first_value(*values):
    for value in values:
        if isinstance(value, str) and value.strip():
            return clean_display_text(value)
    return ""



def normalize_category_values(value):
    """Preserve multiple categories as a list; do not merge them into one string."""
    if value is None:
        return []
    if isinstance(value, list):
        result = []
        for item in value:
            label = get_label(item) if isinstance(item, dict) else flatten_text(item)
            if label and label not in result:
                result.append(label)
        return result
    if isinstance(value, dict):
        label = get_label(value)
        return [label] if label else []
    label = clean_display_text(value)
    if not label:
        return []
    # Existing source data may represent multiple labels on separate lines.
    parts = [part.strip() for part in label.splitlines() if part.strip()]
    return list(dict.fromkeys(parts))

def merge_scheme(slug, source_scheme, en_data, hi_data):
    links = []
    for lang_data in (en_data, hi_data):
        if not lang_data:
            continue
        for link in lang_data.get("all_extracted_urls", []):
            candidate = dict(link)
            candidate["language"] = lang_data.get("language")
            candidate["candidate_category"] = classify_url_candidate(candidate)
            existing_link = next(
                (old for old in links
                 if old["url"].rstrip("/").lower() == candidate["url"].rstrip("/").lower()
                 and old["source"] == candidate["source"]),
                None,
            )
            if existing_link:
                languages = existing_link.setdefault("languages", [existing_link.get("language", "")])
                if candidate.get("language") and candidate["language"] not in languages:
                    languages.append(candidate["language"])
            else:
                candidate["languages"] = [candidate.get("language", "")]
                links.append(candidate)

    # All extracted URLs remain candidates until a human verifies them.
    # Do not publish candidate URLs into a trusted field automatically.
    guidelines_url = None

    metadata = source_scheme if isinstance(source_scheme, dict) else {}
    category_en = normalize_category_values(
        find_metadata_value(metadata, ("category_en", "categoryEnglish"))
        or (en_data or {}).get("category")
        or find_metadata_value(metadata, ("category",))
    )
    category_hi = normalize_category_values(
        find_metadata_value(metadata, ("category_hi", "categoryHindi", "categoryHindiName"))
        or (hi_data or {}).get("category")
    )
    department_en = first_value(
        find_metadata_value(metadata, ("department_en", "departmentEnglish")),
        (en_data or {}).get("department"),
        find_metadata_value(metadata, ("department",))
    )
    department_hi = first_value(
        find_metadata_value(metadata, ("department_hi", "departmentHindi", "departmentHindiName")),
        (hi_data or {}).get("department")
    )
    ministry_en = first_value(
        (en_data or {}).get("ministry"),
        find_metadata_value(metadata, ("ministry_en", "ministryEnglish", "ministry"))
    )
    ministry_hi = first_value(
        (hi_data or {}).get("ministry"),
        find_metadata_value(metadata, ("ministry_hi", "ministryHindi", "ministryHindiName"))
    )

    return {
        "slug": slug,
        "source_id_en": (en_data or {}).get("source_id"),
        "source_id_hi": (hi_data or {}).get("source_id"),
        "name_en": (en_data or {}).get("scheme_name", ""),
        "name_hi": (hi_data or {}).get("scheme_name", ""),
        "description_en": (en_data or {}).get("brief_description", ""),
        "description_hi": (hi_data or {}).get("brief_description", ""),
        "detailed_description_en": (en_data or {}).get("detailed_description", ""),
        "detailed_description_hi": (hi_data or {}).get("detailed_description", ""),
        "benefits_en": (en_data or {}).get("benefits", ""),
        "benefits_hi": (hi_data or {}).get("benefits", ""),
        "eligibility_en": (en_data or {}).get("eligibility", ""),
        "eligibility_hi": (hi_data or {}).get("eligibility", ""),
        "application_process_en": (en_data or {}).get("application_process", []),
        "application_process_hi": (hi_data or {}).get("application_process", []),
        "documents_en": (en_data or {}).get("documents", []),
        "documents_hi": (hi_data or {}).get("documents", []),
        "category_en": category_en,
        "category_hi": category_hi,
        "ministry_en": ministry_en,
        "ministry_hi": ministry_hi,
        "department_en": department_en,
        "department_hi": department_hi,
        "state_en": (en_data or {}).get("state", ""),
        "state_hi": (hi_data or {}).get("state", ""),
        "scheme_level_en": (en_data or {}).get("scheme_level", ""),
        "scheme_level_hi": (hi_data or {}).get("scheme_level", ""),
        "tags_en": (en_data or {}).get("tags", []),
        "tags_hi": (hi_data or {}).get("tags", []),
        "guidelines_url": guidelines_url,
        "application_url": None,
        "official_website_url": None,
        "all_urls": links,
        "url_extraction_note": (
            "Extracted URLs are candidates, not verified links. Application and "
            "official website fields remain null until appropriately reviewed."
        ),
        "source_page": f"{BASE_URL}/schemes/{slug}",
        "source_scheme_metadata": source_scheme,
        "language_status": {
            "en": "success" if en_data else "missing_or_failed",
            "hi": "success" if hi_data else "missing_or_failed",
        },
        "retrieved_at": now_utc(),
    }


def reclean_cached_value(value):
    """Re-clean cached parsed fields while preserving raw source sections and data types."""
    if isinstance(value, str):
        return clean_display_text(value)
    if isinstance(value, list):
        return [reclean_cached_value(item) for item in value]
    if isinstance(value, dict):
        cleaned = {}
        for key, item in value.items():
            # Raw API payloads are preserved verbatim for audit/debugging.
            if key == "raw_sections":
                cleaned[key] = item
            else:
                cleaned[key] = reclean_cached_value(item)
        return cleaned
    return value


def reclean_checkpoint_records(records):
    """Refresh display strings in old checkpoints without deleting or refetching data."""
    for slug, record in records.items():
        if not isinstance(record, dict):
            continue
        for lang in ("en", "hi"):
            if isinstance(record.get(lang), dict):
                record[lang] = reclean_cached_value(record[lang])


def load_json(path, default):
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return default


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    with temp_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    temp_path.replace(path)


def main():
    if not INPUT_FILE.exists():
        print(f"Input file not found: {INPUT_FILE}")
        return

    source_schemes = load_json(INPUT_FILE, None)
    if not isinstance(source_schemes, list):
        print("Expected schemes_combined.json to contain a JSON list.")
        return
    if MAX_SCHEMES is not None:
        source_schemes = source_schemes[:MAX_SCHEMES]

    checkpoint = load_json(CHECKPOINT_FILE, {"schemes": {}})
    if not isinstance(checkpoint, dict):
        checkpoint = {"schemes": {}}
    records = checkpoint.setdefault("schemes", {})
    if not isinstance(records, dict):
        records = {}
        checkpoint["schemes"] = records
    # Existing checkpoint entries may have been parsed by an older cleaner.
    # Re-clean their display fields before deciding whether to skip API requests.
    reclean_checkpoint_records(records)

    session = requests.Session()
    processed = 0
    request_count = 0

    for index, source_scheme in enumerate(source_schemes, start=1):
        if not isinstance(source_scheme, dict):
            continue
        slug = safe_text(source_scheme.get("slug"))
        # Keep the source slug unchanged. If it differs from a nested metadata slug,
        # report/review the mismatch rather than silently rewriting identifiers.
        metadata_slug = safe_text(source_scheme.get("source_scheme_metadata", {}).get("slug")) if isinstance(source_scheme.get("source_scheme_metadata"), dict) else ""
        if metadata_slug and metadata_slug != slug:
            print(f"WARNING: slug mismatch in input record: top-level={slug!r}, metadata={metadata_slug!r}")
        if not slug:
            print(f"Skipping record {index}: missing slug.")
            continue

        existing = records.get(slug, {})
        if existing.get("en") and existing.get("hi"):
            print(f"[{index}/{len(source_schemes)}] Already collected: {slug}")
            continue

        print(f"\n[{index}/{len(source_schemes)}] Scheme: {slug}")
        en_data = existing.get("en")
        hi_data = existing.get("hi")

        if not en_data:
            raw_en = fetch_json(session, slug, "en")
            request_count += 1
            if raw_en:
                en_data = parse_language_detail(raw_en, "en")
            time.sleep(REQUEST_DELAY)

        if not hi_data:
            raw_hi = fetch_json(session, slug, "hi")
            request_count += 1
            if raw_hi:
                hi_data = parse_language_detail(raw_hi, "hi")
            time.sleep(REQUEST_DELAY)

        records[slug] = {
            "en": en_data,
            "hi": hi_data,
            "source_scheme": source_scheme,
            "last_attempt_at": now_utc(),
        }
        processed += 1

        if processed % CHECKPOINT_EVERY == 0:
            save_json(CHECKPOINT_FILE, checkpoint)
            print(f"Checkpoint saved; {len(records)} slugs stored.")

    save_json(CHECKPOINT_FILE, checkpoint)

    merged_records = []
    url_inventory = []
    stats = {
        "input_scheme_count": len(source_schemes),
        "checkpoint_slug_count": len(records),
        "english_success": 0,
        "hindi_success": 0,
        "both_languages_success": 0,
        "neither_language_success": 0,
        "schemes_with_any_url": 0,
        "total_url_candidates": 0,
        "requests_this_run": request_count,
    }

    for source_scheme in source_schemes:
        if not isinstance(source_scheme, dict):
            continue
        slug = safe_text(source_scheme.get("slug"))
        item = records.get(slug, {})
        en_data = item.get("en")
        hi_data = item.get("hi")

        stats["english_success"] += bool(en_data)
        stats["hindi_success"] += bool(hi_data)
        stats["both_languages_success"] += bool(en_data and hi_data)
        stats["neither_language_success"] += bool(not en_data and not hi_data)

        merged = merge_scheme(slug, source_scheme, en_data, hi_data)
        merged_records.append(merged)
        stats["schemes_with_any_url"] += bool(merged["all_urls"])
        stats["total_url_candidates"] += len(merged["all_urls"])

        url_inventory.append({
            "slug": slug,
            "scheme_name_en": merged["name_en"],
            "scheme_name_hi": merged["name_hi"],
            "guidelines_url": merged["guidelines_url"],
            "application_url": merged["application_url"],
            "official_website_url": merged["official_website_url"],
            "all_urls": merged["all_urls"],
        })

    save_json(FINAL_FILE, merged_records)
    save_json(URL_INVENTORY_FILE, url_inventory)

    quality_checks = {
        "schemes_missing_category_en": [
            x["slug"] for x in merged_records if not x.get("category_en")
        ],
        "schemes_missing_category_hi": [
            x["slug"] for x in merged_records if not x.get("category_hi")
        ],
        "schemes_missing_department_en": [
            x["slug"] for x in merged_records if not x.get("department_en")
        ],
        "schemes_missing_department_hi": [
            x["slug"] for x in merged_records if not x.get("department_hi")
        ],
        "schemes_without_documents_en": [
            x["slug"] for x in merged_records if not x.get("documents_en")
        ],
        "schemes_without_documents_hi": [
            x["slug"] for x in merged_records if not x.get("documents_hi")
        ],
        "schemes_without_application_url": [
            x["slug"] for x in merged_records if not x.get("application_url")
        ],
        "schemes_without_official_website_url": [
            x["slug"] for x in merged_records if not x.get("official_website_url")
        ],
        "schemes_missing_description_en": [
            x["slug"] for x in merged_records if not x.get("description_en")
        ],
        "schemes_missing_description_hi": [
            x["slug"] for x in merged_records if not x.get("description_hi")
        ],
        "schemes_without_application_process_en": [
            x["slug"] for x in merged_records if not x.get("application_process_en")
        ],
        "schemes_without_application_process_hi": [
            x["slug"] for x in merged_records if not x.get("application_process_hi")
        ],
        "unverified_url_candidate_count": sum(
            1 for scheme in merged_records
            for candidate in scheme.get("all_urls", [])
            if candidate.get("verification_status") != "verified"
        ),
    }

    report = {
        "generated_at": now_utc(),
        "source": "myScheme detail API",
        "notes": [
            "Only fields returned by the API are extracted.",
            "Category fields are normalized to lists to preserve multi-category schemes.",
            "Guidelines/application/official website fields stay null until a URL is verified.",
            "Some schemes may not have content in both languages.",
            "URL candidates are not proof of official authorization.",
            "Application and official website URLs require review before publication.",
            "If rate limited, wait before rerunning; checkpoint data is preserved.",
        ],
        "stats": stats,
        "quality_checks": quality_checks,
        "output_files": {
            "checkpoint": str(CHECKPOINT_FILE),
            "bilingual_dataset": str(FINAL_FILE),
            "url_inventory": str(URL_INVENTORY_FILE),
            "report": str(REPORT_FILE),
        },
    }
    save_json(REPORT_FILE, report)

    print("\n" + "=" * 60)
    print("EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"Input schemes: {stats['input_scheme_count']}")
    print(f"English available: {stats['english_success']}")
    print(f"Hindi available: {stats['hindi_success']}")
    print(f"Both languages: {stats['both_languages_success']}")
    print(f"Schemes with URL candidates: {stats['schemes_with_any_url']}")
    print(f"Total URL candidates: {stats['total_url_candidates']}")
    print("\nFiles saved:")
    print(FINAL_FILE)
    print(URL_INVENTORY_FILE)
    print(REPORT_FILE)
    print("\nNo URL has been marked as verified by this script.")


if __name__ == "__main__":
    main()
