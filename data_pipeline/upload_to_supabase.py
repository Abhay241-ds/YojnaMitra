import os
import json
import time
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client


# =========================================================
# 1. PATHS AND ENVIRONMENT
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")
load_dotenv(PROJECT_DIR / ".env", override=False)

INPUT_FILE = BASE_DIR / "data" / "schemes_bilingual_detailed_cleaned.json"

REPORT_FILE = BASE_DIR / "data" / "upload_report.json"
PREVIEW_FILE = BASE_DIR / "data" / "upload_preview.json"

BATCH_SIZE = 100
TABLE_NAME = "schemes"


# =========================================================
# 2. SUPABASE CONNECTION
# =========================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL missing from .env")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SECRET_KEY missing from .env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# =========================================================
# 3. HELPER FUNCTIONS
# =========================================================

def get_value(data, *keys, default=None):
    """Return the first available non-empty value."""

    if not isinstance(data, dict):
        return default

    for key in keys:
        value = data.get(key)

        if value is not None and value != "":
            return value

    return default


def clean_text(value):
    """Convert values into clean text."""

    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()
        return value if value else None

    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)

    return str(value)


def clean_list(value):
    """Ensure JSONB array fields receive lists."""

    if value is None:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return []

        try:
            parsed = json.loads(value)

            if isinstance(parsed, list):
                return parsed

            return [parsed]

        except json.JSONDecodeError:
            return [value]

    return [value]


def text_array(value):
    """Convert documents into PostgreSQL TEXT[] values."""

    result = []

    for item in clean_list(value):
        if isinstance(item, dict):
            text = clean_text(
                item.get("name")
                or item.get("document")
                or item.get("title")
                or item
            )
        else:
            text = clean_text(item)

        if text:
            result.append(text)

    return result


def normalize_scheme_level(value):
    """
    Existing database constraint allows only:
    central or state.
    """

    if not value:
        return "central"

    value = str(value).strip().lower()

    if value == "central":
        return "central"

    if value in ("state", "state/ ut", "state/ut", "state / ut"):
        return "state"

    # Preserve database compatibility for unexpected values.
    return "central"


def get_official_url(record):
    """Find an official application or scheme URL."""

    links = record.get("official_links", {})

    if isinstance(links, str):
        try:
            links = json.loads(links)
        except json.JSONDecodeError:
            links = {}

    if not isinstance(links, dict):
        links = {}

    url = (
        get_value(
            links,
            "application_url",
            "official_website_url",
            "official_url",
            "guidelines_url"
        )
        or record.get("source_page")
    )

    if isinstance(url, list):
        url = url[0] if url else None

    return clean_text(url)


# =========================================================
# 4. MAP ONE SCHEME
# =========================================================

