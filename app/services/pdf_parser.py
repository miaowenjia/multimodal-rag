from __future__ import annotations

from pathlib import Path

import fitz


class PDFParseResult:
    def __init__(self, pages: list[dict], images: list[dict]) -> None:
        self.pages = pages
        self.images = images


class PyMuPDFParser:
    def __init__(self, image_output_dir: str) -> None:
        self.image_output_dir = Path(image_output_dir)
        self.image_output_dir.mkdir(parents=True, exist_ok=True)

    def parse(self, pdf_path: str) -> PDFParseResult:
        doc = fitz.open(pdf_path)
        pages: list[dict] = []
        images: list[dict] = []

        for page_index, page in enumerate(doc, start=1):
            text = page.get_text("text") or ""
            pages.append({"page_no": page_index, "text": text.strip()})

            for img_index, img in enumerate(page.get_images(full=True), start=1):
                xref = img[0]
                image_info = doc.extract_image(xref)
                ext = image_info.get("ext", "png")
                image_bytes = image_info["image"]
                image_name = f"page_{page_index}_img_{img_index}.{ext}"
                image_path = self.image_output_dir / image_name
                image_path.write_bytes(image_bytes)
                images.append(
                    {
                        "image_id": f"p{page_index}_i{img_index}",
                        "page_no": page_index,
                        "image_path": str(image_path),
                        "width": image_info.get("width"),
                        "height": image_info.get("height"),
                    }
                )

        return PDFParseResult(pages=pages, images=images)

