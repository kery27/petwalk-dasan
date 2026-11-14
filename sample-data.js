// 샘플 데이터로 보기(2026-11-14 가르시아 요청) — 버튼 하나로 앱 전체를 "써 본 상태"로 채운다.
// 공원에서 견주에게 보여 주거나, 기능을 한눈에 확인할 때 쓴다. 전역 window.PetwalkSample.
//
// 넣는 것(전부 이 휴대폰 안에만, 서버로 보내지 않음):
//   - 강아지 프로필(샘플 이름·그린 그림 사진·신호등·주민증 번호)
//   - 최근 3주 산책 기록: 길 기록 산책(공원 둘레 가짜 경로) + 시간만 잰 산책, 끝 화면 답, 오늘의 한 장 사진
//   - 산책 중에 찍은 메모 핀 2개
//   - [동네] 지도의 샘플 가게 3곳과 수호지킴이(이름에 "(샘플)"이 붙는다)
// 사진은 전부 캔버스로 그린 그림이다 — 실제 사람·강아지 사진이 아니다.
// 경로는 공용 공원(다산중앙공원·다산수변공원) 둘레를 도는 지어낸 고리다 — 누구의 실제 경로도 아니다.
//
// 켜면 지금 기록을 따로 보관해 두고(petwalk_sample_backup), 끄면 샘플을 지우고 그대로 되돌린다.
// 샘플을 켠 동안 새로 한 산책은 끌 때 같이 사라진다(켤 때 알린다).
(function () {
  var FLAG = 'petwalk_sample_mode';
  var BACKUP = 'petwalk_sample_backup';
  var SPOTS = 'petwalk_sample_spots';    // infra-pins.js가 샘플 모드일 때만 읽는다
  // 샘플이 덮어쓰는 열쇠들 — 끌 때 이 값들을 되돌린다
  var KEYS = ['petwalk_walks', 'petwalk_profile', 'petwalk_pins', 'petwalk_reward_card',
              'petwalk_last_walk', 'petwalk_active_walk', 'petwalk_dog_size'];
  var PHOTO_PREFIX = 'sample-';

  function isOn() { try { return localStorage.getItem(FLAG) === '1'; } catch (e) { return false; } }

  // ── 그림 그리기(가짜 사진) ──
  var PALETTES = [
    { sky: ['#bfe3f5', '#fdf3dc'], ground: '#9cc98f', fur: '#e8c08f', dark: '#7a5230' },
    { sky: ['#fbd6c4', '#fff4e0'], ground: '#c9b48a', fur: '#f5f0e6', dark: '#8a7a68' },
    { sky: ['#d9d2f2', '#f6eefc'], ground: '#a7c79d', fur: '#5b4636', dark: '#2f241b' },
    { sky: ['#cdeee0', '#fffbe8'], ground: '#b9d58f', fur: '#d9a066', dark: '#6b4423' },
    { sky: ['#ffe2a8', '#fff7e3'], ground: '#8fbf8a', fur: '#f2e3c9', dark: '#9b7b55' }
  ];
  function drawDogPicture(w, h, pal, label) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, pal.sky[0]); g.addColorStop(1, pal.sky[1]);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = pal.ground;
    x.beginPath(); x.ellipse(w * 0.5, h * 1.02, w * 0.8, h * 0.32, 0, 0, Math.PI * 2); x.fill();
    var s = Math.min(w, h);
    var cx = w * 0.5, cy = h * 0.58;
    // 몸
    x.fillStyle = pal.fur;
    x.beginPath(); x.ellipse(cx, cy + s * 0.2, s * 0.26, s * 0.2, 0, 0, Math.PI * 2); x.fill();
    // 귀
    x.fillStyle = pal.dark;
    x.beginPath(); x.ellipse(cx - s * 0.17, cy - s * 0.12, s * 0.07, s * 0.13, -0.5, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(cx + s * 0.17, cy - s * 0.12, s * 0.07, s * 0.13, 0.5, 0, Math.PI * 2); x.fill();
    // 머리
    x.fillStyle = pal.fur;
    x.beginPath(); x.arc(cx, cy - s * 0.04, s * 0.19, 0, Math.PI * 2); x.fill();
    // 주둥이
    x.fillStyle = '#fffaf3';
    x.beginPath(); x.ellipse(cx, cy + s * 0.05, s * 0.09, s * 0.065, 0, 0, Math.PI * 2); x.fill();
    // 눈·코
    x.fillStyle = '#2b2018';
    x.beginPath(); x.arc(cx - s * 0.07, cy - s * 0.06, s * 0.022, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx + s * 0.07, cy - s * 0.06, s * 0.022, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(cx, cy + s * 0.02, s * 0.03, s * 0.022, 0, 0, Math.PI * 2); x.fill();
    // 혀
    x.fillStyle = '#e8837a';
    x.beginPath(); x.ellipse(cx, cy + s * 0.1, s * 0.022, s * 0.03, 0, 0, Math.PI * 2); x.fill();
    // "샘플" 표시 — 진짜 사진으로 오해하지 않게
    x.fillStyle = 'rgba(74,63,53,0.55)';
    x.font = '700 ' + Math.round(s * 0.06) + 'px Pretendard, sans-serif';
    x.textAlign = 'right';
    x.fillText(label || '샘플', w - s * 0.04, h - s * 0.04);
    return c;
  }
  function canvasToBlob(c) {
    return new Promise(function (resolve) { c.toBlob(resolve, 'image/jpeg', 0.82); });
  }

  // ── 가짜 경로: 공원 둘레 고리 ──
  function loop(center, radiusM, points, phase) {
    var mLat = 111320, mLng = 111320 * Math.cos(center[0] * Math.PI / 180);
    var out = [];
    for (var i = 0; i <= points; i++) {
      var a = phase + (i / points) * Math.PI * 2;
      var r = radiusM * (1 + 0.08 * Math.sin(i * 1.7));
      out.push([+(center[0] + (r * Math.sin(a)) / mLat).toFixed(6), +(center[1] + (r * Math.cos(a)) / mLng).toFixed(6)]);
    }
    return out;
  }
  function routeKm(route) {
    var km = 0, R = 6371, rad = Math.PI / 180;
    for (var i = 1; i < route.length; i++) {
      var a = route[i - 1], b = route[i];
      var dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
      var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      km += 2 * R * Math.asin(Math.sqrt(h));
    }
    return Math.round(km * 100) / 100;
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

  var CENTRAL = [37.6233, 127.15962];    // 다산중앙공원(발도장 장소와 같은 중심)
  var WATERSIDE = [37.62396, 127.14529]; // 다산수변공원

  // [며칠 전, 방식, 분, 어느 공원, 고리 반지름(m), 충분했나, 킁킁, 응가, 사진 그림 번호]
  var PLAN = [
    [0, 'gps', 34, CENTRAL, 170, 'enough', 4, 1, 0],
    [1, 'time', 20, null, 0, 'short', 2, 1, -1],
    [1, 'gps', 41, WATERSIDE, 220, 'enough', 5, 2, 1],
    [2, 'gps', 28, CENTRAL, 150, 'enough', 3, 1, -1],
    [3, 'gps', 37, CENTRAL, 190, 'enough', 4, 1, 2],
    [4, 'time', 15, null, 0, 'short', 2, 0, -1],
    [5, 'gps', 46, WATERSIDE, 240, 'enough', 5, 1, 3],
    [6, 'gps', 31, CENTRAL, 160, 'enough', 3, 1, -1],
    [8, 'gps', 39, CENTRAL, 200, 'enough', 4, 2, -1],
    [9, 'gps', 26, WATERSIDE, 180, 'short', 3, 1, 4],
    [10, 'gps', 33, CENTRAL, 170, 'enough', 4, 1, -1],
    [12, 'gps', 44, WATERSIDE, 230, 'enough', 5, 1, -1],
    [13, 'gps', 29, CENTRAL, 150, 'enough', 3, 1, -1],
    [14, 'gps', 36, CENTRAL, 190, 'enough', 4, 1, -1],
    [16, 'gps', 40, WATERSIDE, 210, 'enough', 4, 2, -1],
    [17, 'gps', 27, CENTRAL, 160, 'short', 2, 1, -1],
    [19, 'gps', 35, CENTRAL, 180, 'enough', 4, 1, -1],
    [20, 'time', 18, null, 0, 'enough', 3, 1, -1]
  ];

  // [id 끝, 가게 이름, 종류 태그, 강아지 이름, 신호등, 한마디, 위치(공원 근처), 그림 번호]
  var SHOPS = [
    ['1', '다산 수제간식 공방 (샘플)', ['실내OK', '소형견만'], '콩이', 'green', '간식 주면 손 줘요', [37.62268, 127.15840], 3],
    ['2', '왕숙천 카페 (샘플)', ['테라스만', '대형견OK'], '두부', 'yellow', '처음엔 천천히 다가와 주세요', [37.62452, 127.14630], 1],
    ['3', '중앙공원 펫살롱 (샘플)', ['예약 필수'], '깜순이', 'red', '눈으로만 예뻐해 주세요', [37.62200, 127.16090], 2]
  ];

  function turnOn() {
    if (isOn()) return Promise.resolve();
    // 지금 기록 보관
    var backup = {};
    KEYS.forEach(function (k) { try { backup[k] = localStorage.getItem(k); } catch (e) { backup[k] = null; } });
    try { localStorage.setItem(BACKUP, JSON.stringify(backup)); } catch (e) { return Promise.reject(new Error('저장 공간이 부족해요')); }

    var now = new Date();
    var walks = [], photoJobs = [];
    PLAN.slice().reverse().forEach(function (p, i) {   // 오래된 것부터 쌓는다
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - p[0]);
      var w = { date: dateKey(d), durationMin: p[2], gapMin: 0, feel: p[5], sniff: p[6], poop: p[7] };
      if (p[1] === 'gps') {
        var route = loop(p[3], p[4], 36, i * 0.7);
        w.distanceKm = routeKm(route);
        w.route = route;
        w.stampRoute = route;
        w.rewardEligible = true;
      } else {
        w.distanceKm = 0; w.route = []; w.stampRoute = []; w.rewardEligible = false; w.mode = 'time';
      }
      if (p[8] >= 0 && window.WalkPhotos) {
        w.photoKey = PHOTO_PREFIX + 'walk-' + i;
        photoJobs.push([w.photoKey, PALETTES[p[8] % PALETTES.length]]);
      }
      walks.push(w);
    });

    var profilePic = drawDogPicture(480, 480, PALETTES[0], '샘플').toDataURL('image/jpeg', 0.82);
    var spots = SHOPS.map(function (s) {
      return {
        id: 'sample-shop-' + s[0], cat: 'spot', name: s[1], lat: s[6][0], lng: s[6][1], tags: s[2],
        source: 'field', verifiedAt: dateKey(now), note: '샘플 데이터예요. 실제 가게가 아니에요.',
        guardian: { name: s[3], signal: s[4], line: s[5], photo: drawDogPicture(360, 360, PALETTES[s[7]], '샘플').toDataURL('image/jpeg', 0.8) }
      };
    });

    try {
      localStorage.setItem('petwalk_walks', JSON.stringify(walks));
      localStorage.setItem('petwalk_profile', JSON.stringify({
        name: '보리', size: 'small', signal: 'green', photo: profilePic,
        cardNo: 'DASAN-SAMPLE', cardIssued: now.getFullYear() + '. ' + (now.getMonth() + 1) + '. ' + now.getDate() + '.'
      }));
      localStorage.setItem('petwalk_pins', JSON.stringify([
        { id: 'sample-pin-1', lat: 37.62362, lng: 127.15905, memo: '여기 풀숲 진드기 조심 (샘플)' },
        { id: 'sample-pin-2', lat: 37.62428, lng: 127.14460, memo: '그늘 벤치, 물그릇 있음 (샘플)' }
      ]));
      localStorage.removeItem('petwalk_reward_card');
      localStorage.removeItem('petwalk_last_walk');
      localStorage.removeItem('petwalk_active_walk');
      localStorage.setItem('petwalk_dog_size', 'small');
      localStorage.setItem(SPOTS, JSON.stringify(spots));
      localStorage.setItem(FLAG, '1');
    } catch (e) {
      restoreKeys(backup);
      return Promise.reject(new Error('저장 공간이 부족해요'));
    }

    // 오늘의 한 장 사진(그림)은 휴대폰 안 사진 저장소에
    return photoJobs.reduce(function (chain, job) {
      return chain.then(function () {
        return canvasToBlob(drawDogPicture(1080, 1080, job[1], '샘플 · 오늘의 한 장'))
          .then(function (blob) { return WalkPhotos.put(job[0], blob); })
          .catch(function () { /* 사진 하나 못 넣어도 나머지는 그대로 */ });
      });
    }, Promise.resolve());
  }

  function restoreKeys(backup) {
    KEYS.forEach(function (k) {
      try {
        if (backup && backup[k] != null) localStorage.setItem(k, backup[k]);
        else localStorage.removeItem(k);
      } catch (e) { /* 되돌리지 못한 값은 그대로 */ }
    });
  }

  function turnOff() {
    var backup = null;
    try { backup = JSON.parse(localStorage.getItem(BACKUP)); } catch (e) { backup = null; }
    // 샘플 사진 지우기(진짜 사진은 열쇠가 sample-로 시작하지 않아 건드리지 않는다)
    var walks = [];
    try { walks = JSON.parse(localStorage.getItem('petwalk_walks')) || []; } catch (e) { walks = []; }
    var jobs = walks.map(function (w) { return w && w.photoKey; })
      .filter(function (k) { return k && k.indexOf(PHOTO_PREFIX) === 0; });
    restoreKeys(backup || {});
    try {
      localStorage.removeItem(BACKUP);
      localStorage.removeItem(SPOTS);
      localStorage.removeItem(FLAG);
    } catch (e) { /* 무시 */ }
    if (!window.WalkPhotos) return Promise.resolve();
    return Promise.all(jobs.map(function (k) { return WalkPhotos.remove(k).catch(function () {}); }));
  }

  window.PetwalkSample = { isOn: isOn, turnOn: turnOn, turnOff: turnOff, SPOTS_KEY: SPOTS };
})();
