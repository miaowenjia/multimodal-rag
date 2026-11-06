from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from app.services.pdf_parser import PDFParseResult


class WordParser:
    def __init__(self, image_output_dir: str) -> None:
        self.image_output_dir = Path(image_output_dir)
        self.image_output_dir.mkdir(parents=True, exist_ok=True)

    def parse(self, file_path: str, file_ext: str) -> PDFParseResult:
        if file_ext == ".docx":
            sections = self._parse_docx(file_path)
            images = self._extract_docx_images(file_path)
        elif file_ext == ".doc":
            sections = self._parse_doc(file_path)
            images = []
        else:
            raise ValueError("当前仅支持 DOC 和 DOCX 入库")
        return PDFParseResult(pages=sections, images=images)

    def _parse_docx(self, file_path: str) -> list[dict]:
        with ZipFile(file_path) as docx_zip:
            xml_content = docx_zip.read("word/document.xml")

        root = ET.fromstring(xml_content)
        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        body = root.find("w:body", namespace)
        if body is None:
            return []

        blocks: list[str] = []
        sections: list[dict] = []
        current_heading = "文档正文"
        section_index = 0

        def flush_section() -> None:
            nonlocal blocks, section_index
            text = "\n\n".join(blocks).strip()
            if not text:
                blocks = []
                return
            section_index += 1
            sections.append(
                {
                    "page_no": None,
                    "location_prefix": current_heading,
                    "text": text,
                    "section_index": section_index,
                }
            )
            blocks = []

        for element in body:
            tag_name = self._strip_namespace(element.tag)
            if tag_name == "p":
                paragraph_text = self._extract_paragraph_text(element, namespace)
                if not paragraph_text:
                    continue
                if self._is_heading(paragraph_text):
                    flush_section()
                    current_heading = paragraph_text
                    continue
                blocks.append(paragraph_text)
            elif tag_name == "tbl":
                table_text = self._extract_table_text(element, namespace)
                if table_text:
                    blocks.append(table_text)

        flush_section()
        if sections:
            return sections

        fallback_text = "\n\n".join(blocks).strip()
        if not fallback_text:
            return []
        return [{"page_no": None, "location_prefix": "文档正文", "text": fallback_text, "section_index": 1}]

    def _extract_docx_images(self, file_path: str) -> list[dict]:
        source = Path(file_path)
        images: list[dict] = []

        with ZipFile(file_path) as docx_zip:
            media_files = sorted(
                name for name in docx_zip.namelist() if name.startswith("word/media/") and not name.endswith("/")
            )
            for image_index, media_name in enumerate(media_files, start=1):
                image_bytes = docx_zip.read(media_name)
                ext = Path(media_name).suffix or ".png"
                image_name = f"{source.stem}_img_{image_index}{ext}"
                image_path = self.image_output_dir / image_name
                image_path.write_bytes(image_bytes)
                images.append(
                    {
                        "image_id": f"docx_i{image_index}",
                        "page_no": 1,
                        "image_path": str(image_path),
                        "width": None,
                        "height": None,
                        "chunk_location": f"文档内第{image_index}张图",
                    }
                )

        return images

    def _parse_doc(self, file_path: str) -> list[dict]:
        antiword_binary = os.getenv("ANTIWORD_BIN", "antiword")
        try:
            result = subprocess.run(
                [antiword_binary, file_path],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore",
                check=True,
            )
        except FileNotFoundError as exc:
            raise RuntimeError("系统未安装 antiword，无法解析 DOC 文件，请安装 antiword 或改传 DOCX/PDF") from exc
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or "").strip()
            stdout = (exc.stdout or "").strip()
            detail = stderr or stdout or "antiword 解析失败"
            raise RuntimeError(f"DOC 文件解析失败：{detail}") from exc

        text = result.stdout.strip()
        if not text:
            raise RuntimeError("DOC 文件解析失败：未提取到可用文本，请确认文件未损坏，或另存为 DOCX 后重试")
        return [{"page_no": None, "location_prefix": "文档正文", "text": text, "section_index": 1}]

    @staticmethod
    def _strip_namespace(tag: str) -> str:
        return tag.split("}", 1)[-1]

    @staticmethod
    def _is_heading(text: str) -> bool:
        normalized = text.strip()
        if not normalized:
            return False
        patterns = [
            r"^第[一二三四五六七八九十百零两\d]+章",
            r"^第[一二三四五六七八九十百零两\d]+节",
            r"^[一二三四五六七八九十]+[、.]",
            r"^\d+(?:\.\d+){0,2}\s*[^\s]+",
            r"^[（(][一二三四五六七八九十\d]+[）)]",
        ]
        return any(re.match(pattern, normalized) for pattern in patterns)

    def _extract_paragraph_text(self, paragraph: ET.Element, namespace: dict[str, str]) -> str:
        texts = [node.text for node in paragraph.findall(".//w:t", namespace) if node.text]
        return "".join(texts).strip()

    def _extract_table_text(self, table: ET.Element, namespace: dict[str, str]) -> str:
        rows: list[str] = []
        for row in table.findall(".//w:tr", namespace):
            cells: list[str] = []
            for cell in row.findall("./w:tc", namespace):
                cell_text_parts = []
                for paragraph in cell.findall(".//w:p", namespace):
                    paragraph_text = self._extract_paragraph_text(paragraph, namespace)
                    if paragraph_text:
                        cell_text_parts.append(paragraph_text)
                cell_text = " ".join(cell_text_parts).strip()
                if cell_text:
                    cells.append(cell_text)
            if cells:
                rows.append(" | ".join(cells))

        if not rows:
            return ""

        formatted_rows = [f"表格第{idx}行：{row}" for idx, row in enumerate(rows, start=1)]
        return "\n".join(formatted_rows)
