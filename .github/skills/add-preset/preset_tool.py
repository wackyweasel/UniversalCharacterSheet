#!/usr/bin/env python3
"""Helper for the add-preset skill.

Commands:
  parse   <input>                      Show the fields found in a pasted preset line.
  strings <input>                      List unique translatable strings (for translating).
  add     <input> [options]            Write preset file(s) and update index.json.

Input format (tab separated): name, author, description, JSON payload, (ignored trailing data).
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
GALLERY = ROOT / "public" / "community-gallery"
INDEX = GALLERY / "index.json"
PRESETS = GALLERY / "presets"

# Keys whose string values are identifiers/enums/styles, never user-visible text.
SKIP_KEY = re.compile(
    r"^(id|type|groupId|attachedTo|requires|theme|gameSystem|reserved|templateId|unit|style|"
    r"fillColor|activeSheetId|.*(Id|Ids|Color|Style|Layout|Alignment|Rule|Orientation|Mode|Unit|"
    r"Font|Icon|Shape|Position|Size|Border))$"
)
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
HEX_COLOR = re.compile(r"^#[0-9a-f]{3,8}$", re.I)


def read_text(path):
    return Path(path).read_text(encoding="utf-8-sig")


def parse_input(path):
    parts = read_text(path).strip("\r\n").split("\t")
    if len(parts) < 4:
        sys.exit("Expected at least 4 tab-separated fields: name, author, description, JSON.")
    name, author, description = (p.strip() for p in parts[:3])
    payload, _ = json.JSONDecoder().raw_decode("\t".join(parts[3:]).lstrip())
    return {
        "name": name,
        "author": "@" + author.lstrip("@").strip(),
        "description": description,
        "payload": payload,
        "gameSystem": payload.get("gameSystem", ""),
    }


def walk(node, pointer="", key=None):
    """Yield (pointer, key, value) for each translatable string leaf."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield from walk(v, f"{pointer}/{k.replace('~', '~0').replace('/', '~1')}", k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk(v, f"{pointer}/{i}", key)
    elif isinstance(node, str):
        if (
            key
            and not SKIP_KEY.match(key)
            and any(c.isalpha() for c in node)
            and not UUID.match(node)
            and not HEX_COLOR.match(node)
        ):
            yield pointer, key, node


def set_pointer(root, pointer, value):
    parts = [p.replace("~1", "/").replace("~0", "~") for p in pointer.split("/")[1:]]
    node = root
    for p in parts[:-1]:
        node = node[int(p)] if isinstance(node, list) else node[p]
    last = parts[-1]
    if isinstance(node, list):
        node[int(last)] = value
    else:
        node[last] = value


def slugify(name):
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", ascii_name.lower()).strip("_")


def dump_min(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def cmd_parse(args):
    p = parse_input(args.input)
    print(json.dumps({k: v for k, v in p.items() if k != "payload"}, ensure_ascii=False, indent=2))
    print(f"payload keys: {list(p['payload'].keys())}")


def cmd_strings(args):
    p = parse_input(args.input)
    seen = {}
    for _, key, value in walk(p["payload"]):
        entry = seen.setdefault(value, {"key": key, "count": 0})
        entry["count"] += 1
    print(json.dumps([{"value": v, **meta} for v, meta in seen.items()], ensure_ascii=False, indent=1))


def write_preset(stem, name, author, description, game_system, payload, force):
    target = PRESETS / f"{stem}.json"
    if target.exists() and not force:
        sys.exit(f"{target} already exists (use --force to overwrite).")
    payload = dict(payload)
    payload["name"] = name
    target.write_bytes(dump_min(payload).encode("utf-8"))
    return {
        "name": name,
        "author": author,
        "description": description,
        "file": f"presets/{stem}.json",
        "gameSystem": game_system,
    }


def append_index(entries):
    text = INDEX.read_bytes().decode("utf-8")
    eol = "\r\n" if "\r\n" in text else "\n"
    existing = json.loads(text)["presets"]
    listed = {e["name"] for e in existing} | {e["file"] for e in existing}
    marker = re.search(r"\r?\n  \],\r?\n  \"themes\"", text)
    if not marker:
        sys.exit("Could not locate the end of the presets array in index.json.")
    nid = max(int(e["id"]) for e in existing) + 1
    blocks = []
    for e in entries:
        if e["name"] in listed or e["file"] in listed:
            print(f"warning: '{e['name']}' / {e['file']} already listed in index.json; skipping index entry")
            continue
        body = json.dumps({"id": str(nid), **e}, ensure_ascii=False, indent=2)
        blocks.append("    " + body.replace("\n", eol + "    "))
        nid += 1
    if not blocks:
        return
    text = text[: marker.start()] + "," + eol + ("," + eol).join(blocks) + text[marker.start():]
    json.loads(text)
    INDEX.write_bytes(text.encode("utf-8"))


def cmd_add(args):
    p = parse_input(args.input)
    stem = slugify(p["name"])
    entries = []
    if not args.translations:
        entries.append(write_preset(stem, p["name"], p["author"], p["description"],
                                    p["gameSystem"], p["payload"], args.force))
    else:
        if not args.language:
            sys.exit("--language is required with --translations.")
        tr = json.loads(read_text(args.translations))
        values = tr.get("values", {})
        english = json.loads(json.dumps(p["payload"]))
        changed = 0
        for pointer, _, value in list(walk(english)):
            if value in values:
                set_pointer(english, pointer, values[value])
                changed += 1
        missing = sorted({v for _, _, v in walk(p["payload"]) if v not in values})
        print(f"translated {changed} string(s); {len(missing)} unique string(s) left untranslated")
        for m in missing[:50]:
            print("  untranslated:", m[:100])
        entries.append(write_preset(stem, p["name"], p["author"],
                                    tr.get("description") or p["description"],
                                    p["gameSystem"], english, args.force))
        entries.append(write_preset(f"{stem}_{slugify(args.language)}", f"{p['name']} ({args.language})",
                                    p["author"], p["description"], p["gameSystem"], p["payload"], args.force))
    append_index(entries)
    for e in entries:
        print("added:", e["name"], "->", e["file"])


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("parse", "strings", "add"):
        sp = sub.add_parser(name)
        sp.add_argument("input")
        if name == "add":
            sp.add_argument("--translations", help='JSON file: {"description": "...", "values": {original: english}}')
            sp.add_argument("--language", help="English name of the original language, e.g. French")
            sp.add_argument("--force", action="store_true")
    args = ap.parse_args()
    {"parse": cmd_parse, "strings": cmd_strings, "add": cmd_add}[args.cmd](args)


if __name__ == "__main__":
    main()
