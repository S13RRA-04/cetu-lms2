"""Render the Drop 6 (RestonIT office + Alex Reston residence search) digital
evidence set into one flat PDF per source file, ready for R2 upload.

Source: Digital Evidence.zip -> Digital Evidence/RestonIT/{Reston,Smith}/**
        and Digital Evidence/House 2/**  (CyberDyne/* is excluded -- that
        belongs to Drop 4, not Drop 6).

Each source file becomes exactly one PDF, named with its subfolder path
flattened into the filename (e.g. "Client Files - Bayfield Dental Group -
01_client_profile.pdf") so it fits the r2CaseFile.js key convention of
scenarios/<scenario>/Drop <N>/<one folder>/<file>.pdf while preserving
context that would otherwise be lost by flattening.

Already-PDF sources are copied through unchanged (not re-rendered).
"""
from pathlib import Path
import csv
import io
import re
import shutil
import fitz

SOURCE_ROOT = Path(r"C:\Users\CETUAD~2\AppData\Local\Temp\de_extract\Digital Evidence")
OUTPUT_ROOT = Path(r"C:\Users\CETUAdmin1\Documents\Projects\PROFESSIONAL\PACT v5\Drops\6 - SWs\PDFs")

# top-level source subtree -> flat R2 "source folder" bucket
ROOTS = [
    (SOURCE_ROOT / "RestonIT" / "Reston", "RestonIT Office - Reston"),
    (SOURCE_ROOT / "RestonIT" / "Smith",  "RestonIT Office - Sam Smith"),
    (SOURCE_ROOT / "House 2",             "Alex Reston Residence"),
]

PAGE_WIDTH, PAGE_HEIGHT = fitz.paper_size("letter")
MARGIN = 48


def sanitize_component(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


def flat_title(relative_parts: list[str]) -> str:
    # relative_parts includes the filename itself as the last element
    stem = Path(relative_parts[-1]).stem
    parts = [sanitize_component(p) for p in relative_parts[:-1]] + [sanitize_component(stem)]
    return " - ".join(parts)


def csv_to_text(raw: bytes) -> str:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return ""
    widths = [max(len(row[i]) if i < len(row) else 0 for row in rows) for i in range(max(len(r) for r in rows))]
    lines = []
    for row in rows:
        cells = [row[i].ljust(widths[i]) if i < len(row) else "".ljust(widths[i]) for i in range(len(widths))]
        lines.append("  ".join(cells).rstrip())
    return "\n".join(lines)


def html_to_text(raw: bytes) -> str:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", "", text)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|tr|li|h[1-6])>", "\n", text)
    text = re.sub(r"(?s)<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'")
    lines = [line.rstrip() for line in text.splitlines()]
    # collapse runs of blank lines
    out = []
    blank = False
    for line in lines:
        if line.strip() == "":
            if not blank:
                out.append("")
            blank = True
        else:
            out.append(line)
            blank = False
    return "\n".join(out).strip()


def plain_text(path: Path) -> str:
    raw = path.read_bytes()
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return csv_to_text(raw)
    if suffix == ".html":
        return html_to_text(raw)
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1")


def render_text_pdf(title: str, source_path: Path, body: str, out_path: Path):
    doc = fitz.open()
    page = None
    y = 0

    def new_page():
        nonlocal page, y
        page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
        page.insert_text((MARGIN, 28), title[:120], fontsize=8, fontname="cour", color=(0.25, 0.35, 0.45))
        page.insert_text((MARGIN, 40), f"Source: {source_path.name}", fontsize=7, fontname="cour", color=(0.45, 0.45, 0.45))
        page.insert_text((PAGE_WIDTH - 90, PAGE_HEIGHT - 22), f"Page {len(doc)}", fontsize=7, fontname="cour", color=(0.35, 0.35, 0.35))
        y = 58

    new_page()
    lines = body.splitlines() or [""]
    fontsize = 8.5
    lineheight = 11
    max_chars = 100
    for raw_line in lines:
        wrapped = [raw_line[i:i + max_chars] for i in range(0, len(raw_line), max_chars)] or [""]
        for line in wrapped:
            if y + lineheight > PAGE_HEIGHT - MARGIN:
                new_page()
            page.insert_text((MARGIN, y), line, fontsize=fontsize, fontname="cour", color=(0.05, 0.05, 0.05))
            y += lineheight

    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(out_path, garbage=4, deflate=True)
    doc.close()


def main():
    total = 0
    by_bucket = {}
    for root, bucket in ROOTS:
        if not root.exists():
            print(f"WARNING: missing source root {root}")
            continue
        for path in sorted(root.rglob("*")):
            if path.is_dir():
                continue
            rel = path.relative_to(root)
            rel_parts = list(rel.parts)
            title = flat_title(rel_parts)
            out_name = title + ".pdf"
            out_path = OUTPUT_ROOT / bucket / out_name

            if path.suffix.lower() == ".pdf":
                out_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(path, out_path)
            else:
                body = plain_text(path)
                render_text_pdf(title, path, body, out_path)

            total += 1
            by_bucket[bucket] = by_bucket.get(bucket, 0) + 1

    print(f"Rendered {total} files into {OUTPUT_ROOT}")
    for bucket, count in by_bucket.items():
        print(f"  {bucket}: {count}")


if __name__ == "__main__":
    main()
