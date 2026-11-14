// 산책 사진("오늘의 한 장") 저장소 — 2026-11-14.
// walk-end.html(찍고 저장), walk-history.html·index.html(보여 주기)이 같이 쓴다. 전역 window.WalkPhotos.
//
// 사진은 이 휴대폰의 IndexedDB(petwalk-photos)에만 둔다. 서버로 보내지 않는다.
// localStorage는 5MB 안팎이라 사진이 쌓이면 넘치므로 따로 둔다(SPEC_STAGE0.md "사진" 항목).
// 산책 기록(petwalk_walks)에는 사진 열쇠(photoKey)만 적는다.
//
// 사진은 긴 변 1080px JPEG로 줄여서 저장한다. 캔버스로 다시 그리면서 촬영 위치·시각 정보(EXIF)가 빠진다 —
// 집 앞에서 찍은 사진이어도 위치가 사진에 남지 않는다.
(function () {
  var DB_NAME = 'petwalk-photos';
  var STORE = 'photos';
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('이 브라우저는 사진 저장을 지원하지 않아요')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('사진 저장소를 열지 못했어요')); };
    });
    dbPromise.catch(function () { dbPromise = null; });
    return dbPromise;
  }

  function run(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var result;
        var req = fn(tx.objectStore(STORE));
        if (req) req.onsuccess = function () { result = req.result; };
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error || new Error('사진 저장에 실패했어요')); };
        tx.onabort = function () { reject(tx.error || new Error('사진 저장이 취소됐어요')); };
      });
    });
  }

  function put(key, blob) { return run('readwrite', function (s) { return s.put(blob, key); }); }
  function get(key) { return run('readonly', function (s) { return s.get(key); }); }
  function remove(key) { return run('readwrite', function (s) { return s.delete(key); }); }

  // 파일 → 줄인 JPEG Blob
  function shrink(file, maxDim) {
    maxDim = maxDim || 1080;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('사진을 줄이지 못했어요'));
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('사진을 읽지 못했어요')); };
      img.src = url;
    });
  }

  // <img>에 저장된 사진을 넣는다. 없거나 못 읽으면 false.
  function show(key, imgEl) {
    if (!key) return Promise.resolve(false);
    return get(key).then(function (blob) {
      if (!blob) return false;
      var url = URL.createObjectURL(blob);
      imgEl.onload = function () { URL.revokeObjectURL(url); };
      imgEl.src = url;
      return true;
    }).catch(function () { return false; });
  }

  function newKey() { return 'walk-' + Date.now() + '-' + Math.floor(Math.random() * 1e4); }

  window.WalkPhotos = { put: put, get: get, remove: remove, shrink: shrink, show: show, newKey: newKey };
})();