def map_scheme(slug, record):

    en = record.get("en") or {}
    hi = record.get("hi") or {}

    if not isinstance(en, dict) or not isinstance(hi, dict):
        raise ValueError("Invalid English/Hindi language structure")

    # Names
    name_en = clean_text(
        get_value(en, "scheme_name", "name", "title")
    )

    name_hi = clean_text(
        get_value(hi, "scheme_name", "name", "title")
    )

    # Descriptions
    brief_en = clean_text(
        get_value(en, "brief_description", "description", "summary")
    )

    brief_hi = clean_text(
        get_value(hi, "brief_description", "description", "summary")
    )

    detailed_en = clean_text(
        get_value(en, "detailed_description", "full_description")
    )

    detailed_hi = clean_text(
        get_value(hi, "detailed_description", "full_description")
    )

    # Scheme level
    level_en = clean_text(get_value(en, "scheme_level", "level"))
    level_hi = clean_text(get_value(hi, "scheme_level", "level"))

    # IMPORTANT:
    # Only legacy scheme_level is normalized.
    # Original English/Hindi values remain unchanged.

    scheme_level = normalize_scheme_level(level_en or level_hi)

    # State names are NOT normalized.
    state_en = clean_text(get_value(en, "state", "state_name"))
    state_hi = clean_text(get_value(hi, "state", "state_name"))

    # Benefits
    benefits_en = clean_list(
        get_value(en, "benefits", "benefit")
    )

    benefits_hi = clean_list(
        get_value(hi, "benefits", "benefit")
    )

    # Eligibility
    eligibility_en = clean_text(
        get_value(en, "eligibility", "eligibility_criteria")
    )

    eligibility_hi = clean_text(
        get_value(hi, "eligibility", "eligibility_criteria")
    )

    # Documents
    documents_en = clean_list(
        get_value(en, "documents", "required_documents")
    )

    documents_hi = clean_list(
        get_value(hi, "documents", "required_documents")
    )

    # Application process
    process_en = clean_list(
        get_value(en, "application_process", "application_steps")
    )

    process_hi = clean_list(
        get_value(hi, "application_process", "application_steps")
    )

    # Other fields
    category_en = clean_text(get_value(en, "category"))
    category_hi = clean_text(get_value(hi, "category"))

    ministry_en = clean_text(get_value(en, "ministry"))
    ministry_hi = clean_text(get_value(hi, "ministry"))

    department_en = clean_text(get_value(en, "department"))
    department_hi = clean_text(get_value(hi, "department"))

    scheme_name = name_en or name_hi

    if not scheme_name:
        raise ValueError("Scheme name missing")

    official_url = get_official_url(record)

    if not official_url:
        raise ValueError("Official URL missing")

    # =====================================================
    # DATABASE RECORD
    # =====================================================

    data = {

        # Legacy columns
        "name": scheme_name,
        "description": brief_en or detailed_en or brief_hi or detailed_hi,

        "benefits": benefits_en,
        "eligibility_summary": eligibility_en or eligibility_hi,

        "required_documents": documents_en,

        "application_process": (
            json.dumps(process_en, ensure_ascii=False)
            if process_en else None
        ),

        "category": category_en or category_hi,

        "scheme_level": scheme_level,

        "state": state_en or state_hi,

        "official_url": official_url,

        "source_name": "myScheme",

        "publication_status": "draft",

        "updated_at": datetime.now(timezone.utc).isoformat(),

        "is_active": True,

        "annual_income_limit": None,
        "eligible_occupation": [],
        "min_age": None,
        "max_age": None,

        "target_state": state_en or state_hi,

        "name_hi": name_hi,

        "description_hi": brief_hi or detailed_hi,

        "benefits_hi": (
            json.dumps(benefits_hi, ensure_ascii=False)
            if benefits_hi else None
        ),

        "application_process_hi": (
            json.dumps(process_hi, ensure_ascii=False)
            if process_hi else None
        ),

        "required_documents_hi": text_array(documents_hi),

        "source_slug": slug,

        # Bilingual columns
        "scheme_name_en": name_en,
        "scheme_name_hi": name_hi,

        "scheme_level_en": level_en,
        "scheme_level_hi": level_hi,

        "category_en": category_en,
        "category_hi": category_hi,

        "ministry_en": ministry_en,
        "ministry_hi": ministry_hi,

        "department_en": department_en,
        "department_hi": department_hi,

        "state_en": state_en,
        "state_hi": state_hi,

        "brief_description_en": brief_en,
        "brief_description_hi": brief_hi,

        "detailed_description_en": detailed_en,
        "detailed_description_hi": detailed_hi,

        "benefits_en": json.dumps(
            benefits_en, ensure_ascii=False
        ),

        "eligibility_en": eligibility_en,
        "eligibility_hi": eligibility_hi,

        "application_process_en": process_en,

        "documents_en": documents_en,
        "documents_hi": documents_hi,

        "tags_en": clean_list(get_value(en, "tags")),
        "tags_hi": clean_list(get_value(hi, "tags")),

        # Source metadata
        "source_scheme": record.get("source_scheme") or {},
        "official_links": record.get("official_links") or {},
        "references": record.get("references") or [],
        "language_status": record.get("language_status") or {},

        "source_page": record.get("source_page")
    }

    return data


