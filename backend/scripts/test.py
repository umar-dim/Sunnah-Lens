import json

with open("data/collections-json/bukhari.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# print(type(data))
# print(data.keys() if isinstance(data, dict) else len(data))
print(json.dumps(data, indent=2, ensure_ascii=False)[:5000])
