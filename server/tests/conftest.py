import sys
from pathlib import Path

# Make `server/` importable when pytest is launched from the repository root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
