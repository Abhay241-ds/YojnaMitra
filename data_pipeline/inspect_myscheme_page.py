import re
import requests
from html import unescape

PAGE_URL = "https://www.myscheme.gov.in/schemes/rtif"

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0"
})

response = session.get(PAGE_URL, timeout=30)
print("Page status:", response.status_code)

html = unescape(response.text)

# JavaScript files collect karo
js_files = sorted(set(re.findall(
    r'https://cdn\.myscheme\.in/[^"\']+?\.js',
    html
)))

print("JavaScript files found:", len(js_files))

keywords = [
    "api/apisetu",
    "applicationUrl",
    "officialUrl",
    "applyNow",
    "applicationUrl",
    "scheme-detail",
    "scheme-details",
    "schemeName",
]

for js_url in js_files:
    try:
        js_response = session.get(js_url, timeout=20)

        if js_response.status_code != 200:
            continue

        js = unescape(js_response.text)
        matches = []

        for keyword in keywords:
            if keyword.lower() in js.lower():
                matches.append(keyword)

        # Relevant JavaScript files hi display karo
        if matches:
            print("\nJS:", js_url)
            print("Matched keywords:", ", ".join(sorted(set(matches))))

            # API endpoint jaise strings dhoondo
            endpoints = sorted(set(re.findall(
                r'["\']([^"\']{0,200}(?:/api/|graphql)[^"\']{0,200})["\']',
                js,
                re.IGNORECASE
            )))

            for endpoint in endpoints[:10]:
                print("Possible endpoint:", endpoint)

    except requests.RequestException:
        continue

print("\nInspection completed.")
