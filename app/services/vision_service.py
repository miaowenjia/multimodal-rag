from __future__ import annotations

import base64
from pathlib import Path

from app.clients.openai_clients import get_vision_llm
from app.core.runtime_config import get_runtime_config


def image_to_base64(image_path: str) -> str:
    return base64.b64encode(Path(image_path).read_bytes()).decode("utf-8")


def generate_image_caption(image_path: str) -> str | None:
    runtime = get_runtime_config()
    if not runtime.enable_vision:
        return None

    llm = get_vision_llm()
    image_b64 = image_to_base64(image_path)
    message = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "请用中文简洁描述这张图片，方便知识库检索。"},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                },
            ],
        }
    ]
    result = llm.invoke(message)
    return result.content.strip() if isinstance(result.content, str) else str(result.content)

