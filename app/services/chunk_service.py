from langchain_text_splitters import RecursiveCharacterTextSplitter


def _build_location_label(
    page_no: int | None,
    parent_idx: int,
    child_idx: int | None = None,
    location_prefix: str | None = None,
) -> str:
    if location_prefix:
        base = location_prefix
    elif page_no is not None:
        base = f"第{page_no}页"
    else:
        base = "文档内容"

    if child_idx is None:
        return f"{base}-第{parent_idx}段"
    return f"{base}-第{parent_idx}段-第{child_idx}小段"


def build_parent_child_chunks(pages: list[dict]) -> tuple[list[dict], list[dict]]:
    parent_splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150)
    child_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=60)

    parents: list[dict] = []
    children: list[dict] = []

    for page_idx, page in enumerate(pages, start=1):
        page_no = page.get("page_no")
        location_prefix = page.get("location_prefix")
        parent_docs = parent_splitter.split_text(page["text"])
        for parent_idx, parent_text in enumerate(parent_docs, start=1):
            page_key = page_no if page_no is not None else f"logical{page_idx}"
            parent_chunk_id = f"page{page_key}_parent{parent_idx}"
            parent_location = _build_location_label(page_no, parent_idx, location_prefix=location_prefix)
            parents.append(
                {
                    "chunk_id": parent_chunk_id,
                    "page_no_start": page_no,
                    "page_no_end": page_no,
                    "chunk_type": "parent",
                    "chunk_order": parent_idx,
                    "chunk_location": parent_location,
                    "content": parent_text,
                }
            )
            child_docs = child_splitter.split_text(parent_text)
            for child_idx, child_text in enumerate(child_docs, start=1):
                children.append(
                    {
                        "chunk_id": f"{parent_chunk_id}_child{child_idx}",
                        "parent_chunk_id": parent_chunk_id,
                        "page_no_start": page_no,
                        "page_no_end": page_no,
                        "chunk_type": "child",
                        "chunk_order": child_idx,
                        "chunk_location": _build_location_label(
                            page_no,
                            parent_idx,
                            child_idx,
                            location_prefix=location_prefix,
                        ),
                        "content": child_text,
                    }
                )

    return parents, children
