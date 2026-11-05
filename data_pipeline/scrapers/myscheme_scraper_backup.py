import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

BASE_URL = "https://www.myscheme.gov.in/"

HEADERS = {
"User-Agent": "YojnaMitraResearchBot/1.0 (educational project)"
}

def is_internal_url(url: str) -> bool:
    """Check whether a URL belongs to the official myScheme domain."""
    parsed_url = urlparse(url)


    return (
        parsed_url.scheme in ("http", "https")
        and parsed_url.netloc.lower() == "www.myscheme.gov.in"
    )


def fetch_page(url: str) -> dict:
    """Fetch a webpage and extract its title, visible text, and internal links."""


    print(f"\nFetching: {url}")

    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=30,
        )

        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove non-visible and unnecessary elements.
        for element in soup(
            ["script", "style", "noscript", "svg", "template"]
        ):
            element.decompose()

        # Extract page title.
        title = (
            soup.title.get_text(" ", strip=True)
            if soup.title
            else ""
        )

        # Extract visible text.
        text = soup.get_text(" ", strip=True)

        # Extract unique internal links.
        links = []
        seen_urls = set()

        for anchor in soup.find_all("a", href=True):
            link_text = anchor.get_text(" ", strip=True)
            link_url = urljoin(url, anchor["href"])

            # Ignore fragments and normalize trailing slashes.
            parsed_link = urlparse(link_url)
            link_url = parsed_link._replace(
                fragment=""
            ).geturl()

            if (
                link_text
                and is_internal_url(link_url)
                and link_url not in seen_urls
            ):
                seen_urls.add(link_url)

                links.append({
                    "text": link_text,
                    "url": link_url,
                })

        return {
            "url": url,
            "status_code": response.status_code,
            "title": title,
            "text": text,
            "links": links,
        }

    except requests.RequestException as error:
        print(f"Request failed: {error}")

        return {
            "url": url,
            "status_code": None,
            "title": "",
            "text": "",
            "links": [],
            "error": str(error),
        }


def main():
    """Test the official myScheme homepage and inspect relevant links."""


    print("=" * 60)
    print("YOJNAMITRA - MYSCHEME SCRAPER")
    print("=" * 60)

    result = fetch_page(BASE_URL)

    # Display response status.
    print("\nHTTP Status:", result["status_code"])
    print("Page Title:", result["title"])

    if result.get("error"):
        print("\nCould not fetch the webpage.")
        return

    # Display homepage text.
    print("\n" + "=" * 60)
    print("HOMEPAGE TEXT PREVIEW")
    print("=" * 60)

    print(result["text"][:1500])

    # Filter links that may be relevant to scheme discovery.
    print("\n" + "=" * 60)
    print("RELEVANT INTERNAL LINKS")
    print("=" * 60)

    keywords = (
        "scheme",
        "search",
        "category",
        "state",
        "ministry",
    )

    relevant_links = []

    for link in result["links"]:
        link_text = link["text"].lower()
        link_url = link["url"].lower()

        if any(
            keyword in link_text or keyword in link_url
            for keyword in keywords
        ):
            relevant_links.append(link)

    if relevant_links:
        for link in relevant_links:
            print(f"- {link['text']}: {link['url']}")
    else:
        print("No relevant links found in the homepage HTML.")

    print(f"\nTotal internal links found: {len(result['links'])}")
    print(f"Relevant links found: {len(relevant_links)}")

    print("\nScraper test completed.")


if __name__ == "__main__":
    main()
