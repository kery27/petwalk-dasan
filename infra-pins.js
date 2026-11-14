// 동네 스팟(시설·가게·주의 구역) — town.html([동네]), walk.html(산책 화면), start.html(수호지킴이 카드),
// tools/spots.html(운영자 관리 도구)이 같이 쓴다. 전역 window.InfraPins.
// 고치면 쓰는 화면들의 `infra-pins.js?v=N` 버전을 같이 올릴 것(card-shared.js와 같은 캐시 문제).
//
// 데이터는 spots-data.js(window.PETWALK_SPOTS)에서 온다 — 이 파일보다 먼저 불러야 한다(2026-11-14).
// spots-data.js는 운영자 컴퓨터의 관리 도구가 저장하고, "모두에게 반영"을 누르면 배포된다.
// 예전처럼 휴대폰 안(localStorage)에 따로 고쳐 둔 내용은 더 이상 읽지 않는다.
//
// 개인정보: 공용 시설과 가게 좌표만 둔다. 사용자 위치는 이 파일에서 읽지도 보내지도 않는다.
(function () {
  // 아이콘은 Phosphor Icons(MIT) regular SVG 경로를 그대로 가져온 것(walk.html ICON_PATHS와 같은 방식).
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
  // 샘플 데이터로 보는 중이면(sample-data.js) 이 휴대폰에만 있는 샘플 가게를 더한다
  var sampleSpots = [];
  try {
    if (localStorage.getItem('petwalk_sample_mode') === '1') sampleSpots = JSON.parse(localStorage.getItem('petwalk_sample_spots')) || [];
  } catch (e) { sampleSpots = []; }
  var SEED = (window.PETWALK_SPOTS || []).concat(sampleSpots).filter(function (p) {
    return p && p.id && typeof p.lat === 'number' && typeof p.lng === 'number';
  });
  function all() { return SEED.slice(); }

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

  // 종류 아이콘만 있는 동그란 마커 HTML. 화면마다 CSS를 복사하지 않으려고 인라인 스타일.
  function markerHtml(key, px) {
    var c = category(key);
    if (!c) return '';
    px = px || 28;
    return '<div style="width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:' + c.color +
      ';color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff;' +
      'box-shadow:0 2px 6px rgba(74,63,53,0.35);">' + iconSvg(key, Math.round(px * 0.54)) + '</div>';
  }

  function sourceText(pin) {
    if (pin.source === 'field') return '직접 확인' + (pin.verifiedAt ? ' · ' + pin.verifiedAt : '');
    return 'OpenStreetMap 기준 · 현장 확인 전';
  }

  // ── 가게 수호지킴이(2026-11-14 가르시아): 단골 가게를 지키는 강아지 ──
  // 동반 스팟에 guardian: { name, signal, photo, line } 으로 붙는다. photo는 spots/photos/의 파일 경로.
  // 가게 주인이 알려 주고 올려도 된다고 한 것만 운영자가 넣는다.
  var SIGNALS = {
    green:  { label: '초록불', line: '다가와도 좋아요', color: '#3f9b5b' },
    yellow: { label: '노랑불', line: '천천히 인사해요', color: '#dfa21f' },
    red:    { label: '빨강불', line: '눈으로만 예뻐해 주세요', color: '#d2493f' }
  };
  function hasGuardian(pin) { return !!(pin && pin.guardian && pin.guardian.name); }
  // 지도에 내세울 사진 — 수호지킴이 사진이 먼저, 없으면 가게 사진
  function mainPhoto(pin) {
    if (hasGuardian(pin) && pin.guardian.photo) return pin.guardian.photo;
    return pin.photo || null;
  }
  function escapeAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function escapeText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // 지도 마커(2026-11-14): 동네 스타(동반 스팟)를 앞에 세운다.
  //  - 사진이 있는 동반 스팟: 큰 동그라미 사진 + 이름표(수호지킴이 이름). 테두리는 신호등 색.
  //  - 사진 없는 동반 스팟: 큰 종류 아이콘.
  //  - 나머지 시설: 작고 옅게 — 배경 정보로 둔다.
  // 돌려주는 값: { icon: L.divIcon 옵션, zIndexOffset }
  function markerFor(pin) {
    var photo = mainPhoto(pin);
    if (pin.cat === 'spot' && photo) {
      var sig = hasGuardian(pin) ? SIGNALS[pin.guardian.signal] : null;
      var ring = sig ? sig.color : '#b8563a';
      var label = hasGuardian(pin) ? pin.guardian.name : (pin.name || '');
      var html =
        '<div style="position:relative;width:58px;height:58px;">' +
          '<div style="width:58px;height:58px;border-radius:50%;overflow:hidden;border:4px solid ' + ring + ';' +
            'background:#f3ddd2;box-shadow:0 4px 12px rgba(74,63,53,0.4);box-sizing:border-box;">' +
            '<img src="' + escapeAttr(photo) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">' +
          '</div>' +
          '<div style="position:absolute;left:50%;top:60px;transform:translateX(-50%);white-space:nowrap;' +
            'background:#fffaf3;color:#4a3f35;border:1px solid #e6d6c1;border-radius:999px;padding:1px 8px;' +
            'font:800 12px Pretendard,-apple-system,sans-serif;box-shadow:0 2px 6px rgba(74,63,53,0.2);">' +
            escapeText(label) + '</div>' +
        '</div>';
      return { icon: { className: '', html: html, iconSize: [58, 58], iconAnchor: [29, 29], popupAnchor: [0, -28] }, zIndexOffset: 1000 };
    }
    if (pin.cat === 'spot') {
      return { icon: { className: '', html: markerHtml('spot', 40), iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -18] }, zIndexOffset: 800 };
    }
    return { icon: { className: '', html: '<div style="opacity:0.82">' + markerHtml(pin.cat, 24) + '</div>', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -10] }, zIndexOffset: 0 };
  }

  // 팝업(2026-11-14): 사진이 있으면 사진을 가운데에 크게 세운다. 지도 화면들이 같이 쓴다.
  // 쓰는 법: L.marker(...).bindPopup(InfraPins.popupEl(pin), InfraPins.POPUP_OPTS)
  var POPUP_OPTS = { minWidth: 230, maxWidth: 260 };
  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }
  function popupEl(pin) {
    var cat = category(pin.cat) || { label: '', color: '#6b5d4e' };
    var wrap = el('div', 'display:flex;flex-direction:column;gap:5px;font:13px/1.45 Pretendard,-apple-system,"Malgun Gothic",sans-serif;color:#4a3f35;');
    var photo = mainPhoto(pin);
    var g = hasGuardian(pin) ? pin.guardian : null;
    var sig = g ? SIGNALS[g.signal] : null;

    if (photo) {
      var frame = el('div', 'position:relative;margin:-2px -2px 4px;border-radius:14px;overflow:hidden;background:#f3ddd2;' +
        'aspect-ratio:1/1;' + (sig ? 'box-shadow:inset 0 -6px 0 ' + sig.color + ';' : ''));
      var img = el('img', 'width:100%;height:100%;object-fit:cover;display:block;');
      img.src = photo;
      img.alt = g ? g.name : (pin.name || '');
      frame.appendChild(img);
      if (g) {
        frame.appendChild(el('div', 'position:absolute;left:8px;top:8px;background:rgba(255,250,243,0.92);color:#b8563a;' +
          'border-radius:999px;padding:2px 9px;font-size:11px;font-weight:800;', '수호지킴이'));
      }
      wrap.appendChild(frame);
    }
    if (g) {
      wrap.appendChild(el('div', 'font-size:20px;font-weight:800;letter-spacing:-0.01em;', g.name));
      if (sig) wrap.appendChild(el('div', 'font-size:12px;font-weight:700;color:' + sig.color + ';', sig.label + ' · ' + sig.line));
      if (g.line) wrap.appendChild(el('div', 'font-size:13px;', '“' + g.line + '”'));
      var shop = el('div', 'font-size:13px;color:#6b5d4e;margin-top:2px;');
      shop.appendChild(el('span', 'font-weight:700;color:' + cat.color + ';', cat.label));
      shop.appendChild(document.createTextNode(' · ' + (pin.name || '')));
      wrap.appendChild(shop);
    } else {
      wrap.appendChild(el('div', 'font-size:11px;font-weight:700;color:' + cat.color + ';', cat.label));
      wrap.appendChild(el('div', 'font-size:' + (photo ? 18 : 14) + 'px;font-weight:800;', pin.name || cat.label));
    }
    if (pin.tags && pin.tags.length) {
      var tags = el('div', 'display:flex;flex-wrap:wrap;gap:4px;');
      pin.tags.forEach(function (t) {
        tags.appendChild(el('span', 'font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px;background:#efe0cd;', t));
      });
      wrap.appendChild(tags);
    }
    if (pin.note) wrap.appendChild(el('div', '', pin.note));
    // 출처를 항상 보여 준다 — 직접 확인하지 않은 정보를 확인된 것처럼 보이게 하지 않기 위함
    wrap.appendChild(el('div', 'font-size:11px;color:#6b5d4e;', sourceText(pin)));

    var links = el('div', 'display:flex;flex-wrap:wrap;gap:12px;margin-top:2px;');
    var linkCss = 'font-size:12px;font-weight:700;color:#b8563a;text-decoration:none;';
    if (g) {
      var card = el('a', linkCss, '주민증 보기');
      card.href = 'start.html?guardian=' + encodeURIComponent(pin.id);
      links.appendChild(card);
    }
    // 길찾기는 카카오맵 웹 링크 — 넘기는 건 이 장소의 이름·좌표뿐이고 내 위치는 넣지 않는다
    var nav = el('a', linkCss, '길찾기');
    nav.href = 'https://map.kakao.com/link/to/' + encodeURIComponent(pin.name || cat.label) + ',' + pin.lat + ',' + pin.lng;
    nav.target = '_blank';
    nav.rel = 'noopener';
    links.appendChild(nav);
    if (pin.phone) {
      var tel = el('a', linkCss, '전화 걸기');
      tel.href = 'tel:' + String(pin.phone).replace(/[^0-9+]/g, '');
      links.appendChild(tel);
    }
    wrap.appendChild(links);
    return wrap;
  }

  // 운영자 컴퓨터에서 연 화면인지(관리 도구 링크를 보일지). 배포된 사이트에서는 항상 false.
  function isLocalAdmin() {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  }

  window.InfraPins = {
    CATEGORIES: CATEGORIES, SEED: SEED, all: all,
    category: category, iconSvg: iconSvg, markerHtml: markerHtml, markerFor: markerFor, sourceText: sourceText,
    SIGNALS: SIGNALS, hasGuardian: hasGuardian, mainPhoto: mainPhoto,
    popupEl: popupEl, POPUP_OPTS: POPUP_OPTS, isLocalAdmin: isLocalAdmin
  };
})();
