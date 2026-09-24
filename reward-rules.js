// 산책 보상 규칙 — card-reward.html(카드 그리기)과 index.html(산책 종료 알림)이 같이 쓴다.
// 숫자를 조정할 땐 이 파일만 고치면 된다. (2026-09-24 보상 재도입, PROJECT_CONTEXT.md "결정 번복" 참고)
// 빌드 도구 없이 <script src="reward-rules.js?v=1">로 불러오고 전역 window.RewardRules로 쓴다.
// 이 파일을 고치면 ?v= 번호를 올리고 두 HTML 파일에서 같이 올릴 것(card-shared.js와 같은 캐시 문제).
(function () {
  var FRAME_TIERS = [
    { name: '종이', minWalks: 0,  stops: ['#cbbba5', '#e6dac8', '#cbbba5'], width: 8,  ring: '#d8cbb8' },
    { name: '나무', minWalks: 5,  stops: ['#6f4a2a', '#b98a55', '#8a5f36'], width: 12, ring: '#a0703f' },
    { name: '은',   minWalks: 15, stops: ['#7d858c', '#e3e7ea', '#ffffff', '#e3e7ea', '#7d858c'], width: 14, ring: '#b8c0c6' },
    { name: '금',   minWalks: 30, stops: ['#c99a3a', '#f0cf7a', '#fff6d9', '#f0cf7a', '#c99a3a'], width: 16, ring: '#e2b45a' }
  ];
  var SLOT_RULES = { skill: 1, passive: 3 }; // 칸이 열리는 누적 산책 횟수

  // 공원 두 곳은 OSM 공원 중심 좌표(2026-09-25 확인). 공원 경계를 못 받아와서 반경은 넉넉히 잡음 —
  // 수변공원은 왕숙천을 따라 길게 뻗어 있어 가장자리를 걸으면 놓칠 수 있다.
  // 아울렛은 OSM에 없어서 사용자가 준 네이버 지도 장소(현대프리미엄아울렛 스페이스원, 다산순환로 50) 좌표.
  // pending: true인 장소는 위치가 확정되기 전이라 도장 판정에서 빠진다.
  // 산책 경로 점 중 하나라도 radiusKm 안에 들어오면 방문으로 친다.
  var PLACES = [
    { id: 'outlet',    name: '아울렛',       badge: '#아울렛_발도장',   center: [37.61633, 127.15268], radiusKm: 0.15, kind: 'building' },
    { id: 'central',   name: '다산 중앙공원', badge: '#중앙공원_발도장', center: [37.62330, 127.15962], radiusKm: 0.25, kind: 'park' },
    { id: 'waterside', name: '다산수변공원',  badge: '#수변공원_발도장', center: [37.62396, 127.14529], radiusKm: 0.3,  kind: 'water' }
  ];

  function distanceKm(a, b) {
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * toRad, dLng = (b[1] - a[1]) * toRad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // walks: localStorage petwalk_walks 배열. index.html이 5분/200m 미만 산책을 rewardEligible: false로
  // 저장한다 — 조작 방지 도입(2026-09-25) 전 기록엔 이 값이 없어서 그대로 보상에 넣는다. 발도장은
  // 걷는 속도 구간의 점(stampRoute)으로만 판정하고, stampRoute가 없는 예전 기록만 전체 경로를 쓴다.
  function computeProgress(walks) {
    var eligible = (walks || []).filter(function (w) { return w.rewardEligible !== false; });
    var visited = {};
    eligible.forEach(function (w) {
      (w.stampRoute || w.route || []).forEach(function (p) {
        PLACES.forEach(function (pl) {
          if (!pl.pending && !visited[pl.id] && distanceKm(p, pl.center) <= pl.radiusKm) visited[pl.id] = true;
        });
      });
    });
    var km = eligible.reduce(function (s, w) { return s + (w.distanceKm || 0); }, 0);
    return { walks: eligible.length, km: km, visited: visited };
  }

  function tierFor(walks) {
    var t = FRAME_TIERS[0];
    FRAME_TIERS.forEach(function (tier) { if (walks >= tier.minWalks) t = tier; });
    return t;
  }

  function nextTier(walks) {
    for (var i = 0; i < FRAME_TIERS.length; i++) if (FRAME_TIERS[i].minWalks > walks) return FRAME_TIERS[i];
    return null;
  }

  function nextGoalText(p) {
    var goals = [];
    if (p.walks < SLOT_RULES.skill) goals.push({ left: SLOT_RULES.skill - p.walks, what: '스킬 칸이 열려요' });
    if (p.walks < SLOT_RULES.passive) goals.push({ left: SLOT_RULES.passive - p.walks, what: '특성 칸이 열려요' });
    var nt = nextTier(p.walks);
    if (nt) goals.push({ left: nt.minWalks - p.walks, what: nt.name + ' 테두리가 돼요' });
    goals.sort(function (a, b) { return a.left - b.left; });
    if (goals.length) return '산책 ' + goals[0].left + '회 더 하면 ' + goals[0].what;
    var remaining = PLACES.filter(function (pl) { return !pl.pending && !p.visited[pl.id]; });
    if (remaining.length) return remaining[0].name + '에 가면 새 발도장을 받아요';
    return '모든 보상을 모았어요';
  }

  // 산책 한 번 전후의 진행도를 비교해서 이번에 새로 얻은 보상 문구 목록을 돌려준다.
  function newUnlocks(before, after) {
    var out = [];
    if (before.walks < SLOT_RULES.skill && after.walks >= SLOT_RULES.skill) out.push('스킬 칸이 열렸어요');
    if (before.walks < SLOT_RULES.passive && after.walks >= SLOT_RULES.passive) out.push('특성 칸이 열렸어요');
    var bt = tierFor(before.walks), at = tierFor(after.walks);
    if (at !== bt) out.push(at.name + ' 테두리로 올라갔어요');
    PLACES.forEach(function (pl) {
      if (after.visited[pl.id] && !before.visited[pl.id]) out.push(pl.name + ' 발도장을 받았어요');
    });
    return out;
  }

  window.RewardRules = {
    FRAME_TIERS: FRAME_TIERS,
    SLOT_RULES: SLOT_RULES,
    PLACES: PLACES,
    computeProgress: computeProgress,
    tierFor: tierFor,
    nextTier: nextTier,
    nextGoalText: nextGoalText,
    newUnlocks: newUnlocks
  };
})();
