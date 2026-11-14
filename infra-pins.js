// 동네 시설 핀(인프라 지도) — town.html([동네] 지도), walk.html(산책 화면), infra-builder.html(운영자 입력 도구)이 같이 쓴다.
// 전역 window.InfraPins. 고치면 두 파일의 `infra-pins.js?v=N` 버전을 같이 올릴 것(card-shared.js와 같은 캐시 문제).
//
// 데이터는 두 군데서 온다:
//   1) SEED — 이 파일에 박아둔 공용 시설. 지금은 OpenStreetMap에서 확인된 것만 넣었다(2026-11-14 조회).
//      OSM에는 배변봉투함·음수대·반려견 동반 가게가 없어서 그 세 종류는 비어 있다 — 지어내지 않고 비워둠.
//   2) 운영자가 infra-builder.html에서 직접 찍은 핀 — 이 기기 localStorage에만 저장된다(서버 없음).
//      다른 사람에게도 보이게 하려면 도구의 "코드로 내보내기" 결과를 아래 SEED에 붙여넣고 배포한다.
//
// 개인정보: 여기에는 공용 시설 좌표만 둔다. 사용자 위치는 이 파일에서 읽지도 보내지도 않는다.
(function () {
  // 아이콘은 Phosphor Icons(MIT) regular SVG 경로를 그대로 가져온 것(index.html ICON_PATHS와 같은 방식).
  var CATEGORIES = [
    // 주의 구역(2026-11-14, 기획표 V1-21): 자전거도로 합류, 진드기 풀숲처럼 '늘 조심할 구간'을 운영자가 현장에서 찍는다.
    // 특정 가게를 위험 구역으로 찍지 않는다 — 음식점 주변 닭뼈 다발지는 일부러 뺐다(가게에 협찬을 부탁하게 되므로, 11/14 결정).
    // 이 종류도 SEED는 비워 둔다. 현장에서 확인하지 않은 위험을 지어내지 않는다.
    { key: 'caution', label: '주의 구역', color: '#d98a1f',
      icon: 'M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z' },
    { key: 'bag', label: '배변봉투함', color: '#8a6a3b',
      icon: 'M216,48H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM192,208H64V64H192ZM80,24a8,8,0,0,1,8-8h80a8,8,0,0,1,0,16H88A8,8,0,0,1,80,24Z' },
    { key: 'water', label: '음수대', color: '#3b7dc4',
      icon: 'M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Zm55.89-62.66a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z' },
    { key: 'spot', label: '동반 스팟', color: '#b8563a',
      icon: 'M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Zm96,56v8a40,40,0,0,1-37.51,39.91,96.59,96.59,0,0,1-27,40.09H208a8,8,0,0,1,0,16H32a8,8,0,0,1,0-16H56.54A96.3,96.3,0,0,1,24,136V88a8,8,0,0,1,8-8H208A40,40,0,0,1,248,120ZM200,96H40v40a80.27,80.27,0,0,0,45.12,72h69.76A80.27,80.27,0,0,0,200,136Zm32,24a24,24,0,0,0-16-22.62V136a95.78,95.78,0,0,1-1.2,15A24,24,0,0,0,232,128Z' },
    { key: 'vet', label: '동물병원', color: '#c2453f',
      icon: 'M216,88H168V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V88H40a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16H88v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V168h48a16,16,0,0,0,16-16V104A16,16,0,0,0,216,88Zm0,64H160a8,8,0,0,0-8,8v56H104V160a8,8,0,0,0-8-8H40V104H96a8,8,0,0,0,8-8V40h48V96a8,8,0,0,0,8,8h56Z' },
    { key: 'toilet', label: '화장실', color: '#6b5d9e',
      icon: 'M120,64a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h16A8,8,0,0,1,120,64Zm52.32,133.14,3.52,24.6A16,16,0,0,1,160,240H96a16,16,0,0,1-15.84-18.26l3.52-24.6A96.09,96.09,0,0,1,32,112a8,8,0,0,1,8-8H56V40A16,16,0,0,1,72,24H184a16,16,0,0,1,16,16v64h16a8,8,0,0,1,8,8A96.09,96.09,0,0,1,172.32,197.14ZM72,104H184V40H72Zm85.07,99.5a96.15,96.15,0,0,1-58.14,0L96,224h64ZM207.6,120H48.4a80,80,0,0,0,159.2,0Z' },
    { key: 'park', label: '공원·쉼터', color: '#4f7d4a',
      icon: 'M198.1,62.59a76,76,0,0,0-140.2,0A71.71,71.71,0,0,0,16,127.8C15.9,166,48,199,86.14,200A72.09,72.09,0,0,0,120,192.47V232a8,8,0,0,0,16,0V192.47A72.17,72.17,0,0,0,168,200l1.82,0C208,199,240.11,166,240,127.8A71.71,71.71,0,0,0,198.1,62.59ZM169.45,184a56.08,56.08,0,0,1-33.45-10v-41l43.58-21.78a8,8,0,1,0-7.16-14.32L136,115.06V88a8,8,0,0,0-16,0v51.06L83.58,120.84a8,8,0,1,0-7.16,14.32L120,156.94v17a56,56,0,0,1-33.45,10C56.9,183.23,31.92,157.52,32,127.84A55.77,55.77,0,0,1,67.11,76a8,8,0,0,0,4.53-4.67,60,60,0,0,1,112.72,0A8,8,0,0,0,188.89,76,55.79,55.79,0,0,1,224,127.84C224.08,157.52,199.1,183.23,169.45,184Z' }
  ];

  // source: 'osm' = OpenStreetMap에서 가져온 것(현장 확인 전), 'field' = 운영자가 직접 가서 확인한 것.
  // 좌표는 OSM 요소의 중심점이라 넓은 공원은 입구가 아니라 한가운데에 찍힌다.
  var SEED = [
    { id: 'osm-park-1', cat: 'park', name: '다산중앙공원', lat: 37.6233046, lng: 127.1596196, source: 'osm' },
    { id: 'osm-park-2', cat: 'park', name: '다산선형공원', lat: 37.6240973, lng: 127.1513160, source: 'osm' },
    { id: 'osm-park-3', cat: 'park', name: '다산수변공원', lat: 37.6239616, lng: 127.1452944, source: 'osm' },
    { id: 'osm-park-4', cat: 'park', name: '다산체육공원', lat: 37.6165450, lng: 127.1487585, source: 'osm' },
    { id: 'osm-park-5', cat: 'park', name: '도농생태유수지', lat: 37.6127701, lng: 127.1500020, source: 'osm' },
    { id: 'osm-park-6', cat: 'park', name: '모두랑근린공원', lat: 37.6295569, lng: 127.1493806, source: 'osm' },
    { id: 'osm-park-7', cat: 'park', name: '남양주자연체험공원', lat: 37.6321685, lng: 127.1506601, source: 'osm' },
    { id: 'osm-park-8', cat: 'park', name: '왕숙천교 아래 쉼터', lat: 37.6171049, lng: 127.1465061, source: 'osm' },
    { id: 'osm-park-9', cat: 'park', name: '왕숙천2교 아래 쉼터', lat: 37.6133177, lng: 127.1483133, source: 'osm' },
    { id: 'osm-toilet-1', cat: 'toilet', name: '공중화장실', lat: 37.6204898, lng: 127.1424382, source: 'osm' },
    { id: 'osm-toilet-2', cat: 'toilet', name: '공중화장실', lat: 37.6228246, lng: 127.1418633, source: 'osm' },
    { id: 'osm-toilet-3', cat: 'toilet', name: '공중화장실', lat: 37.6306934, lng: 127.1448747, source: 'osm' },
    { id: 'osm-vet-1', cat: 'vet', name: '부영동물병원', lat: 37.60844, lng: 127.16264, note: '진료 시간은 확인 전이에요. 가기 전에 전화로 확인하세요.', source: 'osm' },
    { id: 'osm-vet-2', cat: 'vet', name: '폭시팻동물병원', lat: 37.61297, lng: 127.14099, note: '진료 시간은 확인 전이에요. 가기 전에 전화로 확인하세요.', source: 'osm' },
    { id: 'osm-vet-3', cat: 'vet', name: '래플즈동물병원', lat: 37.60969, lng: 127.13675, note: '진료 시간은 확인 전이에요. 가기 전에 전화로 확인하세요.', source: 'osm' }
  ];

  var CUSTOM_KEY = 'petwalk_infra_custom';

  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; } catch (e) { return []; }
  }
  function saveCustom(pins) {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(pins)); return true; } catch (e) { return false; }
  }
  // 이 기기에서 고친 내용(운영자)과 배포본(SEED)을 합친다(2026-11-14 관리자 모드).
  //  - 같은 id가 이 기기에 있으면 그쪽이 이긴다(배포본 핀을 고친 것).
  //  - deleted: true 는 "이 핀은 뺀다"는 표시다(배포본 핀을 지운 것).
  // 지도 화면들은 all()만 쓰면 되고, 관리 도구는 allWithState()로 어디서 온 핀인지까지 본다.
  function allWithState() {
    var custom = loadCustom();
    var byId = {};
    custom.forEach(function (p) { if (p && p.id) byId[p.id] = p; });
    var out = [];
    SEED.forEach(function (p) {
      var o = byId[p.id];
      if (o) { delete byId[p.id]; if (!o.deleted) out.push({ pin: o, state: 'edited' }); }
      else out.push({ pin: p, state: 'seed' });
    });
    custom.forEach(function (p) {
      if (p && p.id && byId[p.id] && !p.deleted) out.push({ pin: p, state: 'new' });
    });
    return out;
  }
  function all() { return allWithState().map(function (x) { return x.pin; }); }

  // ── 가게 수호지킴이(2026-11-14 가르시아) ──
  // 단골 가게를 지키는 강아지. 동반 스팟 핀에 guardian: { name, signal, photo, line } 으로 붙는다.
  // 가게 주인이 알려 주고 올려도 된다고 한 것만 운영자가 넣는다 — 남의 강아지 사진을 허락 없이 올리지 않는다.
  var SIGNALS = {
    green:  { label: '초록불', line: '다가와도 좋아요', color: '#3f9b5b' },
    yellow: { label: '노랑불', line: '천천히 인사해요', color: '#dfa21f' },
    red:    { label: '빨강불', line: '눈으로만 예뻐해 주세요', color: '#d2493f' }
  };
  function hasGuardian(pin) { return !!(pin && pin.guardian && pin.guardian.name); }

  // 팝업에 넣는 수호지킴이 칸(DOM). 지도 화면마다 CSS를 복사하지 않게 인라인 스타일로 만든다.
  function guardianEl(pin) {
    if (!hasGuardian(pin)) return null;
    var g = pin.guardian;
    var sig = SIGNALS[g.signal];
    var box = document.createElement('div');
    box.style.cssText = 'display:flex;align-items:center;gap:10px;margin:4px 0;padding:8px;border-radius:12px;background:#f3ddd2;';
    var face = document.createElement('div');
    face.style.cssText = 'flex-shrink:0;width:46px;height:46px;border-radius:50%;overflow:hidden;background:#fffaf3;' +
      'border:3px solid ' + (sig ? sig.color : '#e6d6c1') + ';';
    if (g.photo) {
      var img = document.createElement('img');
      img.src = g.photo;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      face.appendChild(img);
    }
    var text = document.createElement('div');
    text.style.cssText = 'min-width:0;';
    var title = document.createElement('div');
    title.style.cssText = 'font-size:11px;font-weight:700;color:#b8563a;';
    title.textContent = '수호지킴이';
    var name = document.createElement('div');
    name.style.cssText = 'font-size:14px;font-weight:800;color:#4a3f35;';
    name.textContent = g.name;
    text.appendChild(title);
    text.appendChild(name);
    if (sig || g.line) {
      var line = document.createElement('div');
      line.style.cssText = 'font-size:11px;color:#6b5d4e;';
      line.textContent = [sig ? sig.label + ' · ' + sig.line : '', g.line || ''].filter(Boolean).join(' · ');
      text.appendChild(line);
    }
    var link = document.createElement('a');
    link.href = 'start.html?guardian=' + encodeURIComponent(pin.id);
    link.textContent = '주민증 보기';
    link.style.cssText = 'display:inline-block;margin-top:2px;font-size:12px;font-weight:700;color:#b8563a;text-decoration:none;';
    text.appendChild(link);
    box.appendChild(face);
    box.appendChild(text);
    return box;
  }

  function category(key) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].key === key) return CATEGORIES[i];
    return null;
  }

  function iconSvg(key, size) {
    var c = category(key);
    if (!c) return '';
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + c.icon + '"/></svg>';
  }

  // 지도 마커용 HTML — 두 화면에 같은 CSS를 복사하지 않으려고 인라인 스타일로 만든다.
  function markerHtml(key) {
    var c = category(key);
    if (!c) return '';
    return '<div style="width:28px;height:28px;border-radius:50%;background:' + c.color +
      ';color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff;' +
      'box-shadow:0 2px 6px rgba(74,63,53,0.35);">' + iconSvg(key, 15) + '</div>';
  }

  function sourceText(pin) {
    if (pin.source === 'field') return '직접 확인' + (pin.verifiedAt ? ' · ' + pin.verifiedAt : '');
    return 'OpenStreetMap 기준 · 현장 확인 전';
  }

  window.InfraPins = {
    CATEGORIES: CATEGORIES, SEED: SEED, CUSTOM_KEY: CUSTOM_KEY,
    loadCustom: loadCustom, saveCustom: saveCustom, all: all, allWithState: allWithState,
    SIGNALS: SIGNALS, hasGuardian: hasGuardian, guardianEl: guardianEl,
    category: category, iconSvg: iconSvg, markerHtml: markerHtml, sourceText: sourceText
  };
})();
