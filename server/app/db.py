"""数据库引擎、会话与轻量迁移。"""

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_legacy_analyses(bind: Engine) -> None:
    """把阶段 3 的 analyses 表迁移为 analysis_records，保留已有记录。

    SQLite 3.25+ 支持 RENAME COLUMN；迁移在事务中执行，失败会整体回滚。
    """
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    if "analyses" not in tables or "analysis_records" in tables:
        return

    columns = {col["name"] for col in inspector.get_columns("analyses")}
    renames = {
        "name": "sequence_name",
        "length": "sequence_length",
        "sequence": "original_sequence",
    }

    with bind.begin() as conn:
        conn.execute(text("ALTER TABLE analyses RENAME TO analysis_records"))
        for old, new in renames.items():
            if old in columns and new not in columns:
                conn.execute(
                    text(
                        f"ALTER TABLE analysis_records RENAME COLUMN {old} TO {new}"
                    )
                )


def _ensure_analysis_columns(bind: Engine) -> None:
    """为旧库补齐新增列与索引（create_all 不会修改已存在的表）。"""
    inspector = inspect(bind)
    if "analysis_records" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("analysis_records")}
    if "algorithm_version" not in columns:
        with bind.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE analysis_records "
                    "ADD COLUMN algorithm_version VARCHAR(16) NOT NULL DEFAULT '1.0'"
                )
            )

    with bind.begin() as conn:
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_analysis_records_created_at "
                "ON analysis_records (created_at)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_analysis_records_sequence_hash "
                "ON analysis_records (sequence_hash)"
            )
        )


def init_db(bind: Engine | None = None) -> None:
    from . import models  # noqa: F401  确保模型注册到元数据

    target = bind or engine
    _migrate_legacy_analyses(target)
    Base.metadata.create_all(bind=target)
    _ensure_analysis_columns(target)

