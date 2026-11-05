import json
import time
import logging
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "https://www.myscheme.gov.in"

LIST_API = f"{BASE_URL}/api/apisetu/search/schemes/facets"

# Detail endpoint: verify the response structure against the
# current myScheme API before processing the full dataset.
DETAIL_API = f"{BASE_URL}/api/apisetu/schemes"

HEADERS = {
    "User-Agent": "YojnaMitraResearchBot/1.0",
    "Accept": "application/json",
}

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

INPUT_FILE = DATA_DIR / "schemes_combined.json"

OUTPUT_FILE = DATA_DIR / "schemes_detailed_bilingual.json"
CHECKPOINT_FILE = DATA_DIR / "schemes_detailed_checkpoint.json"
FAILED_FILE = DATA_DIR / "schemes_detailed_failed.json"
REPORT_FILE = DATA_DIR / "schemes_detailed_report.json"

LANGUAGES = ("en", "hi")

PAGE_SIZE = 10
REQUEST_DELAY = 1.0
TIMEOUT = 30

# Start with a small pilot. Set to N  one only after verifying
# the detail endpoint and output for the pilot schemes.
MAX_SCHEMES = 3

# Preserve existing checkpoint records unless explicitly changed.
FORCE_REFETCH = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("yojnamitra_scraper")


# ============================================================
# HTTP SESSION
# ============================================================

def create_session() -> requests.Session:
    session = requests.Session()

    retry = Retry(
        total=4,
        connect=4,
        read=4,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )

    adapter = HTTPAdapter(max_retries=retry)

    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(HEADERS)

    return session


# ============================================================
# JSON HELPERS
# ============================================================

def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default

    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        logger.warning("Could not read %s: %s", path.name, error)
        return default


def save_json(path: Path, data: Any) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    temporary_path = path.with_suffix(path.suffix + ".tmp")

    with temporary_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

    temporary_path.replace(path)


def get_nested(data: Any, *keys: str, default=None):
    current = data

    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)

    return current if current is not None else default


# ============================================================
# SCHEME LISTING
# ============================================================

def fetch_listing_page(
    session: requests.Session,
    language: str,
    offset: int,
) -> tuple[list, int]:
    params = {
        "lang": language,
        "from": offset,
        "size": PAGE_SIZE,
    }

    response = session.get(
        LIST_API,
        params=params,
        timeout=TIMEOUT,
    )
    response.raise_for_status()

    payload = response.json()

    if payload.get("status") != "Success":
        raise RuntimeError(
            f"Unexpected listing API response: {payload}"
        )

    hits = get_nested(payload, "data", "hits", default={})
    items = hits.get("items", [])
    page = hits.get("page", {})

    return items, int(page.get("total", 0))


def collect_scheme_list(
    session: requests.Session,
) -> dict[str, dict]:
    """
    Collect unique schemes using the listing API.

    The English listing is the primary source for unique slugs.
    Hindi listing adds Hindi names and metadata where available.
    """
    schemes: dict[str, dict] = {}

    for language in LANGUAGES:
        offset = 0
        total = None

        logger.info("Collecting %s scheme listing", language.upper())

        while total is None or offset < total:
            items, reported_total = fetch_listing_page(
                session, language, offset
            )

            if total is None:
                total = reported_total
                logger.info(
                    "%s listing reports %s records",
                    language.upper(),
                    total,
                )

            if not items:
                break

            for item in items:
                fields = item.get("fields", {})
                slug = fields.get("slug")

                if not slug:
                    continue

                record = schemes.setdefault(
                    slug,
                    {
                        "slug": slug,
                        "source_id": item.get("id"),
                        "name_en": None,
                        "name_hi": None,
                        "description_en": None,
                        "description_hi": None,
                        "state_en": None,
                        "state_hi": None,
                        "level_en": None,
                        "level_hi": None,
                        "category_en": None,
                        "category_hi": None,
                        "ministry_en": None,
                        "ministry_hi": None,
                        "department_en": None,
                        "department_hi": None,
                        "scheme_for_en": None,
                        "scheme_for_hi": None,
                        "tags_en": None,
                        "tags_hi": None,
                        "source": "myScheme",
                    },
                )

                suffix = language

                record[f"name_{suffix}"] = (
                    fields.get("schemeName")
                    or record[f"name_{suffix}"]
                )
                record[f"description_{suffix}"] = (
                    fields.get("briefDescription")
                    or record[f"description_{suffix}"]
                )
                record[f"state_{suffix}"] = (
                    fields.get("beneficiaryState")
                    or record[f"state_{suffix}"]
                )
                record[f"level_{suffix}"] = (
                    fields.get("level")
                    or record[f"level_{suffix}"]
                )
                record[f"category_{suffix}"] = (
                    fields.get("schemeCategory")
                    or record[f"category_{suffix}"]
                )
                record[f"ministry_{suffix}"] = (
                    fields.get("nodalMinistryName")
                    or record[f"ministry_{suffix}"]
                )
                record[f"department_{suffix}"] = (
                    fields.get("nodalDepartmentName")
                    or record[f"department_{suffix}"]
                )
                record[f"scheme_for_{suffix}"] = (
                    fields.get("schemeFor")
                    or record[f"scheme_for_{suffix}"]
                )
                record[f"tags_{suffix}"] = (
                    fields.get("tags")
                    or record[f"tags_{suffix}"]
                )

            offset += len(items)

            logger.info(
                "%s listing progress: %s/%s",
                language.upper(),
                min(offset, total),
                total,
            )

            if offset < total:
                time.sleep(REQUEST_DELAY)

    return schemes


