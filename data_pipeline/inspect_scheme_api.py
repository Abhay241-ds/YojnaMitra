import re
import requests

BASE_URL = "https://www.myscheme.gov.in"

JS_URLS = [
    "https://cdn.myscheme.in/_next/static/chunks/0-cdhta4fo-r8.js",
    "https://cdn.myscheme.in/_next/static/chunks/23upo5qt965lg.js",
    "https://cdn.myscheme.in/_next/static/chunks/3l_cdowupsp6k.js",
]

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0"
})

for js_url in JS_URLS:
    print("\n" + "=" * 80)
    print("Inspecting:", js_url)

    try:
        response = session.get(js_url, timeout=30)
        print("Status:", response.status_code)

        if response.status_code != 200:
            continue

        content = response.text

        # applicationUrl, applyNow aur API references ke aas-paas ka code
        keywords = [
            "applicationUrl",
            "applyNow",
            "/api/apisetu/schemes",
            "/api/apisetu/search",
        ]

        for keyword in keywords:
            matches = list(re.finditer(
                re.escape(keyword),
                content,
                re.IGNORECASE
            ))

            if matches:
                print(f"\n--- {keyword}: {len(matches)} match(es) ---")

                for match in matches[:3]:
                    start = max(0, match.start() - 350)
                    end = min(len(content), match.end() + 500)

                    print(content[start:end])
                    print("\n---")

    except requests.RequestException as error:
        print("Request failed:", error)
