"""应用配置。"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_PATH = BASE_DIR / "geneai.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

APP_NAME = "GeneAI"
APP_VERSION = "0.1.0"

MAX_SEQUENCE_LENGTH = 100_000
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

# 开发期允许任意本地端口的前端访问；生产同源部署时不影响。
CORS_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1):\d+"
