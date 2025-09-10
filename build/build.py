import json
import os
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
PRIVACY = ROOT / "privacy_policy.html"
MANIFESTS = ROOT / "build" / "manifests"
DIST = ROOT / "build" / "dist"
DEV = ROOT / "build" / "dev"

TARGETS = {
    "chrome": {"manifest": MANIFESTS / "manifest.chrome.json", "ext": "zip"},
    "firefox": {"manifest": MANIFESTS / "manifest.firefox.json", "ext": "xpi"},
}

PRODUCT_NAME = "YouTubeCommentsFilter"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def clear_dir(folder: Path):
    """Delete all contents of a directory, but keep the folder itself."""
    folder.mkdir(parents=True, exist_ok=True)
    for entry in folder.iterdir():
        if entry.is_file():
            if entry.name != ".gitkeep":
                os.remove(entry)
        elif entry.is_dir():
            delete_tree(entry)


def delete_tree(folder: Path):
    """Delete a directory tree manually with os.remove / os.rmdir."""
    for entry in folder.iterdir():
        if entry.is_file():
            os.remove(entry)
        elif entry.is_dir():
            delete_tree(entry)
    os.rmdir(folder)


def stage_tree(stage_dir: Path, manifest_path: Path):
    if stage_dir.exists():
        delete_tree(stage_dir)
    stage_dir.mkdir(parents=True)
    for item in SRC.rglob("*"):
        dest = stage_dir / item.relative_to(SRC)
        if item.is_dir():
            dest.mkdir(parents=True, exist_ok=True)
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(item.read_bytes())
    if PRIVACY.exists():
        (stage_dir / "privacy_policy.html").write_bytes(PRIVACY.read_bytes())
    manifest = load_json(manifest_path)
    (stage_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return manifest


def make_archive(root_dir: Path, out_file: Path):
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_file, "w",
                         compression=zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(root_dir.rglob("*")):
            if p.is_file():
                zf.write(p, p.relative_to(root_dir))


def build_target(target: str):
    cfg = TARGETS[target]
    manifest_path = cfg["manifest"]
    ext = cfg["ext"]

    stage_dir = ROOT / "build" / f".stage-{target}"
    manifest = stage_tree(stage_dir, manifest_path)
    version = manifest.get("version", "0.0.0")

    out_name = f"{PRODUCT_NAME}_V{version}_{target}.{ext}"
    out_path = DIST / out_name
    make_archive(stage_dir, out_path)

    dev_dir = DEV / target
    if dev_dir.exists():
        delete_tree(dev_dir)
    for item in stage_dir.rglob("*"):
        dest = dev_dir / item.relative_to(stage_dir)
        if item.is_dir():
            dest.mkdir(parents=True, exist_ok=True)
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(item.read_bytes())

    delete_tree(stage_dir)
    return out_path


def main():
    # wipe outputs
    if DIST.exists():
        clear_dir(DIST)
    else:
        DIST.mkdir(parents=True)
    if DEV.exists():
        clear_dir(DEV)
    else:
        DEV.mkdir(parents=True)

    for target in TARGETS:
        out = build_target(target)
        print(f"Built: {out}")


if __name__ == "__main__":
    main()
