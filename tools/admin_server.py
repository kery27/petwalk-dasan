# -*- coding: utf-8 -*-
"""동네 스팟 관리 서버 — 운영자(가르시아) 컴퓨터에서만 돌린다(2026-11-14).

하는 일
  - 저장소 폴더를 http://localhost:5175 로 보여 준다(앱 화면 + 관리 도구 tools/spots.html).
  - 관리 도구가 "저장"하면 spots-data.js 를 다시 쓰고, 사진은 spots/photos/ 에 파일로 둔다.
  - "모두에게 반영"을 누르면 spots-data.js 와 spots/ 만 커밋해서 GitHub에 올린다(= 배포).

지키는 것
  - 127.0.0.1 에만 열린다. 같은 와이파이의 다른 기기에서도 못 들어온다.
  - 이 폴더(tools/)는 _config.yml 에서 배포 대상에서 뺐다. 배포된 사이트에는 관리 도구가 없다.
  - 커밋은 spots-data.js 와 spots/ 두 곳만 건드린다. 다른 고친 파일은 같이 올라가지 않는다.
  - 사진은 브라우저에서 줄여서(촬영 위치 정보가 빠진 채로) 보내온 것만 받는다.

켜는 법: 이 폴더의 spots-admin.bat 을 더블클릭하거나, 저장소 폴더에서
    python tools/admin_server.py
"""
import base64
import hashlib
import http.server
import json
import os
import re
import subprocess
import sys
import threading
import webbrowser

PORT = 5175
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(ROOT, 'spots-data.js')
PHOTO_DIR = os.path.join(ROOT, 'spots', 'photos')
PHOTO_URL_PREFIX = 'spots/photos/'
MAX_BODY = 25 * 1024 * 1024        # 한 번 저장에 보내는 전체 크기
MAX_PHOTO = 2 * 1024 * 1024        # 사진 한 장
CATS = {'caution', 'bag', 'water', 'spot', 'vet', 'toilet', 'park'}
SIGNALS = {'green', 'yellow', 'red'}
ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,48}$')
DATA_URL_RE = re.compile(r'^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$')

HEADER = (
    "// 동네 스팟 데이터 — 자동 생성 파일.\n"
    "// 운영자 컴퓨터의 관리 도구(tools/spots.html + tools/admin_server.py)가 이 파일을 통째로 다시 쓴다.\n"
    "// 손으로 고쳐도 되지만 도구로 저장하면 덮어써진다. 사진은 spots/photos/ 에 있다.\n"
    "// 공용 시설과 가게만 넣는다 — 개인 집이나 특정인의 위치는 넣지 않는다.\n"
    "window.PETWALK_SPOTS = [\n"
)


# ── 데이터 읽고 쓰기 ──────────────────────────────────────────────

def read_spots():
    with open(DATA_FILE, encoding='utf-8') as f:
        text = f.read()
    start = text.index('window.PETWALK_SPOTS = [') + len('window.PETWALK_SPOTS = ')
    end = text.rindex(']') + 1
    return json.loads(text[start:end])


def write_spots(spots):
    body = ',\n'.join('  ' + json.dumps(s, ensure_ascii=False, separators=(',', ':')) for s in spots)
    tmp = DATA_FILE + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(HEADER + body + ('\n' if body else '') + '];\n')
    os.replace(tmp, DATA_FILE)


def clean_text(v, limit):
    if not isinstance(v, str):
        return None
    v = v.strip()
    return v[:limit] if v else None


