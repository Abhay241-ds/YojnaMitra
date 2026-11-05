import json
import os
from pathlib import Path


# =====================================================
# CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

INPUT_FILE = DATA_DIR / "schemes_detailed_combined_All_schemes.json"
OUTPUT_FILE = DATA_DIR / "schemes_cleaned.json"
TEMP_FILE = DATA_DIR / "schemes_cleaned.json.tmp"


# =====================================================
# FIELD MAPPING
# =====================================================

FIELD_MAPPING = {
    "scheme_name": "name",
    "scheme_level": "scheme_level",
    "category": "category",
    "ministry": "ministry",
    "department": "department",
    "state": "state",
    "brief_description": "description",
    "detailed_description": "detailed_description",
    "benefits": "benefits",
    "eligibility": "eligibility",
    "application_process": "application_process",
    "documents": "documents",
    "tags": "tags"
}


# =====================================================
# CLEAN APPLICATION PROCESS
# =====================================================

def clean_application_process(value):

    if not isinstance(value, list):
        return value

    cleaned = []

    for item in value:

        if isinstance(item, dict):

            # Remove duplicate raw API response
            cleaned_item = {
                key: val
                for key, val in item.items()
                if key != "raw"
            }

            cleaned.append(cleaned_item)

        else:
            cleaned.append(item)

    return cleaned


# =====================================================
# CLEAN LANGUAGE DATA
# =====================================================

def clean_language(record, language):

    cleaned = {
        "language": language
    }

    for output_field, input_field in FIELD_MAPPING.items():

        source_key = f"{input_field}_{language}"

        if source_key not in record:
            continue

        value = record[source_key]

        # Clean application process
        if input_field == "application_process":
            value = clean_application_process(value)

        cleaned[output_field] = value

    return cleaned


# =====================================================
# CHECK LANGUAGE AVAILABILITY
# =====================================================

def has_language_data(language_data):

    important_fields = [
        "scheme_name",
        "brief_description",
        "detailed_description",
        "benefits",
        "eligibility"
    ]

    for field in important_fields:

        value = language_data.get(field)

        if isinstance(value, str) and value.strip():
            return True

        if isinstance(value, (list, dict)) and value:
            return True

    return False


# =====================================================
# CLEAN SOURCE METADATA
# =====================================================

def clean_source_metadata(record):

    metadata = record.get("source_scheme_metadata", {})

    if not isinstance(metadata, dict):
        metadata = {}

    keep_fields = [
        "source",
        "source_id_en",
        "source_id_hi",
        "scheme_for_en",
        "scheme_for_hi",
        "available_in_english",
        "available_in_hindi",
        "language_match"
    ]

    cleaned = {}

    for field in keep_fields:

        if field in metadata:
            cleaned[field] = metadata[field]

    return cleaned


# =====================================================
# CLEAN COMPLETE DATASET
# =====================================================

def clean_dataset(data):

    if not isinstance(data, list):

        raise ValueError(
            "Expected JSON list but received another format."
        )

    total = len(data)

    cleaned_schemes = {}

    stats = {
        "both_languages": 0,
        "english_only": 0,
        "hindi_only": 0,
        "no_language": 0,
        "skipped": 0
    }

    print(f"\nTotal schemes found: {total}\n")

    for index, record in enumerate(data, start=1):

        if not isinstance(record, dict):

            stats["skipped"] += 1
            continue

        slug = record.get("slug")

        if not slug:

            stats["skipped"] += 1
            continue

        slug = str(slug)

        # Build English and Hindi objects
        en_data = clean_language(record, "en")
        hi_data = clean_language(record, "hi")

        has_en = has_language_data(en_data)
        has_hi = has_language_data(hi_data)

        # Language statistics
        if has_en and has_hi:
            stats["both_languages"] += 1

        elif has_en:
            stats["english_only"] += 1

        elif has_hi:
            stats["hindi_only"] += 1

        else:
            stats["no_language"] += 1

        # Final scheme structure
        cleaned_record = {
            "slug": slug
        }

        if has_en:
            cleaned_record["en"] = en_data

        if has_hi:
            cleaned_record["hi"] = hi_data

        # Preserve source metadata
        metadata = clean_source_metadata(record)

        if metadata:
            cleaned_record["source_scheme"] = metadata

        # Preserve original source page
        if record.get("source_page"):
            cleaned_record["source_page"] = record["source_page"]

        # Preserve official URL fields
        url_fields = [
            "guidelines_url",
            "application_url",
            "official_website_url"
        ]

        urls = {}

        for field in url_fields:

            value = record.get(field)

            if value:
                urls[field] = value

        if urls:
            cleaned_record["official_links"] = urls

        # Preserve extracted URL candidates and verification status
        if record.get("all_urls"):
            cleaned_record["references"] = record["all_urls"]

        # Preserve extraction language status for auditing
        if record.get("language_status"):
            cleaned_record["language_status"] = record["language_status"]

        # Duplicate slug protection
        if slug in cleaned_schemes:

            slug = f"{slug}_{index}"
            cleaned_record["slug"] = slug

        cleaned_schemes[slug] = cleaned_record

        # Progress
        if index % 100 == 0 or index == total:

            print(
                f"Processed: {index}/{total} | "
                f"Saved: {len(cleaned_schemes)} | "
                f"Both: {stats['both_languages']} | "
                f"EN only: {stats['english_only']} | "
                f"HI only: {stats['hindi_only']} | "
                f"Missing: {stats['no_language']}"
            )

    return {
        "schemes": cleaned_schemes
    }, stats