# ============================================================
# SCHEME DETAIL FETCHING
# ============================================================

def fetch_scheme_detail(
    session: requests.Session,
    slug: str,
    language: str,
) -> dict:
    """
    Fetch one scheme's detail response.

    IMPORTANT:
    This endpoint must be validated against a real API response
    before running at scale. If the current API expects a different
    route or query parameters, update this function accordingly.
    """
    url = f"{DETAIL_API}/{slug}"

    response = session.get(
        url,
        params={"lang": language},
        timeout=TIMEOUT,
    )

    if response.status_code == 404:
        raise RuntimeError(
            f"Detail endpoint returned 404 for slug={slug}, "
            f"language={language}. Verify DETAIL_API."
        )

    response.raise_for_status()

    payload = response.json()

    if not isinstance(payload, dict):
        raise ValueError("Detail API returned a non-object JSON response")

    return payload


def unwrap_detail(payload: dict) -> dict:
    """
    Support common API response wrappers without assuming that
    every field exists.
    """
    data = payload.get("data", payload)

    if isinstance(data, dict) and isinstance(data.get("scheme"), dict):
        data = data["scheme"]

    return data if isinstance(data, dict) else {}


def normalize_detail(payload: dict) -> dict:
    """
    Preserve the source detail object and expose commonly useful
    fields when the API returns them.

    Original API keys remain available under raw_detail so that
    useful source data is not discarded.
    """
    detail = unwrap_detail(payload)

    return {
        "description": (
            detail.get("description")
            or detail.get("detailedDescription")
            or detail.get("schemeDescription")
        ),
        "brief_description": detail.get("briefDescription"),
        "benefits": (
            detail.get("benefits")
            or detail.get("schemeBenefits")
        ),
        "eligibility": (
            detail.get("eligibility")
            or detail.get("eligibilityCriteria")
        ),
        "application_process": (
            detail.get("applicationProcess")
            or detail.get("application_process")
        ),
        "application_url": (
            detail.get("applicationUrl")
            or detail.get("application_url")
            or detail.get("applyLink")
        ),
        "official_url": (
            detail.get("officialWebsite")
            or detail.get("officialUrl")
            or detail.get("schemeUrl")
        ),
        "faqs": detail.get("faqs") or detail.get("faq"),
        "documents": (
            detail.get("documents")
            or detail.get("requiredDocuments")
        ),
        "raw_detail": detail,
    }


# ============================================================
# MAIN DETAIL ENRICHMENT
# ============================================================

