import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT_DIR / "data" / "schemes_combined.json"

# Load environment variables from project root.
load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

BATCH_SIZE = 100


def load_schemes():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"JSON file not found: {DATA_FILE}")

    with DATA_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError("Combined JSON must contain a list.")

    return data


def normalize_level(level, state):
    value = str(level or "").strip().lower()

    if value in {"state", "state level", "state-level"}:
        return "state"

    if value in {"central", "central level", "central-level"}:
        return "central"

    # Unknown levels should not be silently treated as central.
    # The database currently has a NOT NULL column with default central.
    # We skip records whose level cannot be confidently determined.
    return None


def make_payload(record):
    slug = record.get("slug")

    if not slug:
        return None, "missing slug"

    name = record.get("name_en") or record.get("name_hi")

    if not name:
        return None, "missing scheme name"

    level = normalize_level(
        record.get("level_en") or record.get("level_hi"),
        record.get("state_en") or record.get("state_hi"),
    )

    if level is None:
        return None, "unknown scheme level"

    source_url = f"https://www.myscheme.gov.in/schemes/{slug}"

    payload = {
        "source_slug": slug,
        "source_id_en": record.get("source_id_en"),
        "source_id_hi": record.get("source_id_hi"),

        "name": name,
        "name_hi": record.get("name_hi"),
        "description": record.get("description_en"),
        "description_hi": record.get("description_hi"),

        "category": record.get("category_en") or record.get("category_hi"),
        "scheme_level": level,
        "state": record.get("state_en") or record.get("state_hi"),
        "target_state": record.get("state_en") or record.get("state_hi"),

        "official_url": source_url,
        "source_name": "myScheme",

        # Details not collected by the listing scraper remain empty.
        "benefits": [],
        "required_documents": [],
        "eligible_occupation": [],
        "eligible_social_categories": [],

        "publication_status": "draft",
        "is_active": True,
    }

    return payload, None


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(
            "ERROR: Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in the root .env file."
        )
        sys.exit(1)

    records = load_schemes()

    print(f"Loaded {len(records)} combined records.")

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    payloads = []
    skipped = []

    for record in records:
        payload, reason = make_payload(record)

        if reason:
            skipped.append({
                "slug": record.get("slug"),
                "reason": reason,
            })
            continue

        payloads.append(payload)

    print(f"Ready to import: {len(payloads)}")
    print(f"Skipped during validation: {len(skipped)}")

    # Dry run first: do not change the database until reviewed.
    if os.getenv("IMPORT_CONFIRM") != "YES":
        print("\nDRY RUN ONLY: No database changes were made.")
        print("Review the mapping before enabling the import.")
        print("Example record:")
        print(json.dumps(payloads[0], ensure_ascii=False, indent=2)
              if payloads else "No valid records.")
        print("\nTo enable import, set IMPORT_CONFIRM=YES in .env.")
        return

    imported = 0
    errors = []

    for start in range(0, len(payloads), BATCH_SIZE):
        batch = payloads[start:start + BATCH_SIZE]

        try:
            result = (
                client.table("schemes")
                .upsert(batch, on_conflict="source_slug")
                .execute()
            )

            imported += len(result.data or [])
            print(
                f"Processed batch "
                f"{start // BATCH_SIZE + 1}: "
                f"{len(result.data or [])} records returned."
            )

        except Exception as error:
            errors.append({
                "batch_start": start,
                "error": str(error),
            })

            print(f"ERROR in batch starting at {start}: {error}")
            print("Stopping to avoid continuing after a failed batch.")
            break

    report = {
        "input_records": len(records),
        "valid_records": len(payloads),
        "skipped_records": skipped,
        "records_returned_by_upsert": imported,
        "errors": errors,
    }

    report_path = DATA_FILE.parent / "import_report.json"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\nImport report saved to:", report_path)
    print(json.dumps({
        "valid_records": len(payloads),
        "records_returned_by_upsert": imported,
        "errors": len(errors),
    }, indent=2))


if __name__ == "__main__":
    main()
