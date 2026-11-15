import os
import shutil
from pathlib import Path

from infra.common import read_json, run, write, write_json
from infra.components import content_digest

ROOT = Path(__file__).resolve().parents[1]
TARGET = Path("/opt/costota-map")
MARKER = Path("/etc/infra/costota-map-deployed.json")
CADDY_SITE = Path("/etc/caddy/sites.d/costota-map.caddy")
CADDYFILE = "/etc/caddy/Caddyfile"
DOMAIN = "costota-map.maserov.com"


def replace_tree(source: Path, target: Path) -> None:
    fresh = target.with_name("." + target.name + ".new")
    if fresh.exists():
        shutil.rmtree(fresh)
    shutil.copytree(source, fresh)
    for path in [fresh, *fresh.rglob("*")]:
        path.chmod(0o755 if path.is_dir() else 0o644)
    if target.exists():
        shutil.rmtree(target)
    os.rename(fresh, target)


def caddy_site() -> str:
    return (
        DOMAIN + " {\n"
        ' header X-Robots-Tag "noindex, nofollow"\n'
        ' header Cache-Control "no-cache"\n'
        " redir / /site/\n"
        " root * " + str(TARGET) + "\n"
        " file_server\n"
        "}\n"
    )


def configure() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    TARGET.chmod(0o755)
    digest = content_digest(ROOT)
    previous = read_json(MARKER) if MARKER.exists() else {}
    if previous.get("sha256") == digest and CADDY_SITE.is_file():
        print("costota-map: компонент " + digest[:12] + " уже установлен", flush=True)
        return

    for part in ("site", "docs"):
        replace_tree(ROOT / part, TARGET / part)
    shutil.copyfile(ROOT / "README.md", TARGET / "README.md")
    (TARGET / "README.md").chmod(0o644)
    before = CADDY_SITE.read_bytes() if CADDY_SITE.is_file() else None
    write(CADDY_SITE, caddy_site(), 0o644)
    try:
        run(["caddy", "validate", "--config", CADDYFILE, "--adapter", "caddyfile"], capture=True)
        run(["caddy", "reload", "--config", CADDYFILE, "--adapter", "caddyfile"], capture=True)
    except Exception:
        if before is None:
            CADDY_SITE.unlink()
        else:
            write(CADDY_SITE, before, 0o644)
        raise
    write_json(MARKER, {"sha256": digest})
    print("costota-map: страница установлена из компонента " + digest[:12], flush=True)
