#!/usr/bin/env python3
"""Build the static vocabulary bundle from the licensed source lists.

The generated JavaScript is intentionally usable from ``file://`` so the
workshop starter remains a fully static, no-API application.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import unicodedata
import urllib.request
import zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET


SOURCE_URLS = {
    "ngsl_stats": "https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv",
    "nawl_stats": "https://www.newgeneralservicelist.com/s/NAWL_12_stats.csv",
    "tsl_stats": "https://www.newgeneralservicelist.com/s/TSL_12_stats.csv",
    "ngsl_definitions": "https://www.newgeneralservicelist.com/s/NGSL_12_with_English_definitions.xlsx",
    "nawl_definitions": "https://www.newgeneralservicelist.com/s/NAWL_12_with_en_definitions.csv",
    "tsl_definitions": "https://www.newgeneralservicelist.com/s/TSL_12_definitions.xlsx",
    "ecdict": "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv",
}

SOURCE_FILES = {
    "ngsl_stats": "vocab-ngsl.csv",
    "nawl_stats": "vocab-nawl.csv",
    "tsl_stats": "vocab-tsl.csv",
    "ngsl_definitions": "vocab-ngsl-definitions.xlsx",
    "nawl_definitions": "vocab-nawl-definitions.csv",
    "tsl_definitions": "vocab-tsl-definitions.xlsx",
    "ecdict": "ecdict.csv",
}

LIST_META = {
    "ngsl": {"name": "NGSL 1.2", "size": 2809},
    "nawl": {"name": "NAWL 1.2", "size": 957},
    "tsl": {"name": "TSL 1.2", "size": 1250},
}

DEFINITION_ALIASES = {
    "email": "e-mail",
    "by-law": "bylaw",
    "cafe": "café",
    "café": "cafe",
    "e-book": "ebook",
    "entree": "entrée",
    "entrée": "entree",
    "resume": "résumé",
    "résumé": "resume",
    "cheer": "cheers",
    "headquarters": "headquarter",
}

MANUAL_DEFINITIONS = {
    "by-law": "a rule made by an organization or local authority",
    "café": "a small restaurant serving drinks and light meals",
    "e-book": "a book in digital form",
    "entrée": "the main course of a meal",
    "résumé": "a short summary of a person's education and work experience",
    "smartphone": "a mobile phone with internet and computer features",
    "cheer": "to shout to show support or approval",
    "headquarters": "the main office or center of an organization",
}

MANUAL_TRANSLATIONS = {
    "résumé": "n. 履歷；個人簡歷",
}

NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def download_sources(source_dir: Path) -> None:
    source_dir.mkdir(parents=True, exist_ok=True)
    for key, url in SOURCE_URLS.items():
        destination = source_dir / SOURCE_FILES[key]
        print(f"Downloading {key} -> {destination}")
        request = urllib.request.Request(url, headers={"User-Agent": "vocabulary-trainer-builder/1.0"})
        with urllib.request.urlopen(request) as response, destination.open("wb") as target:
            target.write(response.read())


def normalize_word(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def ascii_key(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", normalize_word(value))
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def number(value: str | None) -> int | float | None:
    if value is None:
        return None
    value = str(value).strip()
    if not value or value.upper() == "#N/A":
        return None
    try:
        parsed = float(value)
    except ValueError:
        return None
    return int(parsed) if parsed.is_integer() else round(parsed, 3)


def read_csv_rows(path: Path, encoding: str = "utf-8-sig") -> list[list[str]]:
    with path.open(encoding=encoding, newline="", errors="replace") as source:
        return list(csv.reader(source))


def column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference)
    if not letters:
        return 0
    result = 0
    for char in letters.group(0):
        result = result * 26 + ord(char) - 64
    return result - 1


def read_xlsx_rows(path: Path) -> list[list[str]]:
    """Read the first XLSX worksheet with only the Python standard library."""
    with zipfile.ZipFile(path) as workbook:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
            for item in root.findall("main:si", NS):
                shared_strings.append("".join(node.text or "" for node in item.iterfind(".//main:t", NS)))

        sheet = ET.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
        rows: list[list[str]] = []
        for row in sheet.findall(".//main:sheetData/main:row", NS):
            values: list[str] = []
            for cell in row.findall("main:c", NS):
                index = column_index(cell.attrib.get("r", "A1"))
                while len(values) <= index:
                    values.append("")
                kind = cell.attrib.get("t")
                value_node = cell.find("main:v", NS)
                if kind == "inlineStr":
                    values[index] = "".join(node.text or "" for node in cell.iterfind(".//main:t", NS))
                elif value_node is not None:
                    raw = value_node.text or ""
                    values[index] = shared_strings[int(raw)] if kind == "s" else raw
            rows.append(values)
        return rows


def source_record(list_name: str, row: list[str]) -> dict[str, int | float | None]:
    if list_name == "nawl":
        return {"rank": int(row[1]), "band": number(row[2]), "sfi": number(row[3]), "fpm": number(row[4])}
    return {"rank": int(row[1]), "sfi": number(row[2]), "fpm": number(row[3])}


def read_source_lists(source_dir: Path) -> dict[str, dict]:
    entries: dict[str, dict] = {}
    specs = (
        ("ngsl", SOURCE_FILES["ngsl_stats"], "utf-8-sig"),
        ("nawl", SOURCE_FILES["nawl_stats"], "utf-8-sig"),
        ("tsl", SOURCE_FILES["tsl_stats"], "cp1252"),
    )
    for list_name, filename, encoding in specs:
        rows = read_csv_rows(source_dir / filename, encoding)
        for row in rows[1:]:
            if len(row) < 4 or not row[0].strip():
                continue
            word = row[0].strip()
            key = normalize_word(word)
            entry = entries.setdefault(key, {"word": word, "sources": {}})
            if any(char in word for char in "éÉ"):
                entry["word"] = word
            entry["sources"][list_name] = source_record(list_name, row)
    return entries


def read_definition_map(source_dir: Path) -> dict[str, dict[str, str]]:
    maps: dict[str, dict[str, str]] = {"ngsl": {}, "nawl": {}, "tsl": {}}

    for row in read_xlsx_rows(source_dir / SOURCE_FILES["ngsl_definitions"])[1:]:
        if len(row) >= 2 and row[0].strip():
            maps["ngsl"][normalize_word(row[0])] = row[1].strip()

    nawl_rows = read_csv_rows(source_dir / SOURCE_FILES["nawl_definitions"])
    for row in nawl_rows[1:]:
        if len(row) >= 2 and row[0].strip():
            maps["nawl"][normalize_word(row[0])] = row[1].strip()

    for row in read_xlsx_rows(source_dir / SOURCE_FILES["tsl_definitions"])[1:]:
        if len(row) >= 2 and row[0].strip():
            maps["tsl"][normalize_word(row[0])] = row[1].strip()
    return maps


def lookup_definition(word: str, sources: dict, definition_maps: dict[str, dict[str, str]]) -> str:
    key = normalize_word(word)
    if key in MANUAL_DEFINITIONS:
        return MANUAL_DEFINITIONS[key]
    candidates = (key, DEFINITION_ALIASES.get(key, ""), ascii_key(key))
    for list_name in ("nawl", "tsl", "ngsl"):
        if list_name not in sources:
            continue
        for candidate in candidates:
            if candidate and definition_maps[list_name].get(candidate):
                return definition_maps[list_name][candidate]
    return ""


def load_ecdict(source_dir: Path, wanted: set[str]) -> dict[str, dict[str, str]]:
    results: dict[str, dict[str, str]] = {}
    ascii_targets = {ascii_key(word): word for word in wanted}
    with (source_dir / SOURCE_FILES["ecdict"]).open(encoding="utf-8", newline="", errors="replace") as source:
        for row in csv.DictReader(source):
            key = normalize_word(row.get("word", ""))
            target = key if key in wanted else ascii_targets.get(key)
            if target and target not in results:
                results[target] = row
    for word in wanted:
        fallback = results.get(ascii_key(word))
        if word not in results and fallback:
            results[word] = fallback
    return results


def traditional_chinese(value: str) -> str:
    try:
        from opencc import OpenCC
    except ImportError as exc:
        raise RuntimeError(
            "Taiwan Traditional Chinese output requires opencc-python-reimplemented. "
            "Install scripts/requirements.txt before rebuilding the vocabulary data."
        ) from exc
    if not hasattr(traditional_chinese, "converter"):
        traditional_chinese.converter = OpenCC("s2twp")  # type: ignore[attr-defined]
    return traditional_chinese.converter.convert(value)  # type: ignore[attr-defined]


def clean_translation(value: str) -> str:
    lines = []
    normalized = value.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\r", "\n")
    for line in normalized.splitlines():
        line = re.sub(r"\s+", " ", line).strip()
        if not line or re.match(r"^\[(網路|網絡|網路短語)\]", traditional_chinese(line)):
            continue
        lines.append(traditional_chinese(line))
        if len(lines) == 4:
            break
    return "\n".join(lines)[:420]


def build(source_dir: Path) -> dict:
    entries = read_source_lists(source_dir)
    definitions = read_definition_map(source_dir)
    dictionary = load_ecdict(source_dir, set(entries))

    output_entries = []
    for key, entry in entries.items():
        ecdict = dictionary.get(key, {})
        english_definition = lookup_definition(entry["word"], entry["sources"], definitions)
        if not english_definition:
            english_definition = (ecdict.get("definition") or "").replace("\\n", " ").strip()
        translation = MANUAL_TRANSLATIONS.get(key) or clean_translation(ecdict.get("translation") or "")
        exams = []
        if "ngsl" in entry["sources"] or "nawl" in entry["sources"]:
            exams.extend(["ielts", "toefl"])
        if "ngsl" in entry["sources"] or "tsl" in entry["sources"]:
            exams.append("toeic")
        output_entries.append(
            {
                "id": key,
                "word": entry["word"],
                "phonetic": (ecdict.get("phonetic") or "").strip(),
                "zhTW": translation,
                "definition": english_definition,
                "pos": (ecdict.get("pos") or "").strip(),
                "exams": exams,
                "sources": entry["sources"],
            }
        )

    output_entries.sort(key=lambda item: item["word"].casefold())
    return {
        "metadata": {
            "version": "1.0.0",
            "builtAt": date.today().isoformat(),
            "recordCount": len(output_entries),
            "sourceRecordCount": sum(meta["size"] for meta in LIST_META.values()),
            "lists": LIST_META,
            "license": "Vocabulary lists: CC BY-SA 4.0; ECDICT: MIT",
        },
        "entries": output_entries,
    }


def write_bundle(bundle: dict, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"))
    header = (
        "/* Generated vocabulary data. NGSL/NAWL/TSL: CC BY-SA 4.0; "
        "ECDICT: MIT. See data/LICENSES.md. */\n"
    )
    destination.write_text(f"{header}window.VOCABULARY_DATA={payload};\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=Path("/private/tmp"))
    parser.add_argument("--output", type=Path, default=Path("data/vocabulary-data.js"))
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()

    if args.download:
        download_sources(args.source_dir)

    bundle = build(args.source_dir)
    write_bundle(bundle, args.output)
    missing_zh = sum(not item["zhTW"] for item in bundle["entries"])
    missing_definition = sum(not item["definition"] for item in bundle["entries"])
    print(
        f"Wrote {len(bundle['entries'])} unique words to {args.output}; "
        f"missing zh-TW: {missing_zh}; missing English definition: {missing_definition}"
    )


if __name__ == "__main__":
    main()
