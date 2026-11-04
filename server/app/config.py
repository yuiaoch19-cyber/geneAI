"""应用配置。

所有可调参数都可以通过环境变量覆盖，默认值适用于本地开发。
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# 支持 server/.env（不覆盖已存在的真实环境变量）。
load_dotenv(BASE_DIR / ".env")

DATABASE_PATH = Path(os.getenv("GENEAI_DB_PATH", BASE_DIR / "geneai.db"))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH.as_posix()}")

APP_NAME = "GeneAI"
APP_VERSION = "0.5.0"
# 序列算法口径版本：写入数据库，便于后续统计口径升级时区分历史记录。
ALGORITHM_VERSION = "1.0"

MAX_SEQUENCE_LENGTH = int(os.getenv("MAX_SEQUENCE_LENGTH", "100000"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(2 * 1024 * 1024)))

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

# 本地开发：允许任意 localhost / 127.0.0.1 端口的前端访问。
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX", r"http://(localhost|127\.0\.0\.1):\d+"
)
