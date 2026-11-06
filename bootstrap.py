import os
from pathlib import Path

for rel in [
    "app/api/routes",
    "app/clients",
    "app/core",
    "app/db",
    "app/repositories",
    "app/schemas",
    "app/services",
    "app/utils",
    "data/images",
    "data/uploads",
]:
    Path(rel).mkdir(parents=True, exist_ok=True)

print("项目目录初始化完成")