# =====================================================
# MAIN
# =====================================================

def main():

    print("=" * 55)
    print("       YOJNAMITRA DATA CLEANING")
    print("=" * 55)

    if not INPUT_FILE.exists():

        print("\nERROR: Input file not found!")
        print(INPUT_FILE)
        return

    original_size = INPUT_FILE.stat().st_size

    print("\nLoading original JSON...")

    try:

        with open(INPUT_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

    except json.JSONDecodeError as error:

        print("\nInvalid JSON:", error)
        return

    if not isinstance(data, list):

        print("\nERROR: Expected a JSON list.")
        return

    print("JSON loaded successfully.")

    print("\nStarting cleaning process...")

    try:

        cleaned_data, stats = clean_dataset(data)

    except Exception as error:

        print("\nCleaning failed:", error)
        return

    total_saved = len(cleaned_data["schemes"])

    # =================================================
    # SAFETY CHECKS
    # =================================================

    if total_saved == 0:

        print("\nERROR: No schemes were saved.")
        return

    if stats["no_language"] == total_saved:

        print("\nERROR: No usable language data found.")
        print("Output file NOT generated.")
        return

    if total_saved != len(data):

        print("\nWARNING: Saved scheme count does not match input.")
        print("Please inspect skipped records before importing.")

    # =================================================
    # SAVE CLEANED FILE
    # =================================================

    print("\nSaving cleaned JSON...")

    try:

        with open(TEMP_FILE, "w", encoding="utf-8") as file:

            json.dump(
                cleaned_data,
                file,
                ensure_ascii=False,
                separators=(",", ":")
            )

        # Verify generated JSON
        with open(TEMP_FILE, "r", encoding="utf-8") as file:

            json.load(file)

        os.replace(TEMP_FILE, OUTPUT_FILE)

    except Exception as error:

        print("\nSaving failed:", error)

        if TEMP_FILE.exists():
            TEMP_FILE.unlink()

        return

    # =================================================
    # FINAL REPORT
    # =================================================

    cleaned_size = OUTPUT_FILE.stat().st_size

    reduction = (
        (1 - cleaned_size / original_size) * 100
        if original_size
        else 0
    )

    print("\n")
    print("=" * 55)
    print("             CLEANING REPORT")
    print("=" * 55)

    print(f"\nTotal schemes       : {len(data)}")
    print(f"Total saved         : {total_saved}")

    print(f"\nEnglish + Hindi     : {stats['both_languages']}")
    print(f"English only        : {stats['english_only']}")
    print(f"Hindi only          : {stats['hindi_only']}")
    print(f"No language data    : {stats['no_language']}")

    print(f"Skipped records     : {stats['skipped']}")

    print("\n--------------- FILE SIZE ----------------")

    print(
        f"Original size : {original_size / (1024 * 1024):.2f} MB"
    )

    print(
        f"Cleaned size  : {cleaned_size / (1024 * 1024):.2f} MB"
    )

    print(
        f"Size reduction: {reduction:.2f}%"
    )

    print("\n--------------- OUTPUT ------------------")

    print(f"File: {OUTPUT_FILE}")

    print("\nCleaning completed successfully!")

    print("=" * 55)


if __name__ == "__main__":
    main()
