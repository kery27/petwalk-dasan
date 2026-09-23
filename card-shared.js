// 산책 카드 시안들이 공유하는 데이터/로직.
// 여러 시안(card.html, card-keyring.html, ...)이 각자 다른 레이아웃을 그리지만,
// 스킬/패시브 문구 카탈로그와 텍스트 줄바꿈·드래그 같은 로직까지 매번 복사하면
// 하나 고칠 때 다른 파일에서 깜빡하고 놓치는 사고가 나기 쉬워서 여기로 뺐다.
// 빌드 도구 없이 <script src="card-shared.js"></script> 로만 불러 쓴다 (전역 CardShared 객체).
(function (global) {
  'use strict';

  var FILTER_MAP = {
    pastel: 'saturate(1.15) brightness(1.08) contrast(0.96) sepia(0.08)',
    holo: 'saturate(1.4) contrast(1.1) hue-rotate(15deg) brightness(1.05)',
    vivid: 'saturate(1.6) contrast(1.15)',
    none: 'none'
  };

  // 이모지를 OS 기본 폰트가 아니라 Twemoji 그림체로 통일해서 쓴다 (플랫폼마다 이모지 모양이
  // 달라지는 문제 때문 — 2026-08-26 논의). jsdelivr가 CORS(Access-Control-Allow-Origin: *)를
  // 열어주는 걸 확인했으므로, crossOrigin='anonymous'로 불러오면 "카드 이미지 저장"(canvas.toBlob)이
  // 캔버스 오염(taint) 때문에 막히지 않는다. 이 파일을 쓰는 각 카드 HTML은 <head>보다 먼저
  // twemoji.min.js를 <script src>로 불러와야 한다 (정확한 코드포인트 계산에 필요).
  var TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/';
  var emojiCache = {};

  function preloadEmoji(chars, onEachLoaded) {
    chars.forEach(function (ch) {
      if (emojiCache[ch]) return;
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { if (onEachLoaded) onEachLoaded(ch); };
      var codepoint = global.twemoji.convert.toCodePoint(ch);
      // twemoji.convert.toCodePoint()가 만드는 코드포인트에 변형 선택자(-fe0f)가 붙어있어도,
      // 실제 CDN에 있는 파일명에는 그게 빠져있는 경우가 있다 (예: ❤️ → 2764-fe0f가 아니라
      // 2764.svg). 처음 시도가 404면 -fe0f 뗀 이름으로 한 번 더 시도한다 (재시도는 한 번만).
      var strippedCodepoint = codepoint.replace('-fe0f', '');
      var retried = false;
      img.onerror = function () {
        if (retried || strippedCodepoint === codepoint) return;
        retried = true;
        img.src = TWEMOJI_BASE + strippedCodepoint + '.svg';
      };
      img.src = TWEMOJI_BASE + codepoint + '.svg';
      emojiCache[ch] = img;
    });
  }

  function getEmojiImage(ch) { return emojiCache[ch] || null; }
  function emojiReady(ch) {
    var img = emojiCache[ch];
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  // 이모지 이미지 + 텍스트를 한 줄로 이어 그린다 (fillText 하나로는 이모지를 못 그려서 —
  // 이모지 이미지 폭을 직접 계산해 텍스트 앞에 배치). 이모지가 아직 로딩 전이면 텍스트만
  // 그리고, 로딩이 끝나면(preloadEmoji의 onEachLoaded) 다시 그려서 자연스럽게 나타나게 한다.
  // opts: { emoji, text, x, y, font, color, size, gap, align:'left'|'center', baseline:'top'|'middle' }
  function drawEmojiLine(ctx, opts) {
    var gap = opts.gap != null ? opts.gap : 6;
    ctx.font = opts.font;
    var ready = emojiReady(opts.emoji);
    var reserve = ready ? opts.size + gap : 0;
    var textWidth = ctx.measureText(opts.text).width;
    var startX = opts.align === 'center' ? opts.x - (reserve + textWidth) / 2 : opts.x;
    if (ready) {
      var imgY = opts.baseline === 'middle' ? opts.y - opts.size / 2 : opts.y;
      ctx.drawImage(getEmojiImage(opts.emoji), startX, imgY, opts.size, opts.size);
    }
    ctx.fillStyle = opts.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = opts.baseline || 'top';
    ctx.fillText(opts.text, startX + reserve, opts.y);
  }

  // 사용자가 제안한 B급 감성 스킬 목록 — 카드 생성 시 드롭다운으로 고르거나 직접 입력한다
  var SKILLS = [
    { category: '생존 & 간식 계열', title: '식탁 밑 아련한 눈빛 빔 (소모 HP: 0)', desc: '사람이 밥 먹을 때 턱을 무릎에 얹고 불쌍함 스탯을 최대로 끌어올린다. (고기 한 점 획득 확률 88%)' },
    { category: '생존 & 간식 계열', title: '귀신같은 비닐 소리 감지 (쿨타임: 0초)', desc: '아무리 깊은 잠에 빠져 있어도 간식 비닐 소리가 나는 순간 0.1초 만에 눈을 번쩍 뜬다.' },
    { category: '생존 & 간식 계열', title: '수제간식점 앞 얼음 놀이 (지속 시간: 보호자 설득 전까지)', desc: '단골 간식집 문 앞을 지나갈 때 발바닥에 접착제를 바른 듯 문 앞에 멈춰 선다.' },
    { category: '산책 & 행동 계열', title: '천사표 얼굴로 배변 포즈 (보호자 민망함 +50)', desc: '산책 중 세상에서 가장 무해하고 아련한 눈빛으로 보호자를 응시하며 응가 포즈를 잡는다.' },
    { category: '산책 & 행동 계열', title: '3초 멈칫 냄새 탐정 (속도: -100%)', desc: '산책 중 맘에 드는 풀숲을 발견하면 보호자를 3분간 자리에 얼음으로 만든다.' },
    { category: '산책 & 행동 계열', title: '배달 오토바이 레이더 (방어력: +30)', desc: '라이더 삼촌 오토바이 소리가 단지 입구에 들어서는 순간 컹컹 경보를 울린다.' },
    { category: '일상 & 앙탈 계열', title: '빗질 거부 온몸 비틀기 (회피율: +99%)', desc: '슬리커 빗만 들면 뼈가 없는 오징어로 변신하여 손가락 사이로 탈출한다.' },
    { category: '일상 & 앙탈 계열', title: '발톱 깎기 소파 밑 침투 (은신 기술)', desc: '바리깡 소리가 들리는 순간 빛의 속도로 소파 밑 가장 어두운 구석으로 침투한다.' }
  ];

  var PASSIVES = [
    { title: '선택적 귓등 듣기', desc: '"간식", "산책" 소리엔 0.1초 만에 반응하지만, "안돼", "기다려"는 주파수가 안 맞는다며 무시함.' },
    { title: '목욕 후 미친개 모드', desc: '목욕을 마치고 털을 말리는 순간 억울함이 폭발하여 온 거실 이불을 핥으며 미친 듯이 슬라이딩함.' },
    { title: '남의 떡이 더 커 보임', desc: '똑같은 간식을 줘도 꼭 다른 친구 강아지 입에 물린 간식을 아련하게 바라봄.' },
    { title: '새 옷 착용 시 1초 멘붕', desc: '예쁜 파스텔 옷을 입혀놓으면 고장 난 로봇처럼 제자리에 굳어서 움직이지 않음.' },
    { title: '침대 중앙 점령권', desc: "같이 잘 때 정중앙에 'T'자로 누워 보호자를 침대 구석으로 밀어냄." },
    { title: '비 오면 발에 물 묻히기 싫음', desc: '산책 나가자고 떼써서 나갔더니 현관문 앞 빗물 보고 0.5초 만에 안아달라고 칭얼거림.' },
    { title: '발바닥 고소함 MAX', desc: '꼬질꼬질한 꼬꼬마 발바닥에서 구수한 옥수수 칩 냄새가 진동함.' },
    { title: '터그놀이 집착증', desc: '실타래 토이를 물려주면 목을 꺾어가며 으르렁대지만 기분은 최고조임.' },
    { title: '배변패드 모서리 슛', desc: '정중앙을 두고 꼭 모서리에 싸서 보호자의 깊은 한숨을 유발함.' },
    { title: '산책 5분 후 안아라 신호', desc: '신나게 뛰다가 갑자기 멈춰 서서 두 앞발로 다리를 긁으며 안아달라 함.' },
    { title: '외부인 한정 순둥이', desc: '집에서는 왕처럼 굴다가 병원이나 훈련사 앞에서는 세상 착한 순한 양이 됨.' }
  ];

  // 획득 칭호 목록 (2026-08-26, 사용자가 산책 퀘스트 연동을 염두에 두고 제공) — 스킬/패시브와
  // 달리 "칭호명 (달성 조건)"이 한 줄로 붙어 있는 형식이라 별도 설명(desc) 칸이 없다.
  // 실제 산책 데이터와 조건을 자동으로 연동하는 부분은 아직 미정 사항(PROJECT_CONTEXT.md 참고) —
  // 지금은 카드에 표시할 문구를 고르는 카탈로그로만 쓴다.
  var BADGES = [
    { category: '초로컬 & 장소 정복 칭호 (산책 퀘스트 연동용)', text: '다산 아울렛 정복자 (아울렛 5회 이상 방문 달성)' },
    { category: '초로컬 & 장소 정복 칭호 (산책 퀘스트 연동용)', text: '다산 중앙공원 냄새지옥 지킴이 (공원 산책 10회 달성)' },
    { category: '초로컬 & 장소 정복 칭호 (산책 퀘스트 연동용)', text: '바람을 가르는 개모차 드라이버 (개모차 탑승 산책 달성)' },
    { category: '초로컬 & 장소 정복 칭호 (산책 퀘스트 연동용)', text: '수제간식점 위치기억력 만렙 (특정 애견동반 매장 체크인)' },
    { category: '초로컬 & 장소 정복 칭호 (산책 퀘스트 연동용)', text: '다산동 골목대장 (동네 산책 누적 50km 달성)' },
    { category: '초로컬 & 장소 정복 칭호 (산책 퀘스트 연동용)', text: '카페 상주견 출석체크 마스터 (단골 카페 3회 방문)' },
    { category: '🏃 산책 & 미션 달성 칭호 (조건부 획득)', text: '비 오면 1초 만에 유턴하는 산책 거부자 (우천 시 산책 완료)' },
    { category: '🏃 산책 & 미션 달성 칭호 (조건부 획득)', text: '3초 길 가다 멈추기 전공자 (3km 이상 완주)' },
    { category: '🏃 산책 & 미션 달성 칭호 (조건부 획득)', text: '새벽 공기 찢는 얼리버드 댕댕이 (오전 7시 이전 산책)' },
    { category: '🏃 산책 & 미션 달성 칭호 (조건부 획득)', text: '밤이 깊었네 야간 비행견 (오후 10시 이후 야간 산책)' },
    { category: '🏃 산책 & 미션 달성 칭호 (조건부 획득)', text: '지나가던 동네 친구 10마리 킁킁 성공 (친구 만남 퀘스트)' },
    { category: '🦁 비주얼 & 외모 특징 칭호', text: '얼굴은 사자 갈기 몸은 솜사탕 (푸들/포메 사자컷 전용)' },
    { category: '🦁 비주얼 & 외모 특징 칭호', text: '정수리 뽕으로 세상을 지배하는 자 (머리 볼륨 스타일견)' },
    { category: '🦁 비주얼 & 외모 특징 칭호', text: '구수한 옥수수칩 냄새 보유자 (발바닥 고소함 MAX)' },
    { category: '🦁 비주얼 & 외모 특징 칭호', text: '입마개도 패션으로 승화시킨 힙스터 (입마개/하네스 착용)' },
    { category: '🦁 비주얼 & 외모 특징 칭호', text: '움직이는 털뭉치 뽀시래기 (아기 강아지 전용)' },
    { category: '⚡ B급 위트 & 참지 않는 반전 칭호', text: '참지 않는 다산동 참치 (까칠이/입질 있는 아이)' },
    { category: '⚡ B급 위트 & 참지 않는 반전 칭호', text: '손가락을 간식으로 착각하는 중 (스킨십 복불복)' },
    { category: '⚡ B급 위트 & 참지 않는 반전 칭호', text: '겁은 많은데 마음만은 다산동 호랑이 (쫄보 대장)' },
    { category: '⚡ B급 위트 & 참지 않는 반전 칭호', text: '내 몸에 손대지 마라 인간 (수동적 스킨십 거부견)' },
    { category: '⚡ B급 위트 & 참지 않는 반전 칭호', text: '순한 얼굴에 그렇지 못한 성깔 (반전 매력견)' },
    { category: '🎀 생애 주기 & 트레이너(보호자) 애착 칭호', text: '가슴으로 낳은 지 1000일째 (기념일 한정 칭호)' },
    { category: '🎀 생애 주기 & 트레이너(보호자) 애착 칭호', text: '세상 하나뿐인 영원한 1st 파트너 (가장 기본 애착 칭호)' },
    { category: '🎀 생애 주기 & 트레이너(보호자) 애착 칭호', text: '우리 집 통장 잔고 루팡 (수제간식/용품 소모왕)' },
    { category: '🎀 생애 주기 & 트레이너(보호자) 애착 칭호', text: '무지개다리 건너온 영원한 레전드 (메모리얼 카드 전용)' }
  ];

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, font, maxWidth) {
    ctx.font = font;
    var words = text.split(' ');
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // textarea에서 사용자가 직접 넣은 줄바꿈(Enter)은 그대로 살리고,
  // 각 줄 안에서 폭을 넘는 부분만 자동으로 추가 줄바꿈한다.
  function wrapTextMultiline(ctx, text, font, maxWidth) {
    var lines = [];
    text.split('\n').forEach(function (paragraph) {
      if (paragraph === '') { lines.push(''); return; }
      lines = lines.concat(wrapText(ctx, paragraph, font, maxWidth));
    });
    return lines;
  }

  // 드롭다운 하나에 카탈로그를 채우고, 고르면 제목/설명 입력칸에 값을 넣어준다 (직접 수정도 그대로 가능)
  function buildCatalogSelect(selectEl, catalog, titleInput, descInput, defaultIndex) {
    var groupEls = {};
    catalog.forEach(function (item, i) {
      var key = item.category || '';
      var parent = selectEl;
      if (key) {
        if (!groupEls[key]) {
          groupEls[key] = document.createElement('optgroup');
          groupEls[key].label = key;
          selectEl.appendChild(groupEls[key]);
        }
        parent = groupEls[key];
      }
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = item.title;
      parent.appendChild(opt);
    });
    function applyIndex(i) {
      selectEl.value = i;
      titleInput.value = catalog[i].title;
      descInput.value = catalog[i].desc;
    }
    applyIndex(defaultIndex);
    selectEl.addEventListener('change', function () {
      applyIndex(parseInt(selectEl.value, 10));
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // 스킬/패시브처럼 제목+설명 2칸이 아니라, "칭호 (조건)"이 한 줄로 붙은 카탈로그(BADGES 같은 것)를
  // 입력칸 하나에 채워주는 버전. buildCatalogSelect와 그룹핑(optgroup) 로직은 동일하되,
  // desc 칸이 없는 대신 item.text 하나만 targetInput에 넣는다.
  function buildSimpleCatalogSelect(selectEl, catalog, targetInput, defaultIndex) {
    var groupEls = {};
    catalog.forEach(function (item, i) {
      var key = item.category || '';
      var parent = selectEl;
      if (key) {
        if (!groupEls[key]) {
          groupEls[key] = document.createElement('optgroup');
          groupEls[key].label = key;
          selectEl.appendChild(groupEls[key]);
        }
        parent = groupEls[key];
      }
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = item.text;
      parent.appendChild(opt);
    });
    function applyIndex(i) {
      selectEl.value = i;
      targetInput.value = catalog[i].text;
    }
    applyIndex(defaultIndex);
    selectEl.addEventListener('change', function () {
      applyIndex(parseInt(selectEl.value, 10));
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // 스킬/패시브 칩: B급 감성 — "드립 제목" + "부연 설명" 2단 구조.
  // 패시브는 dashed 테두리 + 다른 색으로 액티브 스킬과 구분하는 용도로 쓴다.
  // opts: { x, y, w, titleEmoji, titleText, desc, titleColor, dashed,
  //         titleAlign('center' 기본 | 'left'), titleFont(생략 시 기본값), titleLH(생략 시 24),
  //         descFont(생략 시 기본값) }
  // → 그려진 칩의 바닥 y를 반환.
  // titleEmoji는 제목 첫 줄 앞에만 붙는다(줄바꿈돼도 2번째 줄부터는 이모지 없이 텍스트만).
  function drawTraitChip(ctx, opts) {
    var x = opts.x, y = opts.y, w = opts.w;
    // 제목/설명과 칩 테두리 사이 간격(padX), 제목과 설명 사이 간격(midGap)을 좀 더 넓혀달라는
    // 요청(2026-08-27) — 스킬/특성 칩 둘 다 이 함수를 같이 쓰므로 한 번에 반영됨.
    var padX = 32, padY = 14;
    // 기본값은 임팩트 있는 타이틀용 폰트(Black Han Sans, 시안 A가 씀) — 이 폰트를 쓰려면 이
    // 함수를 호출하는 각 카드 HTML 파일이 자기 <head>에서 구글 폰트를 미리 불러와야 한다.
    // Black Han Sans는 굵기가 하나뿐인(항상 두꺼운) 폰트라, "두껍지 않게 크기만 키우고 싶다"는
    // 시안(2026-08-26, 시안 B)은 opts.titleFont로 아예 다른 폰트를 넘기면 된다.
    var titleFont = opts.titleFont || '19px "Black Han Sans", sans-serif';
    var titleAlign = opts.titleAlign || 'center';
    // 기본값(600 굵기, 16px)은 시안 A의 살구색 배경에서 가독성 때문에 굵게 키운 값 — 시안마다
    // 배경/글자 길이가 달라 굵기가 오히려 가독성을 해칠 수 있어서(2026-08-26, 시안 B 피드백)
    // opts.descFont로 시안별로 오버라이드할 수 있게 함.
    var descFont = opts.descFont || '600 16px "Malgun Gothic", sans-serif';
    var emojiSize = 20, emojiGap = 6;
    var emojiReserve = (opts.titleEmoji && emojiReady(opts.titleEmoji)) ? (emojiSize + emojiGap) : 0;
    var titleLines = wrapText(ctx, opts.titleText, titleFont, w - padX * 2 - emojiReserve);
    var descLines = wrapTextMultiline(ctx, opts.desc, descFont, w - padX * 2);
    var titleLH = opts.titleLH || 24, descLH = 22, midGap = 14;
    var chipH = padY * 2 + titleLines.length * titleLH + midGap + descLines.length * descLH;

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    roundRect(ctx, x, y, w, chipH, 18);
    ctx.fill();
    ctx.strokeStyle = '#e5d9c8';
    ctx.lineWidth = 2;
    if (opts.dashed) ctx.setLineDash([7, 5]);
    roundRect(ctx, x, y, w, chipH, 18);
    ctx.stroke();
    ctx.setLineDash([]);

    var ty = y + padY;
    ctx.font = titleFont;
    ctx.fillStyle = opts.titleColor;
    titleLines.forEach(function (line, i) {
      // 아이콘과 글자가 위아래로 어긋나 보인다는 피드백(2026-08-26) — top 기준으로 고정 오프셋을
      // 주던 방식 대신, 그 줄의 정중앙(lineCenterY)에 아이콘과 글자를 똑같이 'middle' 기준으로
      // 맞춰서 폰트가 바뀌어도 항상 광학적으로 가운데 정렬되게 함.
      var lineCenterY = ty + titleLH / 2;
      ctx.textBaseline = 'middle';
      var lineWidth = ctx.measureText(line).width;
      if (i === 0 && emojiReserve) {
        var totalW = emojiReserve + lineWidth;
        var startX = titleAlign === 'left' ? x + padX : x + w / 2 - totalW / 2;
        ctx.drawImage(getEmojiImage(opts.titleEmoji), startX, lineCenterY - emojiSize / 2, emojiSize, emojiSize);
        ctx.textAlign = 'left';
        ctx.fillText(line, startX + emojiReserve, lineCenterY);
      } else if (titleAlign === 'left') {
        ctx.textAlign = 'left';
        ctx.fillText(line, x + padX, lineCenterY);
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(line, x + w / 2, lineCenterY);
      }
      ty += titleLH;
    });
    ty += midGap;
    ctx.font = descFont;
    ctx.fillStyle = '#4a3f35';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center'; // 제목 줄에서 바뀌었을 수 있어 명시적으로 재설정
    descLines.forEach(function (line) {
      ctx.fillText(line, x + w / 2, ty);
      ty += descLH;
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    return y + chipH;
  }

  // AI 없이 순수 픽셀 처리로 "카툰" 느낌을 낸다: 대비/채도를 올린 뒤 색상을 몇 단계로
  // 단순화(posterize)하고, Sobel 엣지 검출로 윤곽선을 검게 그려 얹는다.
  // 원본 image를 그대로 두고, 처리된 결과를 담은 새 <canvas>를 반환한다 (image는 Image든
  // 이미 처리된 canvas든 상관없이 받을 수 있음 — drawImage로 그릴 수 있는 것이면 다 됨).
  // 픽셀 단위 반복이라 원본 해상도 그대로 돌리면 느려서, maxDim으로 먼저 축소한 뒤 처리한다
  // (카드에 표시되는 크기가 어차피 크지 않아서 화질 손해는 거의 없음).
  function applyCartoonEffect(image, opts) {
    opts = opts || {};
    var levels = opts.levels || 5; // 색상을 몇 단계로 단순화할지
    var edgeThreshold = opts.edgeThreshold != null ? opts.edgeThreshold : 15; // 이 값보다 엣지가 강하면 윤곽선으로 표시
    var maxDim = opts.maxDim || 640;
    // blur/edgeThreshold 조합은 "노이즈 낀 털 사진"과 "깨끗한 사진"을 함께 테스트해서
    // 두 경우의 엣지 검출 결과(엣지로 잡히는 픽셀 비율)가 거의 같아지는 값으로 골랐다
    // (2026-08-26 — 실제 반려동물 사진에서 잔털이 전부 엣지로 잡혀 사진이 새까맣게 나오는
    // 문제를 재현하고 튜닝함). 값을 더 조정하려면 이 두 경우를 같이 비교하며 바꿀 것.
    var blur = opts.blur != null ? opts.blur : 4; // 털 잔무늬 같은 잔노이즈를 죽여서 엣지가 여기저기 안 잡히게 함

    var iw = image.width, ih = image.height;
    var scale = Math.min(1, maxDim / Math.max(iw, ih));
    var w = Math.max(1, Math.round(iw * scale));
    var h = Math.max(1, Math.round(ih * scale));

    var off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    var octx = off.getContext('2d', { willReadFrequently: true });

    // 픽셀 처리 전에 블러로 잔털/노이즈 같은 미세한 명암 차이를 먼저 죽인다.
    // (이게 없으면 털 한 올 한 올까지 전부 "엣지"로 잡혀서 사진 전체가 검은 낙서처럼 나온다 —
    // 실제 반려동물 사진으로 테스트하다가 발견한 문제, 2026-08-26)
    // 그 다음 대비/채도를 살짝 올려주면 카툰 느낌이 더 산다.
    octx.filter = (blur > 0 ? 'blur(' + blur + 'px) ' : '') + 'contrast(1.15) saturate(1.3)';
    octx.drawImage(image, 0, 0, w, h);
    octx.filter = 'none';

    var imgData = octx.getImageData(0, 0, w, h);
    var data = imgData.data;

    // 엣지 검출은 posterize 하기 전 원본 색상 기준으로 해야 정확해서 미리 복사해둔다.
    // 밝기(흑백)만 보면, 색은 확실히 다른데 밝기는 비슷한 경계(예: 갈색 털 vs 초록 잔디)를
    // 놓칠 수 있어서, R/G/B 채널 각각 Sobel을 돌리고 그중 가장 강한 값을 쓴다.
    var orig = new Uint8ClampedArray(data);

    // 색상 단순화 (posterize)
    var step = 255 / (levels - 1);
    for (var i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.round(data[i] / step) * step);
      data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
      data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
    }

    // Sobel 엣지 검출 (채널별로 계산해 가장 강한 값 사용) → 우선 "엣지다/아니다" 마스크만 만든다
    var edgeMask = new Uint8Array(w * h);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var maxMag = 0;
        for (var ch = 0; ch < 3; ch++) {
          var i00 = orig[((y - 1) * w + (x - 1)) * 4 + ch], i01 = orig[((y - 1) * w + x) * 4 + ch], i02 = orig[((y - 1) * w + (x + 1)) * 4 + ch];
          var i10 = orig[(y * w + (x - 1)) * 4 + ch], i12 = orig[(y * w + (x + 1)) * 4 + ch];
          var i20 = orig[((y + 1) * w + (x - 1)) * 4 + ch], i21 = orig[((y + 1) * w + x) * 4 + ch], i22 = orig[((y + 1) * w + (x + 1)) * 4 + ch];
          var gx = (i02 + 2 * i12 + i22) - (i00 + 2 * i10 + i20);
          var gy = (i20 + 2 * i21 + i22) - (i00 + 2 * i01 + i02);
          var mag = Math.sqrt(gx * gx + gy * gy);
          if (mag > maxMag) maxMag = mag;
        }
        if (maxMag > edgeThreshold) edgeMask[y * w + x] = 1;
      }
    }

    // 마스크를 1픽셀 팽창시켜 선을 두껍게 만든 다음 진한 색으로 덧칠한다.
    // (안 두껍게 하면 카드에 표시할 크기로 축소될 때 한 픽셀짜리 선이 흐려져 거의 안 보임)
    for (var y2 = 0; y2 < h; y2++) {
      for (var x2 = 0; x2 < w; x2++) {
        var idx0 = y2 * w + x2;
        var isEdge = edgeMask[idx0] ||
          (x2 > 0 && edgeMask[idx0 - 1]) || (x2 < w - 1 && edgeMask[idx0 + 1]) ||
          (y2 > 0 && edgeMask[idx0 - w]) || (y2 < h - 1 && edgeMask[idx0 + w]);
        if (isEdge) {
          var idx = idx0 * 4;
          data[idx] = data[idx + 1] = data[idx + 2] = 35;
        }
      }
    }

    octx.putImageData(imgData, 0, 0);
    return off;
  }

  // 사진을 프레임에 "cover"로 채웠을 때, 중앙 기준으로 얼마나 좌우/상하로 드래그해서
  // 밀어도 프레임 안이 빈 채로 남지 않는지(팬 가능 범위)를 계산한다.
  // zoom(기본 1)을 곱해서, cover-fit 스케일보다 사용자가 더 확대했을 때의 실제 크기/팬
  // 범위까지 같이 계산한다 (2026-08-26, 스크롤/핀치로 확대·축소하는 기능 추가하면서 도입).
  function computePhotoFit(rect, image, zoom) {
    zoom = zoom || 1;
    var scale = Math.max(rect.w / image.width, rect.h / image.height) * zoom;
    var dw = image.width * scale, dh = image.height * scale;
    return {
      dw: dw, dh: dh,
      maxPanX: Math.max(0, (dw - rect.w) / 2),
      maxPanY: Math.max(0, (dh - rect.h) / 2)
    };
  }

  function clampOffset(offset, fit) {
    offset.x = Math.max(-fit.maxPanX, Math.min(fit.maxPanX, offset.x));
    offset.y = Math.max(-fit.maxPanY, Math.min(fit.maxPanY, offset.y));
    return offset;
  }

  // 사진 영역 드래그(마우스/터치 공통, Pointer Events)를 캔버스에 붙여준다.
  // 어떤 영역이 "사진 안"인지(사각형/원형 등)는 hitTest로 각 시안이 정한다.
  // opts에 getZoom/setZoom(+ minZoom/maxZoom, 기본 1~3)을 같이 넘기면, 데스크톱은 마우스 휠
  // 스크롤로, 모바일은 두 손가락 핀치로 확대·축소도 같이 지원한다 (2026-08-26 요청).
  // CSS에서 canvas에 touch-action: none이 걸려 있어야(이미 각 시안에 적용돼 있음) 브라우저가
  // 자체적으로 페이지를 핀치줌하지 않고, 각 손가락의 포인터 이벤트를 그대로 받아 핀치를
  // 직접 계산할 수 있다.
  function attachPhotoDrag(opts) {
    var canvas = opts.canvas;
    var dragging = false;
    var startX = 0, startY = 0, startOffsetX = 0, startOffsetY = 0;
    var supportsZoom = typeof opts.getZoom === 'function' && typeof opts.setZoom === 'function';
    var minZoom = opts.minZoom != null ? opts.minZoom : 1;
    var maxZoom = opts.maxZoom != null ? opts.maxZoom : 3;

    // 핀치는 손가락 2개가 동시에 눌린 상태라, 단일 드래그와 달리 포인터별 위치를 따로 추적해야
    // 두 점 사이 거리(확대 배율의 기준)를 계산할 수 있다.
    var pointers = {}; // pointerId -> {x, y} (캔버스 내부 좌표계)
    var pinchStartDist = 0, pinchStartZoom = 1;

    function toCanvasPoint(e) {
      var rect = canvas.getBoundingClientRect();
      var s = canvas.width / rect.width;
      return { x: (e.clientX - rect.left) * s, y: (e.clientY - rect.top) * s };
    }

    function pointerIds() { return Object.keys(pointers); }

    function beginPan(p) {
      dragging = true;
      startX = p.x; startY = p.y;
      var offset = opts.getOffset();
      startOffsetX = offset.x; startOffsetY = offset.y;
      canvas.style.cursor = 'grabbing';
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (!opts.hasImage()) return;
      var p = toCanvasPoint(e);
      if (!opts.hitTest(p.x, p.y)) return;
      pointers[e.pointerId] = p;
      // setPointerCapture는 실제 기기에서는 거의 항상 되지만, 드물게(혹은 합성 이벤트 테스트
      // 환경에서) 못 잡힌 포인터라며 예외를 던지는 경우가 있다 — 그 예외가 안 잡히면 드래그
      // 로직 자체가 중간에 끊겨버리니 방어적으로 감싼다. 캡처 없이도 드래그는 동작한다.
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}

      var ids = pointerIds();
      if (ids.length === 2 && supportsZoom) {
        // 손가락이 2개가 되는 순간 팬은 멈추고 핀치 모드로 전환
        dragging = false;
        var p1 = pointers[ids[0]], p2 = pointers[ids[1]];
        pinchStartDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        pinchStartZoom = opts.getZoom();
      } else if (ids.length === 1) {
        beginPan(p);
      }
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      var p = toCanvasPoint(e);
      pointers[e.pointerId] = p;
      var ids = pointerIds();

      if (ids.length === 2 && supportsZoom) {
        var p1 = pointers[ids[0]], p2 = pointers[ids[1]];
        var dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (pinchStartDist > 0) {
          var newZoom = Math.max(minZoom, Math.min(maxZoom, pinchStartZoom * (dist / pinchStartDist)));
          opts.setZoom(newZoom);
          opts.onChange();
        }
        return;
      }
      if (!dragging) return;
      opts.setOffset(startOffsetX + (p.x - startX), startOffsetY + (p.y - startY));
      opts.onChange();
    });

    function endPointer(e) {
      delete pointers[e.pointerId];
      var ids = pointerIds();
      if (ids.length < 2) pinchStartDist = 0;
      if (ids.length === 0) {
        dragging = false;
        canvas.style.cursor = opts.hasImage() ? 'grab' : 'default';
      } else if (ids.length === 1) {
        // 핀치 중 손가락 하나를 떼면, 남은 손가락 위치를 기준으로 팬을 다시 시작한다
        beginPan(pointers[ids[0]]);
      }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    // 데스크톱: 사진 위에서 마우스 휠을 스크롤하면 확대/축소 (사진 밖에서는 평소처럼 페이지가 스크롤됨)
    if (supportsZoom) {
      canvas.addEventListener('wheel', function (e) {
        if (!opts.hasImage()) return;
        var p = toCanvasPoint(e);
        if (!opts.hitTest(p.x, p.y)) return;
        e.preventDefault();
        var factor = Math.exp(-e.deltaY * 0.001);
        var newZoom = Math.max(minZoom, Math.min(maxZoom, opts.getZoom() * factor));
        opts.setZoom(newZoom);
        opts.onChange();
      }, { passive: false });
    }
  }

  function downloadCanvasPNG(canvas, filename) {
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }, 'image/png');
  }

  global.CardShared = {
    FILTER_MAP: FILTER_MAP,
    SKILLS: SKILLS,
    PASSIVES: PASSIVES,
    BADGES: BADGES,
    roundRect: roundRect,
    applyCartoonEffect: applyCartoonEffect,
    wrapText: wrapText,
    wrapTextMultiline: wrapTextMultiline,
    buildCatalogSelect: buildCatalogSelect,
    buildSimpleCatalogSelect: buildSimpleCatalogSelect,
    drawTraitChip: drawTraitChip,
    computePhotoFit: computePhotoFit,
    clampOffset: clampOffset,
    attachPhotoDrag: attachPhotoDrag,
    downloadCanvasPNG: downloadCanvasPNG,
    preloadEmoji: preloadEmoji,
    getEmojiImage: getEmojiImage,
    emojiReady: emojiReady,
    drawEmojiLine: drawEmojiLine
  };
})(window);
