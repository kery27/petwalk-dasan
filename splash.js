// 왈슨 시작 화면(2026-11-14) — #splash를 2초 보여 주고 서서히 지운다. 누르면 바로 넘어간다.
// 같은 세션에서 두 번째로 열 때는 <head>의 한 줄짜리 스크립트가 .no-splash를 붙여 처음부터 안 보인다.
// 쓰는 화면: index.html([오늘], 앱 첫 화면), start.html(공원 QR 첫 화면). 둘 다 같은 세션 표시를 써서 한 번만.
(function () {
  var KEY = 'walson_splash_shown';
  var SHOW_MS = 2000;
  var el = document.getElementById('splash');
  if (!el) return;
  if (document.documentElement.classList.contains('no-splash')) { el.remove(); return; }
  try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* 다음에 또 보일 뿐 */ }
  var done = false;
  function leave() {
    if (done) return;
    done = true;
    el.classList.add('is-leaving');
    setTimeout(function () { el.remove(); }, 500);
  }
  el.addEventListener('click', leave);
  setTimeout(leave, SHOW_MS);
})();
