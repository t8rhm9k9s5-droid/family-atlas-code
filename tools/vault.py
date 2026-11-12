#!/usr/bin/env python3
"""Семейный атлас: проверка, смена пароля и сборка зашифрованного архива.

Формат совпадает с shell.js: gzip(JSON) -> AES-256-GCM (AAD = format),
ключ = PBKDF2-SHA-256(пароль, salt, 600 000). Пароль спрашивается в консоли
и никуда не пишется. Семейные данные в репозиторий не класть.

  python3 tools/vault.py verify  SITE_DIR
  python3 tools/vault.py rekey   SITE_DIR      # сменить пароль (старый -> новый)
  python3 tools/vault.py build   SITE_DIR bundle.json   # собрать из расшифрованного JSON
  python3 tools/vault.py export  SITE_DIR out.json      # расшифровать в JSON (только локально!)

Каждая сборка: новые salt и iv, новое имя файла, обновляются vault.json и sw.js,
старый файл архива удаляется. Сохранённый на устройствах доступ после этого
сбрасывается — семье нужно ввести новый пароль.
"""
import base64, getpass, gzip, hashlib, json, os, re, secrets, sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

FORMAT = "MashinskyAtlas:1"
ITER = 600_000
MIN_LEN = 16


def _key(password, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(password.encode())


def _read_cipher(site, cfg):
    path = os.path.join(site, cfg["file"][2:])
    data = open(path, "rb").read()
    return base64.b64decode(data.strip()) if path.endswith(".txt") else data


def decrypt(site, password):
    cfg = json.load(open(os.path.join(site, "vault.json")))
    assert cfg["format"] == FORMAT and cfg["iterations"] == ITER, "неизвестный формат"
    raw = AESGCM(_key(password, base64.b64decode(cfg["salt"]))).decrypt(
        base64.b64decode(cfg["iv"]), _read_cipher(site, cfg), FORMAT.encode())
    bundle = json.loads(gzip.decompress(raw))
    for k in ("body", "script", "report"):
        assert bundle.get(k), f"в архиве нет поля {k}"
    assert bundle.get("model", {}).get("nodes"), "в архиве нет model.nodes"
    return cfg, bundle


def encrypt(site, bundle, password, old_cfg=None):
    salt, iv = secrets.token_bytes(16), secrets.token_bytes(12)
    raw = gzip.compress(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).encode(), 9)
    ct = AESGCM(_key(password, salt)).encrypt(iv, raw, FORMAT.encode())
    name = "atlas-" + hashlib.sha256(ct).hexdigest()[:16] + ".txt"
    os.makedirs(os.path.join(site, "vault"), exist_ok=True)
    open(os.path.join(site, "vault", name), "wb").write(base64.b64encode(ct))
    cfg = {"format": FORMAT, "kdf": "PBKDF2", "hash": "SHA-256", "iterations": ITER,
           "salt": base64.b64encode(salt).decode(), "iv": base64.b64encode(iv).decode(),
           "cipher": "AES-GCM", "compression": "gzip", "file": "./vault/" + name}
    json.dump(cfg, open(os.path.join(site, "vault.json"), "w"), separators=(",", ":"))
    sw = os.path.join(site, "sw.js")
    if os.path.exists(sw):
        s = open(sw).read()
        s = re.sub(r"\./vault/atlas-[0-9a-f]{16}\.(bin|txt)", "./vault/" + name, s)
        s = re.sub(r"(remember-device-v)(\d+)", lambda m: m.group(1) + str(int(m.group(2)) + 1), s)
        open(sw, "w").write(s)
    if old_cfg and old_cfg["file"] != cfg["file"]:
        old = os.path.join(site, old_cfg["file"][2:])
        if os.path.exists(old):
            os.remove(old)
    decrypt(site, password)  # самопроверка: новый архив открывается новым паролем
    return cfg


def _new_password():
    p1 = getpass.getpass(f"Новый пароль (не короче {MIN_LEN} символов): ")
    if len(p1) < MIN_LEN:
        sys.exit(f"Пароль короче {MIN_LEN} символов — архив можно подобрать перебором.")
    if p1 != getpass.getpass("Повторите новый пароль: "):
        sys.exit("Пароли не совпали.")
    return p1


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    cmd, site = argv[1], argv[2]
    if cmd == "verify":
        _, b = decrypt(site, getpass.getpass("Пароль: "))
        print(f"Архив открыт: {len(b['model']['nodes'])} записей в древе.")
    elif cmd == "rekey":
        cfg, b = decrypt(site, getpass.getpass("Текущий пароль: "))
        new = encrypt(site, b, _new_password(), cfg)
        print("Готово:", new["file"])
    elif cmd == "build":
        bundle = json.load(open(argv[3]))
        old = json.load(open(os.path.join(site, "vault.json"))) if os.path.exists(os.path.join(site, "vault.json")) else None
        print("Готово:", encrypt(site, bundle, _new_password(), old)["file"])
    elif cmd == "export":
        _, b = decrypt(site, getpass.getpass("Пароль: "))
        json.dump(b, open(argv[3], "w"), ensure_ascii=False)
        print("Расшифровано в", argv[3], "— не коммитить и удалить после работы.")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
