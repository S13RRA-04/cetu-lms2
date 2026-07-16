"""Generic markdown -> PDF renderer for PACT drop packets (tables, headings,
body text). Generalizes the single-file logic from render-packet-heist-master.py
so it can render an entire folder of source .md documents in one pass.

Usage: python render-drop-markdown.py <source_dir> <output_dir> [doc-code-prefix]
"""
import re
import sys
from pathlib import Path
import fitz


def plain(text: str) -> str:
    return (text.replace("**", "").replace("`", "").replace("—", "-")
            .replace("–", "-").replace("−", "-").replace("→", "->"))


def blocks(markdown: str):
    lines = markdown.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            yield ("space", "")
            index += 1
            continue
        if line.startswith("|") and index + 1 < len(lines) and lines[index + 1].lstrip().startswith("|---"):
            headers = [plain(cell.strip()) for cell in line.strip("|").split("|")]
            index += 2
            while index < len(lines) and lines[index].strip().startswith("|"):
                values = [plain(cell.strip()) for cell in lines[index].strip().strip("|").split("|")]
                yield ("table", "\n".join(f"{key}: {value}" for key, value in zip(headers, values)))
                index += 1
            continue
        match = re.match(r"^(#{1,3})\s+(.*)$", line)
        if match:
            yield (f"h{len(match.group(1))}", plain(match.group(2)))
        else:
            yield ("body", plain(line))
        index += 1


def render_file(source: Path, output: Path, header_label: str):
    doc = fitz.open()
    page = None
    y = 0
    margin = 48
    width, height = fitz.paper_size("letter")

    def new_page():
        nonlocal page, y
        page = doc.new_page(width=width, height=height)
        page.insert_text((margin, 25), header_label[:110], fontsize=7, fontname="cour", color=(0.25, 0.35, 0.45))
        page.insert_text((width - 90, height - 22), f"Page {len(doc)}", fontsize=7, fontname="cour", color=(0.35, 0.35, 0.35))
        y = margin + 20

    new_page()
    for kind, text in blocks(source.read_text(encoding="utf-8")):
        if kind == "space":
            y += 5
            continue
        style = {
            "h1": (16, "helv", (0.02, 0.22, 0.36), 26),
            "h2": (12, "helv", (0.02, 0.32, 0.48), 20),
            "h3": (10.5, "helv", (0.05, 0.35, 0.45), 18),
            "table": (8, "cour", (0.08, 0.08, 0.08), 60),
            "body": (9, "helv", (0.08, 0.08, 0.08), 30),
        }[kind]
        fontsize, fontname, color, minimum = style
        estimated = max(minimum, (text.count("\n") + max(1, len(text) // (85 if kind != "table" else 72))) * (fontsize + 3) + 8)
        if y + estimated > height - margin:
            new_page()
        rect = fitz.Rect(margin, y, width - margin, min(height - margin, y + estimated))
        remaining = page.insert_textbox(rect, text, fontsize=fontsize, fontname=fontname, color=color, lineheight=1.25)
        if remaining < 0:
            new_page()
            rect = fitz.Rect(margin, y, width - margin, height - margin)
            page.insert_textbox(rect, text, fontsize=fontsize, fontname=fontname, color=color, lineheight=1.2)
            y = height - margin
        else:
            y += estimated

    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output, garbage=4, deflate=True)
    doc.close()


def main():
    source_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    label_prefix = sys.argv[3] if len(sys.argv) > 3 else "PACT"

    count = 0
    for path in sorted(source_dir.glob("*.md")):
        out_path = output_dir / (path.stem + ".pdf")
        render_file(path, out_path, f"{label_prefix} | {path.stem}")
        count += 1
        print(f"Rendered {path.name} -> {out_path}")
    print(f"Total: {count}")


if __name__ == "__main__":
    main()
