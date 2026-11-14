// 하단 탭(2026-11-14, 화면 구조 C안 — 기획표 V0-04): [오늘] [기록] [카드] [동네].
// '산책'은 탭이 아니라 모드라서 산책 화면(walk.html)에는 이 탭을 붙이지 않는다.
// 쓰는 법: 화면 맨 아래에 <script src="tabbar.js?v=1" data-tab="today|history|card|town"></script>
// 탭 높이만큼 body 아래 여백을 넣고, 높이를 CSS 변수 --tabbar-h로 알려 준다(지도 화면이 그만큼 비켜 앉게).
// 고치면 네 화면(index·walk-history·my-card·town)의 ?v= 번호를 같이 올릴 것.
(function () {
  var current = (document.currentScript && document.currentScript.getAttribute('data-tab')) || '';
  // 아이콘은 Phosphor Icons(MIT) regular — walk.html의 ICON_PATHS와 같은 것
  var TABS = [
    { key: 'today', label: '오늘', href: 'index.html', icon: 'M212,80a28,28,0,1,0,28,28A28,28,0,0,0,212,80Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,212,120ZM72,108a28,28,0,1,0-28,28A28,28,0,0,0,72,108ZM44,120a12,12,0,1,1,12-12A12,12,0,0,1,44,120ZM92,88A28,28,0,1,0,64,60,28,28,0,0,0,92,88Zm0-40A12,12,0,1,1,80,60,12,12,0,0,1,92,48Zm72,40a28,28,0,1,0-28-28A28,28,0,0,0,164,88Zm0-40a12,12,0,1,1-12,12A12,12,0,0,1,164,48Zm23.12,100.86a35.3,35.3,0,0,1-16.87-21.14,44,44,0,0,0-84.5,0A35.25,35.25,0,0,1,69,148.82,40,40,0,0,0,88,224a39.48,39.48,0,0,0,15.52-3.13,64.09,64.09,0,0,1,48.87,0,40,40,0,0,0,34.73-72ZM168,208a24,24,0,0,1-9.45-1.93,80.14,80.14,0,0,0-61.19,0,24,24,0,0,1-20.71-43.26,51.22,51.22,0,0,0,24.46-30.67,28,28,0,0,1,53.78,0,51.27,51.27,0,0,0,24.53,30.71A24,24,0,0,1,168,208Z' },
    { key: 'history', label: '기록', href: 'walk-history.html', icon: 'M208.06,184H152a8,8,0,0,0-8,8v12a36,36,0,0,0,72.05,0V192A8,8,0,0,0,208.06,184Zm-8,20a20,20,0,0,1-40,0v-4h40ZM104,160h-56a8,8,0,0,0-8,8v12A36,36,0,0,0,112,180V168A8,8,0,0,0,104,160Zm-8,20a20,20,0,0,1-40,0v-4H96ZM76,16C64.36,16,53.07,26.31,44.2,45c-13.93,29.38-18.56,73,.29,96a8,8,0,0,0,6.2,2.93h50.55a8,8,0,0,0,6.2-2.93c18.85-23,14.22-66.65.29-96C98.85,26.31,87.57,16,76,16ZM97.15,128H54.78c-11.4-18.1-7.21-52.7,3.89-76.11C65.14,38.22,72.17,32,76,32s10.82,6.22,17.3,19.89C104.36,75.3,108.55,109.9,97.15,128Zm57.61,40h50.55a8,8,0,0,0,6.2-2.93c18.85-23,14.22-66.65.29-96C202.93,50.31,191.64,40,180,40s-22.89,10.31-31.77,29c-13.93,29.38-18.56,73,.29,96A8.05,8.05,0,0,0,154.76,168Zm8-92.11C169.22,62.22,176.25,56,180,56s10.82,6.22,17.29,19.89c11.1,23.41,15.29,58,3.9,76.11H158.85C147.45,133.9,151.64,99.3,162.74,75.89Z' },
    { key: 'card', label: '카드', href: 'my-card.html', icon: 'M216,96A88,88,0,1,0,72,163.83V240a8,8,0,0,0,11.58,7.16L128,225l44.43,22.21A8.07,8.07,0,0,0,176,248a8,8,0,0,0,8-8V163.83A87.85,87.85,0,0,0,216,96ZM56,96a72,72,0,1,1,72,72A72.08,72.08,0,0,1,56,96ZM168,227.06l-36.43-18.21a8,8,0,0,0-7.16,0L88,227.06V174.37a87.89,87.89,0,0,0,80,0ZM128,152A56,56,0,1,0,72,96,56.06,56.06,0,0,0,128,152Zm0-96A40,40,0,1,1,88,96,40,40,0,0,1,128,56Z' },
    { key: 'town', label: '동네', href: 'town.html', icon: 'M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z' }
  ];

  var style = document.createElement('style');
  style.textContent =
    ':root{--tabbar-h:calc(58px + env(safe-area-inset-bottom, 0px));}' +
    'body{padding-bottom:calc(var(--tabbar-h) + 16px) !important;}' +
    '.tabbar{position:fixed;left:0;right:0;bottom:0;z-index:1000;display:flex;justify-content:center;' +
      'height:var(--tabbar-h);padding-bottom:env(safe-area-inset-bottom, 0px);' +
      'background:#fffaf3;border-top:1px solid #e6d6c1;box-shadow:0 -2px 12px rgba(74,63,53,0.08);}' +
    '.tabbar a{flex:1;max-width:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;' +
      'text-decoration:none;color:#8a7a68;font:600 11px Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;' +
      '-webkit-tap-highlight-color:transparent;}' +
    '.tabbar a[aria-current="page"]{color:#b8563a;font-weight:800;}' +
    '.tabbar a:active{transform:scale(0.96);}';
  document.head.appendChild(style);

  function build() {
    var nav = document.createElement('nav');
    nav.className = 'tabbar';
    nav.setAttribute('aria-label', '주요 화면');
    TABS.forEach(function (t) {
      var a = document.createElement('a');
      a.href = t.href;
      if (t.key === current) a.setAttribute('aria-current', 'page');
      a.innerHTML = '<svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + t.icon + '"/></svg>';
      var label = document.createElement('span');
      label.textContent = t.label;
      a.appendChild(label);
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
