// 스팟 편집 페이지(spot-editor.html)가 GitHub 저장소에 바로 커밋하는 부분 — 2026-11-15.
// 전역 window.SpotGitHub.
//
// 왜 이렇게: 사이트(GitHub Pages)는 서버가 없어서, 편집한 내용을 모두에게 보이게 하려면 저장소의
// spots-data.js와 spots/photos/를 바꿔 커밋해야 한다. 운영자(가르시아)의 GitHub 토큰으로 GitHub API를
// 불러 한 번에 커밋 하나를 만든다 → Pages가 다시 배포 → 몇 분 뒤 모든 사람 화면에 반영.
//
// 토큰:
//   - 운영자가 GitHub에서 직접 만든 "fine-grained" 토큰. 이 저장소 하나, Contents 읽기/쓰기만.
//   - 운영자 컴퓨터의 이 브라우저 localStorage(petwalk_admin_token)에만 둔다. 다른 데로 보내지 않는다(api.github.com만).
//   - 토큰이 있는 기기 = 운영자 기기. [동네] 지도의 "스팟 편집" 버튼은 이 기기에서만 보인다.
//   - 주의: kery27.github.io 아래의 다른 저장소 사이트도 같은 출처라 이 값을 읽을 수 있다 — 그래서 권한을 이 저장소로만 좁힌다.
(function () {
  var OWNER = 'kery27';
  var REPO = 'petwalk-dasan';
  var BRANCH = 'main';
  var DATA_PATH = 'spots-data.js';
  var PHOTO_DIR = 'spots/photos/';
  var TOKEN_KEY = 'petwalk_admin_token';
  var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO;

  var HEADER =
    '// 동네 스팟 데이터 — 자동 생성 파일.\n' +
    '// 운영자의 스팟 편집 페이지(spot-editor.html)가 이 파일을 통째로 다시 쓴다.\n' +
    '// 손으로 고쳐도 되지만 편집 페이지로 반영하면 덮어써진다. 사진은 spots/photos/ 에 있다.\n' +
    '// 공용 시설과 가게만 넣는다 — 개인 집이나 특정인의 위치는 넣지 않는다.\n' +
    'window.PETWALK_SPOTS = [\n';

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* 무시 */ } }
  function hasToken() { return !!token(); }

  function gh(method, path, body) {
    return fetch(API + path, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token(),
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var msg = j && j.message ? j.message : ('HTTP ' + r.status);
          if (r.status === 401) msg = '토큰이 맞지 않거나 만료됐어요';
          if (r.status === 403 || r.status === 404) msg = '이 토큰으로는 저장소에 쓸 수 없어요(' + msg + ')';
          var err = new Error(msg); err.status = r.status; throw err;
        }
        return j;
      });
    });
  }

  // UTF-8 문자열 ↔ base64
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    var bin = atob(b64.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function parseData(text) {
    var start = text.indexOf('window.PETWALK_SPOTS = [');
    if (start < 0) throw new Error('spots-data.js 모양이 예상과 달라요');
    start += 'window.PETWALK_SPOTS = '.length;
    var end = text.lastIndexOf(']') + 1;
    return JSON.parse(text.slice(start, end));
  }
  function buildData(spots) {
    var body = spots.map(function (s) { return '  ' + JSON.stringify(s); }).join(',\n');
    return HEADER + body + (body ? '\n' : '') + '];\n';
  }

  // 토큰 확인: 이 저장소에 쓸 수 있는지
  function check() {
    return gh('GET', '').then(function (repo) {
      if (!repo.permissions || !repo.permissions.push) throw new Error('이 토큰은 읽기만 돼요. Contents를 "Read and write"로 만들어 주세요');
      return true;
    });
  }

  // 지금 저장소(main)의 스팟 목록과 그 커밋 sha
  function load() {
    return gh('GET', '/git/ref/heads/' + BRANCH).then(function (ref) {
      var sha = ref.object.sha;
      return gh('GET', '/contents/' + DATA_PATH + '?ref=' + sha).then(function (file) {
        return { spots: parseData(b64ToUtf8(file.content)), headSha: sha };
      });
    });
  }

  function sha1Hex(b64) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return crypto.subtle.digest('SHA-1', bytes).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  // 편집한 목록을 커밋 하나로 올린다.
  //  - dataURL 사진은 spots/photos/<id>-<g|p>-<해시>.jpg 파일로 올리고 경로로 바꾼다
  //  - 목록에서 더 안 쓰는 사진 파일은 같은 커밋에서 지운다
  //  - baseSha: 편집을 시작할 때 본 커밋. 그 사이 누가(다른 컴퓨터에서) 바꿨으면 멈추고 알린다
  function publish(spots, baseSha, message) {
    var work = JSON.parse(JSON.stringify(spots));
    var uploads = [];   // { path, b64 }
    var jobs = [];
    work.forEach(function (s) {
      [['photo', s, 'p'], ['photo', s.guardian, 'g']].forEach(function (t) {
        var holder = t[1], kind = t[2];
        if (!holder || typeof holder.photo !== 'string') return;
        var m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(holder.photo);
        if (!m) return;
        var ext = m[1] === 'jpeg' ? 'jpg' : m[1];
        jobs.push(sha1Hex(m[2]).then(function (hex) {
          var path = PHOTO_DIR + s.id + '-' + kind + '-' + hex.slice(0, 10) + '.' + ext;
          holder.photo = path;
          uploads.push({ path: path, b64: m[2] });
        }));
      });
    });

    var headSha, baseTree;
    return Promise.all(jobs).then(function () {
      return gh('GET', '/git/ref/heads/' + BRANCH);
    }).then(function (ref) {
      headSha = ref.object.sha;
      if (baseSha && headSha !== baseSha) {
        // 저장소가 그 사이 바뀌었다 — 스팟 데이터가 바뀌었을 때만 막는다(다른 파일 커밋은 상관없음)
        return gh('GET', '/compare/' + baseSha + '...' + headSha).then(function (cmp) {
          var touched = (cmp.files || []).some(function (f) { return f.filename === DATA_PATH || f.filename.indexOf(PHOTO_DIR) === 0; });
          if (touched) throw new Error('편집을 시작한 뒤 다른 곳에서 스팟이 바뀌었어요. "다시 불러오기"로 최신을 받아서 다시 해 주세요');
        });
      }
    }).then(function () {
      return gh('GET', '/git/commits/' + headSha);
    }).then(function (commit) {
      baseTree = commit.tree.sha;
      return gh('GET', '/git/trees/' + baseTree + '?recursive=1');
    }).then(function (tree) {
      var used = {};
      work.forEach(function (s) {
        if (s.photo) used[s.photo] = true;
        if (s.guardian && s.guardian.photo) used[s.guardian.photo] = true;
      });
      var existing = (tree.tree || []).filter(function (t) { return t.type === 'blob' && t.path.indexOf(PHOTO_DIR) === 0; });
      var deletions = existing.filter(function (t) { return !used[t.path]; }).map(function (t) {
        return { path: t.path, mode: '100644', type: 'blob', sha: null };
      });
      var have = {};
      existing.forEach(function (t) { have[t.path] = true; });
      var newFiles = uploads.filter(function (u, i, arr) {
        return !have[u.path] && arr.findIndex(function (x) { return x.path === u.path; }) === i;
      });
      // 사진 blob 만들기 → 데이터 파일 blob → 새 트리
      return Promise.all(newFiles.map(function (u) {
        return gh('POST', '/git/blobs', { content: u.b64, encoding: 'base64' }).then(function (b) {
          return { path: u.path, mode: '100644', type: 'blob', sha: b.sha };
        });
      })).then(function (photoEntries) {
        return gh('POST', '/git/blobs', { content: utf8ToB64(buildData(work)), encoding: 'base64' }).then(function (b) {
          return photoEntries.concat(deletions, [{ path: DATA_PATH, mode: '100644', type: 'blob', sha: b.sha }]);
        });
      });
    }).then(function (entries) {
      return gh('POST', '/git/trees', { base_tree: baseTree, tree: entries });
    }).then(function (newTree) {
      if (newTree.sha === baseTree) return { headSha: headSha, spots: work, nothing: true };
      return gh('POST', '/git/commits', { message: message || '[spots] 동네 스팟 갱신 (편집 페이지)', tree: newTree.sha, parents: [headSha] })
        .then(function (c) { return gh('PATCH', '/git/refs/heads/' + BRANCH, { sha: c.sha }).then(function () { return c; }); })
        .then(function (c) { return { headSha: c.sha, spots: work, commitUrl: c.html_url }; });
    });
  }

  window.SpotGitHub = {
    OWNER: OWNER, REPO: REPO, hasToken: hasToken, setToken: setToken, check: check, load: load, publish: publish
  };
})();