def save_photo(value, spot_id, kind):
    """dataURL이면 파일로 저장하고 경로를, 이미 있는 파일 경로면 그대로, 아니면 None."""
    if not isinstance(value, str) or not value:
        return None
    if value.startswith(PHOTO_URL_PREFIX):
        name = value[len(PHOTO_URL_PREFIX):]
        if '/' not in name and '\\' not in name and os.path.isfile(os.path.join(PHOTO_DIR, name)):
            return value
        return None
    m = DATA_URL_RE.match(value)
    if not m:
        return None
    raw = base64.b64decode(m.group(2))
    if len(raw) > MAX_PHOTO:
        raise ValueError('사진이 너무 커요(2MB 이하)')
    ext = {'jpeg': 'jpg', 'png': 'png', 'webp': 'webp'}[m.group(1)]
    digest = hashlib.sha1(raw).hexdigest()[:10]   # 내용이 바뀌면 이름도 바뀌어 캐시 문제가 없다
    name = '%s-%s-%s.%s' % (spot_id, kind, digest, ext)
    os.makedirs(PHOTO_DIR, exist_ok=True)
    path = os.path.join(PHOTO_DIR, name)
    if not os.path.exists(path):
        with open(path, 'wb') as f:
            f.write(raw)
    return PHOTO_URL_PREFIX + name


def clean_spot(s):
    if not isinstance(s, dict):
        raise ValueError('스팟 형식이 이상해요')
    sid = s.get('id')
    if not isinstance(sid, str) or not ID_RE.match(sid):
        raise ValueError('스팟 id가 이상해요: %r' % (sid,))
    cat = s.get('cat')
    if cat not in CATS:
        raise ValueError('종류가 이상해요: %r' % (cat,))
    lat, lng = s.get('lat'), s.get('lng')
    if not all(isinstance(x, (int, float)) for x in (lat, lng)) or not (33 < lat < 39 and 124 < lng < 132):
        raise ValueError('좌표가 이상해요: %s' % sid)
    name = clean_text(s.get('name'), 40)
    if not name:
        raise ValueError('이름이 비어 있어요: %s' % sid)
    out = {'id': sid, 'cat': cat, 'name': name, 'lat': round(lat, 7), 'lng': round(lng, 7)}
    tags = s.get('tags')
    if isinstance(tags, list):
        tags = [t for t in (clean_text(t, 16) for t in tags[:8]) if t]
        if tags:
            out['tags'] = tags
    for key, limit in (('note', 80), ('phone', 20)):
        v = clean_text(s.get(key), limit)
        if v:
            out[key] = v
    out['source'] = 'osm' if s.get('source') == 'osm' else 'field'
    v = clean_text(s.get('verifiedAt'), 10)
    if v and re.match(r'^\d{4}-\d{2}-\d{2}$', v):
        out['verifiedAt'] = v
    if cat == 'spot':
        photo = save_photo(s.get('photo'), sid, 'p')
        if photo:
            out['photo'] = photo
        g = s.get('guardian')
        if isinstance(g, dict) and clean_text(g.get('name'), 10):
            guardian = {'name': clean_text(g.get('name'), 10)}
            if g.get('signal') in SIGNALS:
                guardian['signal'] = g['signal']
            line = clean_text(g.get('line'), 30)
            if line:
                guardian['line'] = line
            gphoto = save_photo(g.get('photo'), sid, 'g')
            if gphoto:
                guardian['photo'] = gphoto
            out['guardian'] = guardian
    return out


def remove_unused_photos(spots):
    used = set()
    for s in spots:
        for v in (s.get('photo'), (s.get('guardian') or {}).get('photo')):
            if v and v.startswith(PHOTO_URL_PREFIX):
                used.add(v[len(PHOTO_URL_PREFIX):])
    if not os.path.isdir(PHOTO_DIR):
        return
    for name in os.listdir(PHOTO_DIR):
        if name not in used and os.path.isfile(os.path.join(PHOTO_DIR, name)):
            os.remove(os.path.join(PHOTO_DIR, name))


# ── git ──────────────────────────────────────────────────────────