# =========================================================
# 5. LOAD JSON
# =========================================================

def load_schemes():

    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}"
        )

    with open(INPUT_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, dict):
        raise ValueError("Expected a dictionary containing schemes")

    schemes = data.get("schemes", data)

    if not isinstance(schemes, dict):
        raise ValueError("Invalid schemes structure")

    return schemes


# =========================================================
# 6. PREPARE RECORDS
# =========================================================

def prepare_records(schemes):

    prepared = []
    errors = []

    for slug, record in schemes.items():

        try:
            mapped = map_scheme(slug, record)
            prepared.append(mapped)

        except Exception as error:

            errors.append({
                "slug": slug,
                "error": str(error)
            })

    return prepared, errors


# =========================================================
# 7. UPLOAD IN BATCHES
# =========================================================

def upload_records(records):

    successful = 0
    failed = []

    total = len(records)

    for start in range(0, total, BATCH_SIZE):

        batch = records[start:start + BATCH_SIZE]

        batch_number = (start // BATCH_SIZE) + 1

        print(
            f"\nUploading batch {batch_number} | "
            f"{start + 1}-{min(start + BATCH_SIZE, total)} "
            f"of {total}"
        )

        try:

            response = (
                supabase
                .table(TABLE_NAME)
                .upsert(
                    batch,
                    on_conflict="source_slug"
                )
                .execute()
            )

            successful += len(batch)

            print(f"SUCCESS: {len(batch)} records")

        except Exception as error:

            print(f"FAILED: {error}")

            failed.append({
                "batch": batch_number,
                "records": len(batch),
                "error": str(error)
            })

        time.sleep(0.2)

    return successful, failed


# =========================================================
# 8. SAVE REPORT
# =========================================================

def save_json(path, data):

    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, "w", encoding="utf-8") as file:

        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2
        )


# =========================================================
# 9. MAIN
# =========================================================

def main():

    print("=" * 60)
    print("YOJNAMITRA - SUPABASE DATA UPLOADER")
    print("=" * 60)

    print("\nLoading bilingual schemes...")

    schemes = load_schemes()

    print(f"Total schemes found: {len(schemes)}")

    print("\nPreparing records...")

    records, mapping_errors = prepare_records(schemes)

    print(f"Prepared records: {len(records)}")
    print(f"Mapping errors: {len(mapping_errors)}")

    # Save preview before uploading
    save_json(
        PREVIEW_FILE,
        records[:5]
    )

    print(f"\nPreview saved: {PREVIEW_FILE}")

    if not records:
        print("No valid records to upload.")
        return

    print("\nStarting Supabase upload...")

    successful, upload_errors = upload_records(records)

    report = {

        "timestamp": datetime.now(timezone.utc).isoformat(),

        "input_file": str(INPUT_FILE),

        "total_input_schemes": len(schemes),

        "prepared_records": len(records),

        "mapping_errors_count": len(mapping_errors),

        "successful_uploads": successful,

        "failed_batches_count": len(upload_errors),

        "mapping_errors": mapping_errors,

        "upload_errors": upload_errors

    }

    save_json(REPORT_FILE, report)

    print("\n" + "=" * 60)
    print("UPLOAD SUMMARY")
    print("=" * 60)

    print(f"Total schemes:       {len(schemes)}")
    print(f"Prepared records:    {len(records)}")
    print(f"Mapping errors:      {len(mapping_errors)}")
    print(f"Successful uploads:  {successful}")
    print(f"Failed batches:      {len(upload_errors)}")

    print(f"\nReport saved: {REPORT_FILE}")

    if upload_errors:
        print("\nSome batches failed. Check upload_report.json.")
    else:
        print("\nUpload completed successfully!")


if __name__ == "__main__":
    main()
