"""Smoke check for /api/chat against a running API.

    .venv/bin/python scripts/smoke_chat.py [base_url]   # default http://localhost:8000

Validation checks are free. If chat is configured, costs 2 embedding + 3 LLM calls.
"""
import json
import re
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"


def chat(messages, **filters):
    """POST /api/chat → (status, [(event, data), ...])."""
    req = urllib.request.Request(
        BASE + "/api/chat",
        data=json.dumps({"messages": messages, **filters}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            assert res.headers["Content-Type"].startswith("text/event-stream")
            raw = res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, []
    events = []
    for block in raw.strip().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in block.splitlines())
        events.append((fields["event"], json.loads(fields["data"])))
    return 200, events


def user(text):
    return {"role": "user", "content": text}


# Validation runs before anything costs money.
assert chat([])[0] == 422
assert chat([{"role": "assistant", "content": "hi"}])[0] == 422
assert chat([user("x" * 2001)])[0] == 422
assert chat([user("q")] * 11)[0] == 422

status, events = chat([user("What did the Prophet say about anger?")])
if status == 503:
    print("skip live checks: chat not configured (set CHAT_* in backend/.env)")
    sys.exit(0)
assert status == 200, status
names = [e for e, _ in events]
assert names[0] == "sources" and names[-1] == "done", events[-1]
assert names.count("delta") >= 1, names
sources = events[0][1]["results"]
assert 0 < len(sources) <= 8
answer = "".join(d["text"] for e, d in events if e == "delta")
cited = [int(n) for n in re.findall(r"\[(\d+)\]", answer)]
assert cited and all(1 <= n <= len(sources) for n in cited), answer
print("answer:", answer[:300], "…")

# Follow-up turn + filter: sources come only from the chosen collection.
status, events = chat(
    [user("What did the Prophet say about anger?"),
     {"role": "assistant", "content": answer},
     user("What about patience?")],
    collection_ids=["muslim"],
)
assert status == 200 and events[-1][0] == "done", events[-1:]
assert {h["collection_id"] for h in events[0][1]["results"]} == {"muslim"}

# Off-corpus: should decline rather than answer.
_, events = chat([user("What is the capital of France?")])
off = "".join(d["text"] for e, d in events if e == "delta")
print("off-corpus:", off[:200])
assert "paris" not in off.lower(), off
if off.strip() != "NOT_COVERED":
    print("note: model did not use the NOT_COVERED reply; the page falls back to plain text")

print("smoke ok")