def git(*args):
    p = subprocess.run(['git'] + list(args), cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return p.returncode, (p.stdout + p.stderr).strip()


def data_paths():
    """커밋 대상 경로. 사진 폴더는 파일이 있거나 이미 올라간 사진이 있을 때만 넣는다
    (빈 폴더를 넘기면 git이 '그런 경로 없음'으로 멈춘다)."""
    paths = ['spots-data.js']
    has_files = os.path.isdir(PHOTO_DIR) and any(os.scandir(PHOTO_DIR))
    code, tracked = git('ls-files', '--', 'spots')
    if has_files or (code == 0 and tracked.strip()):
        paths.append('spots')
    return paths


def pending_changes():
    """spots-data.js·spots/ 중 아직 배포 안 한 변경 수"""
    code, out = git('status', '--porcelain', '--untracked-files=all', '--', *data_paths())
    if code != 0:
        return -1
    return len([l for l in out.splitlines() if l.strip()])


def publish():
    if pending_changes() == 0:
        return True, '배포할 변경이 없어요.'
    paths = data_paths()
    code, out = git('add', '-A', '--', *paths)
    if code != 0:
        return False, out
    msg = '[spots] 동네 스팟 갱신 (관리 도구)'
    code, out = git('commit', '-m', msg, '--', *paths)
    if code != 0:
        return False, out
    code, out2 = git('push')
    if code != 0:
        return False, '커밋은 했지만 올리지 못했어요:\n' + out2
    return True, '올렸어요. 몇 분 뒤 모든 사람 화면에 반영돼요.'


# ── 웹 서버 ──────────────────────────────────────────────────────

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # 저장한 내용이 바로 보이게 이 서버에서는 캐시하지 않는다
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _host_ok(self):
        host = (self.headers.get('Host') or '').split(':')[0]
        return host in ('localhost', '127.0.0.1')

    def _json(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _state(self):
        return {'spots': read_spots(), 'pending': pending_changes()}

    def do_GET(self):
        if not self._host_ok():
            self.send_error(403)
            return
        if self.path.split('?')[0] == '/api/state':
            try:
                self._json(200, self._state())
            except Exception as e:  # noqa: BLE001 - 화면에 이유를 보여 준다
                self._json(500, {'error': str(e)})
            return
        super().do_GET()

    def do_POST(self):
        if not self._host_ok():
            self.send_error(403)
            return
        origin = self.headers.get('Origin') or ''
        if origin and not re.match(r'^http://(localhost|127\.0\.0\.1):%d$' % PORT, origin):
            self.send_error(403)
            return
        length = int(self.headers.get('Content-Length') or 0)
        if length > MAX_BODY:
            self._json(413, {'error': '보내는 내용이 너무 커요'})
            return
        path = self.path.split('?')[0]
        try:
            body = json.loads(self.rfile.read(length).decode('utf-8') or '{}')
            if path == '/api/save':
                spots = body.get('spots')
                if not isinstance(spots, list):
                    raise ValueError('spots 목록이 없어요')
                cleaned = [clean_spot(s) for s in spots]
                ids = [s['id'] for s in cleaned]
                if len(ids) != len(set(ids)):
                    raise ValueError('같은 id가 두 번 있어요')
                write_spots(cleaned)
                remove_unused_photos(cleaned)
                self._json(200, self._state())
            elif path == '/api/publish':
                ok, message = publish()
                state = self._state()
                state.update({'ok': ok, 'message': message})
                self._json(200 if ok else 500, state)
            else:
                self.send_error(404)
        except ValueError as e:
            self._json(400, {'error': str(e)})
        except Exception as e:  # noqa: BLE001
            self._json(500, {'error': str(e)})

    def log_message(self, fmt, *args):
        if '/api/' in (args[0] if args else ''):
            sys.stderr.write('%s\n' % (fmt % args))


def main():
    url = 'http://localhost:%d/tools/spots.html' % PORT
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print('동네 스팟 관리 서버가 켜졌어요: ' + url)
    print('끄려면 이 창을 닫거나 Ctrl+C')
    if '--no-browser' not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
