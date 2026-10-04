"""Smoke check for search filters and directory ordering against a running API.

    python3 scripts/smoke_search.py [base_url]   # default http://localhost:8000

Costs one embedding API call per vector check (two total).
"""
import json
import re
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"


def call(path, body=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as e:
        return e.code, None


def text(**filters):
    status, data = call("/api/search/text", {"query": "prayer", "page_size": 100, **filters})
    assert status == 200, status
    return data


# A book from Nasa'i that has matches, used for book-level checks.
_, books = call("/api/collections/nasai/books")
book = max(books["books"], key=lambda b: b["hadith_count"])
book_name = book["name_en"]

everything = text()
tirmidhi = text(collection_ids=["tirmidhi"])
assert 0 < tirmidhi["total"] < everything["total"]
assert {r["collection_id"] for r in tirmidhi["results"]} == {"tirmidhi"}

one_book = text(book_ids=[book["id"]])
assert one_book["total"] > 0
assert {r["book_name"] for r in one_book["results"]} == {book_name}

mixed = text(collection_ids=["tirmidhi"], book_ids=[book["id"]])
assert mixed["total"] == tirmidhi["total"] + one_book["total"]

assert text(collection_ids=[])["total"] == 0
assert call("/api/search/text", {"query": "x", "collection_ids": ["a"] * 7})[0] == 422

# Vector: smallest collection must still fill top_k (needs iterative scan).
status, vec = call("/api/search", {"query": "patience in hardship", "top_k": 10,
                                   "collection_ids": ["muslim"]})
if status == 429:
    print("skip vector checks: embedding quota exhausted")
else:
    assert status == 200, status
    assert len(vec["results"]) == 10
    assert {r["collection_id"] for r in vec["results"]} == {"muslim"}
    _, vec_book = call("/api/search", {"query": "prayer", "top_k": 5, "book_ids": [book["id"]]})
    assert vec_book["results"] and {r["book_name"] for r in vec_book["results"]} == {book_name}

# Directory: hadith in a book come back in numeric order.
_, bukhari = call("/api/collections/bukhari/books")
book2 = next(b for b in bukhari["books"] if b["book_number"] == 2)
_, page = call(f"/api/books/{book2['id']}/hadiths?page_size=100")
nums = [int(re.match(r"\d+", h["hadith_number"]).group()) for h in page["hadiths"]]
assert nums == sorted(nums), nums
assert call(f"/api/books/{book2['id']}/hadiths?page=0")[0] == 422
assert call(f"/api/books/{book2['id']}/hadiths?page_size=1000")[0] == 422

print("smoke ok")
