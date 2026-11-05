import json
import os

INPUT_FILE = "data/schemes_cleaned.json"
OUTPUT_FILE = "data/schemes_bilingual.json"


def has_data(value):
    """Check whether language data contains meaningful content."""

    if value is None:
        return False

    if isinstance(value, str):
        return bool(value.strip())

    if isinstance(value, (list, dict)):
        return any(has_data(v) for v in value.values()) if isinstance(value, dict) else any(
            has_data(v) for v in value
        )

    return bool(value)


def main():

    print("\nLoading cleaned schemes...")

    if not os.path.exists(INPUT_FILE):
        print(f"File not found: {INPUT_FILE}")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    schemes = data.get("schemes", {})

    print("Original schemes:", len(schemes))

    bilingual = {}
    english_only = 0
    hindi_only = 0
    neither = 0

    for slug, scheme in schemes.items():

        en_data = scheme.get("en")
        hi_data = scheme.get("hi")

        has_en = has_data(en_data)
        has_hi = has_data(hi_data)

        if has_en and has_hi:
            bilingual[slug] = scheme

        elif has_en:
            english_only += 1

        elif has_hi:
            hindi_only += 1

        else:
            neither += 1

    # Save in a separate file
    output_data = {
        "total_schemes": len(bilingual),
        "languages": ["en", "hi"],
        "schemes": bilingual
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(
            output_data,
            f,
            ensure_ascii=False,
            separators=(",", ":")
        )

    file_size = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)

    print("\n========== FILTER REPORT ==========")
    print("Original schemes:       ", len(schemes))
    print("Bilingual schemes kept: ", len(bilingual))
    print("English only removed:  ", english_only)
    print("Hindi only removed:    ", hindi_only)
    print("Neither removed:       ", neither)
    print("-----------------------------------")
    print("Final schemes:          ", len(bilingual))
    print(f"Output size:             {file_size:.2f} MB")
    print("Saved to:", OUTPUT_FILE)
    print("\nFiltering completed successfully!")


if __name__ == "__main__":
    main()