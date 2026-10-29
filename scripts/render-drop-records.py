"""Markdown -> PDF renderer for PACT drop *records* (entity returns, agency
query results, certificates, ECs), styled to match the ReportLab-generated
Packet 4 documents (e.g. coinbridge_kyc_return.pdf): coloured title over a
rule, two-column field/value tables, grid tables for anything wider.

render-drop-markdown.py flattens every table row into "Field: x / Value: y"
blocks, which reads nothing like a records return; use this one for
record-style documents and that one for prose packets.

A line that is exactly a classification banner (e.g. UNCLASSIFIED//FOUO//PACT)
is lifted out of the body and stamped at the top and bottom of every page.

Usage: python render-drop-records.py <source_dir> <output_dir>
"""
import html
import re
import sys
from pathlib import Path

import fitz

BANNER_RE = re.compile(r"^[A-Z]+(//[A-Z]+)+$")
ACCENT = "#1f5f6b"

CSS = f"""
* {{ font-family: sans-serif; }}
body {{ font-size: 9.5pt; color: #141414; }}
h1 {{ font-size: 15pt; color: {ACCENT}; margin: 0 0 2pt 0; }}
h2 {{ font-size: 10.5pt; color: #111; margin: 10pt 0 3pt 0; }}
p.rule {{ border-bottom: 1.5px solid {ACCENT}; margin: 0 0 8pt 0; font-size: 2pt; }}
p {{ margin: 3pt 0; line-height: 1.3; }}
ul {{ margin: 2pt 0 4pt 14pt; }}
li {{ margin: 1.5pt 0; line-height: 1.3; }}
table {{ border-collapse: collapse; width: 100%; margin: 2pt 0 6pt 0; }}
td, th {{ padding: 3pt 5pt; vertical-align: top; font-size: 9pt; }}
table.kv td {{ border-bottom: 0.5px solid #d9dde0; }}
table.kv td.k {{ font-weight: bold; font-size: 8pt; color: #333; }}
table.grid th {{ background-color: #e8eef0; text-align: left; font-size: 8pt; border: 0.5px solid #c3ccd0; }}
table.grid td {{ border: 0.5px solid #c3ccd0; }}
"""


def inline(text: str) -> str:
    text = html.escape(text).replace("`", "")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return re.sub(r"^_(.+)_$", r"<i>\1</i>", text)


def split_row(line: str):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def to_html(markdown: str):
    banner = None
    out = []
    lines = markdown.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if BANNER_RE.match(line.strip("`")):
            banner = line.strip("`")
            i += 1
            continue
        if line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                items.append(f"<li>{inline(lines[i].strip()[2:])}</li>")
                i += 1
            out.append(f"<ul>{''.join(items)}</ul>")
            continue
        if line.startswith("|") and i + 1 < len(lines) and lines[i + 1].lstrip().startswith("|---"):
            headers = split_row(line)
            rows = []
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(split_row(lines[i]))
                i += 1
            if [h.lower() for h in headers] == ["field", "value"]:
                # Story ignores percentage widths in CSS; an explicit column width is what holds.
                body = "".join(f'<tr><td class="k" width="150">{inline(r[0])}</td><td>{inline(r[1])}</td></tr>' for r in rows)
                out.append(f'<table class="kv">{body}</table>')
            else:
                head = "".join(f"<th>{inline(h)}</th>" for h in headers)
                body = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
                out.append(f'<table class="grid"><tr>{head}</tr>{body}</table>')
            continue
        heading = re.match(r"^(#{1,3})\s+(.*)$", line)
        if heading:
            level = len(heading.group(1))
            if level == 1:
                out.append(f"<h1>{inline(heading.group(2))}</h1><p class='rule'>&#160;</p>")
            else:
                out.append(f"<h2>{inline(heading.group(2))}</h2>")
        else:
            out.append(f"<p>{inline(line)}</p>")
        i += 1
    return banner, "".join(out)


def render_file(source: Path, output: Path):
    banner, body = to_html(source.read_text(encoding="utf-8"))
    story = fitz.Story(html=f"<body>{body}</body>", user_css=CSS)
    width, height = fitz.paper_size("letter")
    content = fitz.Rect(54, 60, width - 54, height - 60)
    output.parent.mkdir(parents=True, exist_ok=True)
    writer = fitz.DocumentWriter(str(output))
    more = True
    while more:
        device = writer.begin_page(fitz.Rect(0, 0, width, height))
        more, _ = story.place(content)
        story.draw(device)
        writer.end_page()
    writer.close()

    # Stamp the banner and page numbers after layout, so they sit outside the story.
    doc = fitz.open(output)
    for number, page in enumerate(doc, start=1):
        if banner:
            x = (width - fitz.get_text_length(banner, fontname="hebo", fontsize=8)) / 2
            for y in (36, height - 30):
                page.insert_text((x, y), banner, fontsize=8, fontname="hebo", color=(0.15, 0.15, 0.15))
        page.insert_text((width - 80, height - 16), f"Page {number} of {len(doc)}", fontsize=7, color=(0.4, 0.4, 0.4))
    doc.saveIncr()
    doc.close()


def main():
    source_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    count = 0
    for path in sorted(source_dir.glob("*.md")):
        out_path = output_dir / (path.stem + ".pdf")
        render_file(path, out_path)
        count += 1
        print(f"Rendered {path.name} -> {out_path}")
    print(f"Total: {count}")


if __name__ == "__main__":
    main()
