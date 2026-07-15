"""Render the corrected PACKET HEIST Drop 5 master timeline source to PDF."""
from pathlib import Path
import re
import fitz

ROOT = Path(r"C:\Users\CETUAdmin1\Documents\Projects\PROFESSIONAL\PACT v5")
SOURCE = ROOT / "Drops" / "5" / "Master Insider Access Timeline.source.md"
OUTPUT = ROOT / "Drops" / "5" / "PDFs" / "Master Insider Access Timeline.pdf"


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
        elif line.startswith("- ") or re.match(r"^\d+\.\s", line):
            yield ("body", plain(line))
        else:
            yield ("body", plain(line))
        index += 1


def render():
    doc = fitz.open()
    page = None
    y = 0
    margin = 48
    width, height = fitz.paper_size("letter")

    def new_page():
        nonlocal page, y
        page = doc.new_page(width=width, height=height)
        page.insert_text((margin, 25), "PH-D5-CP-001 | PACKET HEIST | MASTER TIMELINE v2.0", fontsize=7, fontname="cour", color=(0.25, 0.35, 0.45))
        page.insert_text((width - 90, height - 22), f"Page {len(doc)}", fontsize=7, fontname="cour", color=(0.35, 0.35, 0.35))
        y = margin

    new_page()
    for kind, text in blocks(SOURCE.read_text(encoding="utf-8")):
        if kind == "space":
            y += 5
            continue
        style = {
            "h1": (18, "helv", (0.02, 0.22, 0.36), 30),
            "h2": (13, "helv", (0.02, 0.32, 0.48), 23),
            "h3": (11, "helv", (0.05, 0.35, 0.45), 20),
            "table": (8, "cour", (0.08, 0.08, 0.08), 72),
            "body": (9, "helv", (0.08, 0.08, 0.08), 34),
        }[kind]
        fontsize, fontname, color, minimum = style
        estimated = max(minimum, (text.count("\n") + max(1, len(text) // (85 if kind != "table" else 72))) * (fontsize + 3) + 8)
        if y + estimated > height - margin:
            new_page()
        rect = fitz.Rect(margin, y, width - margin, min(height - margin, y + estimated))
        remaining = page.insert_textbox(rect, text, fontsize=fontsize, fontname=fontname, color=color, lineheight=1.25)
        if remaining < 0:
            # Retry oversized blocks on a fresh page with more vertical room.
            new_page()
            rect = fitz.Rect(margin, y, width - margin, height - margin)
            page.insert_textbox(rect, text, fontsize=fontsize, fontname=fontname, color=color, lineheight=1.2)
            y = height - margin
        else:
            y += estimated

    metadata = doc.metadata
    metadata.update({
        "title": "PACKET HEIST - Master Insider Access Timeline",
        "subject": "Corrected v2.0; America/Chicago with normalized UTC",
        "author": "FBI Cyber Task Force - Command Post (PACT Exercise)",
        "keywords": "PH-D5-CP-001, PACKET HEIST, forensic timeline, training",
    })
    doc.set_metadata(metadata)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT, garbage=4, deflate=True)
    print(f"Rendered {len(doc)} pages to {OUTPUT}")


if __name__ == "__main__":
    render()
