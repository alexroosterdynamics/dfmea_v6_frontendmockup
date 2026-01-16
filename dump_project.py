#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime

OUTPUT_FILE = "dump.txt"

TARGETS = [
    ("app/page.js", "FILE"),
    ("components", "DIR"),
    ("data", "DIR"),
]

TARGETS = [
    ("app/page.js", "FILE"),
    ("components", "DIR"),
    
]


ALLOWED_EXTS = {".js", ".jsx", ".ts", ".tsx", ".json"}


def read_text_safe(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(errors="replace")


def dump_file(out_lines: list[str], root: Path, file_path: Path):
    rel = file_path.relative_to(root).as_posix()
    out_lines.append("\n" + "=" * 90)
    out_lines.append(f"FILE: {rel}")
    out_lines.append("=" * 90)
    out_lines.append(read_text_safe(file_path).rstrip() + "\n")


def should_exclude(file_path: Path, exclude_names: set[str]) -> bool:
    # Exclude by *file name* only (not full path)
    return file_path.name in exclude_names


def main(exclude_names: set[str] | None = None):
    exclude_names = exclude_names or set()

    root = Path(__file__).resolve().parent
    out_path = root / OUTPUT_FILE

    out_lines: list[str] = []
    out_lines.append(f"PROJECT DUMP ({datetime.now().isoformat(timespec='seconds')})")
    out_lines.append(f"ROOT: {root.as_posix()}")
    out_lines.append(f"EXCLUDES: {', '.join(sorted(exclude_names)) if exclude_names else '(none)'}")
    out_lines.append("")

    missing = []

    for target, kind in TARGETS:
        p = root / target

        if kind == "FILE":
            if not p.exists():
                missing.append(target)
                continue
            if should_exclude(p, exclude_names):
                continue
            dump_file(out_lines, root, p)

        elif kind == "DIR":
            if not p.exists() or not p.is_dir():
                missing.append(target)
                continue

            files = sorted(
                [f for f in p.rglob("*") if f.is_file() and f.suffix in ALLOWED_EXTS],
                key=lambda x: x.as_posix().lower(),
            )

            for f in files:
                if should_exclude(f, exclude_names):
                    continue
                dump_file(out_lines, root, f)

    if missing:
        out_lines.append("\n" + "!" * 90)
        out_lines.append("MISSING TARGETS:")
        for m in missing:
            out_lines.append(f"- {m}")
        out_lines.append("!" * 90 + "\n")

    out_path.write_text("\n".join(out_lines), encoding="utf-8")
    print(f"✅ Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    # Default excludes for now:
    main()
       
