import json
from pathlib import Path

FILE = Path("data/schemes_detailed_combined_All_schemes.json")

with open(FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

print("ROOT TYPE:", type(data).__name__)

if isinstance(data, list):

    print("\nTOTAL RECORDS:", len(data))

    print("\nFIRST RECORD:")
    print(json.dumps(
        data[0],
        ensure_ascii=False,
        indent=2
    )[:10000])

elif isinstance(data, dict):

    print("\nROOT KEYS:", list(data.keys()))

    if "schemes" in data:
        schemes = data["schemes"]

        print("\nSCHEMES TYPE:", type(schemes).__name__)

        if isinstance(schemes, dict):
            first_key = next(iter(schemes))
            print("\nFIRST SCHEME KEY:", first_key)
            print(json.dumps(
                schemes[first_key],
                ensure_ascii=False,
                indent=2
            )[:10000])

        elif isinstance(schemes, list):
            print("\nFIRST SCHEME:")
            print(json.dumps(
                schemes[0],
                ensure_ascii=False,
                indent=2
            )[:10000])