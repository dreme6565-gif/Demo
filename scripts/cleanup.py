#!/usr/bin/env python3
"""Чистка старых демо-сайтов.

Удаляет папки демо, опубликованные больше N дней назад (по demos.json),
кроме тех, что перечислены в keep.txt. Затем, если что-то удалено и передан
--push, переписывает историю в один коммит (чтобы репозиторий не рос)
и отправляет на GitHub.

  python3 scripts/cleanup.py --days 7            # только показать, что удалится
  python3 scripts/cleanup.py --days 7 --apply    # удалить локально
  python3 scripts/cleanup.py --days 7 --apply --push
"""
import argparse
import datetime as dt
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "demos.json"
KEEP = ROOT / "keep.txt"
PROTECTED = {".git", ".github", "scripts", ".nojekyll", "CNAME", "README.md",
             "CLAUDE.md", "index.html", "robots.txt", "demos.json", "keep.txt"}


def load_keep():
    if not KEEP.exists():
        return set()
    out = set()
    for line in KEEP.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip().strip("/")
        if line:
            out.add(line)
    return out


def git(*args):
    subprocess.run(["git", "-C", str(ROOT), *args], check=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--days", type=int, default=7)
    p.add_argument("--apply", action="store_true")
    p.add_argument("--push", action="store_true")
    a = p.parse_args()

    registry = json.loads(REGISTRY.read_text(encoding="utf-8")) if REGISTRY.exists() else []
    keep = load_keep()
    today = dt.date.today()

    to_delete, kept, untracked = [], [], []
    by_slug = {d["slug"]: d for d in registry}

    for d in registry:
        slug = d["slug"]
        age = (today - dt.date.fromisoformat(d["published"])).days
        if slug in keep or d.get("keep"):
            kept.append(slug)
        elif age >= a.days:
            to_delete.append(slug)

    for item in ROOT.iterdir():
        if item.is_dir() and item.name not in PROTECTED and item.name not in by_slug:
            untracked.append(item.name)

    print(f"Сохранены (keep): {', '.join(kept) or '—'}")
    print(f"К удалению (старше {a.days} дн.): {', '.join(to_delete) or '—'}")
    if untracked:
        print(f"Папки без записи в demos.json (не трогаю): {', '.join(untracked)}")

    if not a.apply or not to_delete:
        return 0

    for slug in to_delete:
        path = ROOT / slug
        if path.exists() and path.is_dir() and slug not in PROTECTED:
            shutil.rmtree(path)
    registry = [d for d in registry if d["slug"] not in to_delete]
    REGISTRY.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Удалено: {len(to_delete)}")

    if a.push:
        # Переписываем историю в один коммит, чтобы удалённые файлы не занимали место.
        git("checkout", "-q", "--orphan", "cleanup-tmp")
        git("add", "-A")
        msg = (f"Чистка демо {today.isoformat()}: удалено {len(to_delete)}\n\n"
               "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")
        git("-c", "user.name=Claude", "-c", "user.email=noreply@anthropic.com",
            "commit", "-q", "-m", msg)
        git("branch", "-D", "main")
        git("branch", "-m", "main")
        git("push", "-q", "--force", "origin", "main")
        print("История сжата и отправлена на GitHub.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