def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with create_session() as session:
        # Reuse the existing bilingual base dataset if available.
        base_records = read_json(INPUT_FILE, [])

        if not isinstance(base_records, list):
            raise RuntimeError(
                f"{INPUT_FILE.name} must contain a JSON list"
            )

        logger.info(
            "Loaded %s records from %s",
            len(base_records),
            INPUT_FILE.name,
        )

        # Collect listing metadata from both languages.
        listing = collect_scheme_list(session)

        # Merge the existing dataset and listing by slug.
        merged: dict[str, dict] = {}

        for record in base_records:
            slug = record.get("slug")
            if slug:
                merged[slug] = dict(record)

        for slug, record in listing.items():
            existing = merged.setdefault(slug, {})
            existing.update(
                {
                    key: value
                    for key, value in record.items()
                    if value is not None
                }
            )

        all_schemes = list(merged.values())

        if MAX_SCHEMES is not None:
            all_schemes = all_schemes[:MAX_SCHEMES]

        logger.info(
            "Unique schemes available for processing: %s",
            len(all_schemes),
        )

        # Load previously completed details for resumability.
        checkpoint = read_json(CHECKPOINT_FILE, {})

        if not isinstance(checkpoint, dict):
            checkpoint = {}

        failed = []

        for index, scheme in enumerate(all_schemes, start=1):
            slug = scheme.get("slug")

            if not slug:
                continue

            existing_detail = checkpoint.get(slug, {})

            logger.info(
                "[%s/%s] Processing %s",
                index,
                len(all_schemes),
                slug,
            )

            bilingual_details = existing_detail.get("details", {})

            for language in LANGUAGES:
                if (
                    not FORCE_REFETCH
                    and language in bilingual_details
                    and bilingual_details[language].get("fetch_status")
                    == "success"
                ):
                    logger.info(
                        "Skipping cached %s detail for %s",
                        language,
                        slug,
                    )
                    continue

                try:
                    payload = fetch_scheme_detail(
                        session,
                        slug,
                        language,
                    )

                    normalized = normalize_detail(payload)

                    bilingual_details[language] = {
                        **normalized,
                        "fetch_status": "success",
                        "language": language,
                    }

                    logger.info(
                        "Fetched %s detail for %s",
                        language.upper(),
                        slug,
                    )

                except (
                    requests.RequestException,
                    ValueError,
                    RuntimeError,
                ) as error:
                    bilingual_details[language] = {
                        "fetch_status": "failed",
                        "language": language,
                        "error": str(error),
                    }

                    failed.append(
                        {
                            "slug": slug,
                            "language": language,
                            "error": str(error),
                        }
                    )

                    logger.error(
                        "Failed %s detail for %s: %s",
                        language,
                        slug,
                        error,
                    )

                checkpoint[slug] = {
                    "slug": slug,
                    "source_id": scheme.get("source_id"),
                    "details": bilingual_details,
                }

                # Save after each language to minimize lost work.
                save_json(CHECKPOINT_FILE, checkpoint)

                time.sleep(REQUEST_DELAY)

        # Combine listing metadata with fetched detail records.
        output_records = []

        for scheme in all_schemes:
            slug = scheme.get("slug")
            saved = checkpoint.get(slug, {})
            details = saved.get("details", {})

            output = dict(scheme)

            for language in LANGUAGES:
                detail = details.get(language, {})
                suffix = language

                output[f"description_detailed_{suffix}"] = (
                    detail.get("description")
                )
                output[f"benefits_{suffix}"] = detail.get("benefits")
                output[f"eligibility_{suffix}"] = (
                    detail.get("eligibility")
                )
                output[f"application_process_{suffix}"] = (
                    detail.get("application_process")
                )
                output[f"application_url_{suffix}"] = (
                    detail.get("application_url")
                )
                output[f"official_url_{suffix}"] = (
                    detail.get("official_url")
                )
                output[f"faqs_{suffix}"] = detail.get("faqs")
                output[f"documents_{suffix}"] = detail.get("documents")
                output[f"detail_fetch_status_{suffix}"] = (
                    detail.get("fetch_status", "not_attempted")
                )

                # Retain the full API response for future field mapping.
                output[f"raw_detail_{suffix}"] = detail.get("raw_detail")

            output_records.append(output)

        save_json(OUTPUT_FILE, output_records)
        save_json(FAILED_FILE, failed)

        report = {
            "total_schemes": len(output_records),
            "successful_english_details": sum(
                record.get("detail_fetch_status_en") == "success"
                for record in output_records
            ),
            "successful_hindi_details": sum(
                record.get("detail_fetch_status_hi") == "success"
                for record in output_records
            ),
            "failed_requests": len(failed),
            "max_schemes_setting": MAX_SCHEMES,
            "output_file": str(OUTPUT_FILE),
            "checkpoint_file": str(CHECKPOINT_FILE),
            "failed_file": str(FAILED_FILE),
            "note": (
                "Pilot output only. Verify endpoint and field mapping "
                "before processing the full catalogue."
            ),
        }

        save_json(REPORT_FILE, report)

        logger.info("Scraping run finished.")
        logger.info("Output: %s", OUTPUT_FILE)
        logger.info("Checkpoint: %s", CHECKPOINT_FILE)
        logger.info("Failures: %s", FAILED_FILE)
        logger.info("Report: %s", REPORT_FILE)


if __name__ == "__main__":
    main()
