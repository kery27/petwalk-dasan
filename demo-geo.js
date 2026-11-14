// 시연 모드(가짜 위치) — 2026-11-14, 기획표 V0-08.
// 공원 현장 시연, 화면 캡처, 방송에서 실제 위치(특히 집 근처)가 화면에 나오지 않게 한다.
// CLAUDE.md "개인정보 취급": 스크린샷이 필요하면 가짜 경로로 만든다 — 그 가짜 경로를 만들어 주는 파일.
//
// 켜는 법: 주소 뒤에 ?demo=1 (끄기: ?demo=0 또는 화면 위 배지의 "끄기").
// 켜져 있는 동안 이 탭에서는 navigator.geolocation이 진짜 GPS 대신 다산중앙공원 둘레를 도는
// 가짜 좌표를 돌려준다. 진짜 위치는 읽지 않는다(브라우저 권한 창도 뜨지 않는다).
// 탭을 닫으면 꺼진다(sessionStorage). walk.html·town.html에서 본 스크립트보다 먼저 불러야 한다.
(function () {
  var KEY = 'petwalk_demo_geo';
  var m = /[?&]demo=([01])/.exec(location.search);
  try {
    if (m) {
      if (m[1] === '1') sessionStorage.setItem(KEY, '1'); else sessionStorage.removeItem(KEY);
    }
  } catch (e) { /* sessionStorage를 못 쓰면 주소의 ?demo=1 만으로 판단 */ }
  var on = false;
  try { on = sessionStorage.getItem(KEY) === '1'; } catch (e) { on = !!(m && m[1] === '1'); }
  window.PetwalkDemoGeo = { on: on };
  if (!on || !navigator.geolocation) return;

  // 다산중앙공원(공용 시설, OpenStreetMap 중심점) 둘레 약 130m를 도는 고리 — 누구의 실제 산책 경로도 아니다.
  var CENTER = [37.6233046, 127.1596196];
  var RADIUS_M = 130;
  var SPEED_MPS = 1.2;           // 강아지 산책 걸음
  var M_PER_DEG_LAT = 111320;
  var M_PER_DEG_LNG = 111320 * Math.cos(CENTER[0] * Math.PI / 180);
  var startedAt = Date.now();

  function fakePosition() {
    var t = (Date.now() - startedAt) / 1000;
    var angle = (SPEED_MPS * t) / RADIUS_M;                    // 걸은 거리 / 반지름
    var wobble = 6 * Math.sin(t / 7);                          // 완전한 원이 아니게 살짝 흔든다
    var r = RADIUS_M + wobble;
    return {
      coords: {
        latitude: CENTER[0] + (r * Math.sin(angle)) / M_PER_DEG_LAT,
        longitude: CENTER[1] + (r * Math.cos(angle)) / M_PER_DEG_LNG,
        accuracy: 8, altitude: null, altitudeAccuracy: null, heading: null, speed: SPEED_MPS
      },
      timestamp: Date.now()
    };
  }

  var timers = {};
  var nextId = 1;
  var geo = navigator.geolocation;
  var fake = {
    getCurrentPosition: function (success) {
      setTimeout(function () { if (success) success(fakePosition()); }, 150);
    },
    watchPosition: function (success) {
      var id = nextId++;
      setTimeout(function () { if (timers[id] !== undefined && success) success(fakePosition()); }, 150);
      timers[id] = setInterval(function () { if (success) success(fakePosition()); }, 1000);
      return id;
    },
    clearWatch: function (id) {
      if (timers[id] !== undefined) { clearInterval(timers[id]); delete timers[id]; }
    }
  };
  // 브라우저에 따라 메서드가 프로토타입에만 있어 대입이 막힐 수 있으니 defineProperty로 덮는다
  ['getCurrentPosition', 'watchPosition', 'clearWatch'].forEach(function (name) {
    try {
      Object.defineProperty(geo, name, { value: fake[name], configurable: true, writable: true });
    } catch (e) {
      try { geo[name] = fake[name]; } catch (e2) { window.PetwalkDemoGeo.on = false; }
    }
  });

  // 화면 위에 "가짜 위치"임을 항상 표시한다 — 시연 화면을 본 사람이 실제 위치로 오해하지 않게.
  function addBadge() {
    var badge = document.createElement('div');
    badge.setAttribute('role', 'status');
    // 위쪽은 제목·칩, 아래쪽은 산책 버튼이 차지해서 화면 왼쪽 가운데에 둔다(버튼을 가리지 않게)
    badge.style.cssText = 'position:fixed;left:8px;top:46%;' +
      'z-index:9999;display:flex;align-items:center;gap:8px;' +
      'background:#4a3f35;color:#fff;border-radius:999px;padding:5px 6px 5px 12px;' +
      'font:600 12px Pretendard,-apple-system,"Malgun Gothic",sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.25);';
    var text = document.createElement('span');
    text.textContent = '시연 모드 · 가짜 위치';
    var off = document.createElement('button');
    off.type = 'button';
    off.textContent = '끄기';
    off.style.cssText = 'border:none;border-radius:999px;background:#fff;color:#4a3f35;font:inherit;padding:3px 9px;cursor:pointer;';
    off.addEventListener('click', function () {
      try { sessionStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
      location.href = location.pathname; // ?demo=1 을 떼고 다시 연다
    });
    badge.appendChild(text);
    badge.appendChild(off);
    document.body.appendChild(badge);
  }
  if (document.body) addBadge(); else document.addEventListener('DOMContentLoaded', addBadge);
})();
