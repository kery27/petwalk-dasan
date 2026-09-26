// 산책 보상 카드(자라는 카드) 그리기 — card-reward.html(디자인 비교 도구)과 my-card.html(사용자
// 화면)이 같은 카드를 그리도록 card-reward.html에서 분리함(2026-09-26). 보상 규칙 숫자는
// reward-rules.js, 카드 모양은 이 파일. card-shared.js와 reward-rules.js를 먼저 불러와야 한다.
// 이 파일을 고치면 ?v= 번호를 올리고 두 HTML 파일에서 같이 올릴 것(card-shared.js와 같은 캐시 문제).
//
// 사용법: var card = RewardCard.create(function () { return state; });
//   state = { name, petImage, filterKey, photoOffset: {x,y}, photoZoom,
//             skill: {title, desc}, passive: {title, desc}, showLocked, tiersOn }
//   card.drawSide(canvas, 'front'|'back', progress, card.sharedHeight(progress))
(function () {
  var CS = window.CardShared;
  var RR = window.RewardRules;
  var FRAME_TIERS = RR.FRAME_TIERS, SLOT_RULES = RR.SLOT_RULES, PLACES = RR.PLACES;

  var W = 680;
  var PHOTO_D = 460, PHOTO_TOP = 20, FRAME_TOP = 90;
  var PHOTO_CX = W / 2, PHOTO_CY = PHOTO_TOP + PHOTO_D / 2;
  var PHOTO_RECT = { x: PHOTO_CX - PHOTO_D / 2, y: PHOTO_TOP, w: PHOTO_D, h: PHOTO_D };
  var MAP_MIN_H = 520;
  var EMOJI = ['🐾', '⚡', '🌙', '🔒', '🏅'];

  function create(getState) {
    var cartoonCache = { source: null, canvas: null };

    function tierOf(s, p) {
      return s.tiersOn ? RR.tierFor(p.walks) : FRAME_TIERS[FRAME_TIERS.length - 1];
    }

    function getPhotoDrawSource(s) {
      if (s.filterKey !== 'cartoon') return s.petImage;
      if (cartoonCache.source !== s.petImage) {
        cartoonCache.canvas = CS.applyCartoonEffect(s.petImage);
        cartoonCache.source = s.petImage;
      }
      return cartoonCache.canvas;
    }

    // ── 공통 프레임 ──
    function frameGradient(ctx, tier, x, y, w, h) {
      var g = ctx.createLinearGradient(x, y, x + w, y + h);
      tier.stops.forEach(function (c, i) { g.addColorStop(i / (tier.stops.length - 1), c); });
      return g;
    }

    function drawBackgroundPattern(ctx, x, y, w, h) {
      if (!CS.emojiReady('🐾')) return;
      var img = CS.getEmojiImage('🐾');
      var step = 74, size = 26;
      ctx.save();
      CS.roundRect(ctx, x, y, w, h, 32);
      ctx.clip();
      ctx.globalAlpha = 0.07;
      var row = 0;
      for (var py = y - step; py < y + h + step; py += step) {
        var rowOffset = (row % 2) ? step / 2 : 0;
        for (var px = x - step; px < x + w + step; px += step) {
          ctx.save();
          ctx.translate(px + rowOffset, py);
          ctx.rotate(((px + py) % 7) * 0.09);
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
        row++;
      }
      ctx.restore();
    }

    function drawFrame(ctx, H, tier, top) {
      var x = 14, y = top, w = W - 28, h = H - 14 - top;
      var body = ctx.createLinearGradient(0, y, 0, y + h);
      body.addColorStop(0, '#fdf1e3');
      body.addColorStop(1, '#f6dfd2');
      ctx.fillStyle = body;
      CS.roundRect(ctx, x, y, w, h, 32);
      ctx.fill();
      drawBackgroundPattern(ctx, x, y, w, h);

      var g = frameGradient(ctx, tier, x, y, w, h);
      ctx.lineWidth = tier.width;
      ctx.strokeStyle = g;
      CS.roundRect(ctx, x, y, w, h, 32);
      ctx.stroke();

      // 은·금은 안쪽 이중 라인과 코너 메달로 "등급이 높다"는 걸 한눈에 보이게 한다
      var fancy = tier.minWalks >= FRAME_TIERS[2].minWalks;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fffaf3';
      CS.roundRect(ctx, x + 12, y + 12, w - 24, h - 24, 24);
      ctx.stroke();
      if (fancy) {
        [[x + 30, y + 30], [x + w - 30, y + 30], [x + 30, y + h - 30], [x + w - 30, y + h - 30]].forEach(function (c) {
          ctx.beginPath();
          ctx.arc(c[0], c[1], 20, 0, Math.PI * 2);
          ctx.fillStyle = '#fffaf3';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = g;
          ctx.stroke();
          if (CS.emojiReady('🐾')) ctx.drawImage(CS.getEmojiImage('🐾'), c[0] - 10, c[1] - 10, 20, 20);
        });
      }
    }

    function drawPhoto(ctx, s, tier) {
      var r = PHOTO_D / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(74, 63, 53, 0.35)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#e9dccb';
      ctx.fillRect(PHOTO_CX - r, PHOTO_CY - r, PHOTO_D, PHOTO_D);
      if (s.petImage) {
        var src = getPhotoDrawSource(s);
        ctx.filter = s.filterKey === 'cartoon' ? 'none' : (CS.FILTER_MAP[s.filterKey] || 'none');
        var fit = CS.computePhotoFit(PHOTO_RECT, src, s.photoZoom);
        ctx.imageSmoothingEnabled = s.filterKey !== 'cartoon';
        ctx.drawImage(src,
          PHOTO_RECT.x + (PHOTO_RECT.w - fit.dw) / 2 + s.photoOffset.x,
          PHOTO_RECT.y + (PHOTO_RECT.h - fit.dh) / 2 + s.photoOffset.y, fit.dw, fit.dh);
        ctx.imageSmoothingEnabled = true;
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = '#a89a86';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('사진을 선택해주세요', PHOTO_CX, PHOTO_CY);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, r, 0, Math.PI * 2);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#fffaf3';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, r - 6, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = tier.ring;
      ctx.stroke();
    }

    function drawLockedSlot(ctx, x, y, w, label, sub) {
      var h = 78;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      CS.roundRect(ctx, x, y, w, h, 18);
      ctx.fill();
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#c9b8a3';
      CS.roundRect(ctx, x, y, w, h, 18);
      ctx.stroke();
      ctx.setLineDash([]);
      CS.drawEmojiLine(ctx, {
        emoji: '🔒', text: label, x: x + 32, y: y + 26, baseline: 'middle',
        font: '20px "Malgun Gothic", sans-serif', color: '#8a7c6d', size: 20
      });
      ctx.font = '15px "Malgun Gothic", sans-serif';
      ctx.fillStyle = '#a8977f';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(sub, x + 32, y + 56);
      ctx.textBaseline = 'top';
      return y + h;
    }

    function drawBadgeRow(ctx, y, p, showLocked) {
      var items = PLACES.filter(function (pl) { return showLocked || p.visited[pl.id]; });
      if (!items.length) return y;
      var gap = 10, x0 = 44, total = W - 88;
      var pillW = (total - gap * (items.length - 1)) / items.length, pillH = 46;
      items.forEach(function (pl, i) {
        var x = x0 + i * (pillW + gap);
        var got = !!p.visited[pl.id];
        ctx.fillStyle = got ? '#fff3d6' : 'rgba(255,255,255,0.35)';
        CS.roundRect(ctx, x, y, pillW, pillH, 23);
        ctx.fill();
        if (!got) ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = got ? '#e2b45a' : '#c9b8a3';
        CS.roundRect(ctx, x, y, pillW, pillH, 23);
        ctx.stroke();
        ctx.setLineDash([]);
        CS.drawEmojiLine(ctx, {
          emoji: got ? '🏅' : '🔒', text: pl.name, x: x + pillW / 2, y: y + pillH / 2,
          baseline: 'middle', align: 'center', size: 18,
          font: '16px "Malgun Gothic", sans-serif', color: got ? '#4a3f35' : '#a8977f'
        });
      });
      ctx.textBaseline = 'top';
      return y + pillH;
    }

    // ── 앞면 ──
    function drawFront(ctx, H, p) {
      var s = getState();
      var tier = tierOf(s, p);
      ctx.clearRect(0, 0, W, H);
      drawFrame(ctx, H, tier, FRAME_TOP);
      drawPhoto(ctx, s, tier);

      var nameY = PHOTO_TOP + PHOTO_D + 22;
      CS.drawEmojiLine(ctx, {
        emoji: '🐾', text: s.name, x: W / 2, y: nameY,
        font: '30px "Black Han Sans", sans-serif', color: '#4a3f35', size: 26, align: 'center'
      });

      var metaY = nameY + 38;
      ctx.font = '600 16px "Malgun Gothic", sans-serif';
      ctx.fillStyle = '#b8542f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      var meta = (s.tiersOn ? tier.name + ' 등급  ·  ' : '') + '산책 ' + p.walks + '회  ·  ' + p.km.toFixed(1) + 'km';
      ctx.fillText(meta, W / 2, metaY);
      ctx.textAlign = 'left';

      var lineY = metaY + 34;
      ctx.strokeStyle = '#d9c7b3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, lineY);
      ctx.lineTo(W - 44, lineY);
      ctx.stroke();

      var descFont = '18px "Malgun Gothic", sans-serif';
      var y = lineY + 22;
      var drewSomething = false;

      if (p.walks >= SLOT_RULES.skill) {
        y = CS.drawTraitChip(ctx, { x: 44, y: y, w: W - 88, titleEmoji: '⚡', titleText: s.skill.title,
          desc: s.skill.desc, titleColor: '#b8542f', titleAlign: 'left',
          titleFont: '23px "Malgun Gothic", sans-serif', titleLH: 28, descFont: descFont });
        drewSomething = true;
      } else if (s.showLocked) {
        y = drawLockedSlot(ctx, 44, y, W - 88, '스킬 칸', '산책 ' + SLOT_RULES.skill + '회 하면 열려요');
        drewSomething = true;
      }
      if (drewSomething) y += 16;

      var drewPassive = false;
      if (p.walks >= SLOT_RULES.passive) {
        y = CS.drawTraitChip(ctx, { x: 44, y: y, w: W - 88, titleEmoji: '🌙', titleText: s.passive.title,
          desc: s.passive.desc, titleColor: '#5f4d85', dashed: true, titleAlign: 'left',
          titleFont: '23px "Malgun Gothic", sans-serif', titleLH: 28, descFont: descFont });
        drewPassive = true;
      } else if (s.showLocked) {
        y = drawLockedSlot(ctx, 44, y, W - 88, '특성 칸', '산책 ' + SLOT_RULES.passive + '회 하면 열려요');
        drewPassive = true;
      }
      if (drewPassive) y += 16;

      var yAfterBadges = drawBadgeRow(ctx, y, p, s.showLocked);
      if (yAfterBadges > y) y = yAfterBadges + 18;

      if (s.showLocked) {
        ctx.font = '15px "Malgun Gothic", sans-serif';
        ctx.fillStyle = '#8a7c6d';
        ctx.textAlign = 'center';
        ctx.fillText('다음 보상 · ' + RR.nextGoalText(p), W / 2, y + 2);
        ctx.textAlign = 'left';
        y += 26;
      }
      return y;
    }

    // ── 뒷면: 다산동 발도장 지도 ──
    // fillHeight가 true면 앞면에 맞춘 높이(H)에서 남는 공간을 지도가 채운다 — 아래 문구/진행 바가
    // 차지하는 높이(footer)를 뺀 나머지를 지도에 준다. 높이를 재는 중에는 최소 높이로만 그린다.
    function drawBack(ctx, H, p, fillHeight) {
      var s = getState();
      var tier = tierOf(s, p);
      ctx.clearRect(0, 0, W, H);
      // 뒷면은 사진 팝업이 없으니 프레임을 캔버스 위쪽에 붙인다
      drawFrame(ctx, H, tier, 14);

      var visitedCount = PLACES.filter(function (pl) { return p.visited[pl.id]; }).length;
      CS.drawEmojiLine(ctx, {
        emoji: '🐾', text: s.name + '의 다산동 발도장', x: W / 2, y: 70,
        font: '30px "Black Han Sans", sans-serif', color: '#4a3f35', size: 26, align: 'center'
      });
      ctx.font = '600 17px "Malgun Gothic", sans-serif';
      ctx.fillStyle = '#b8542f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(visitedCount + ' / ' + PLACES.length + ' 곳 방문', W / 2, 116);

      var footerH = s.tiersOn ? 124 : 70;
      var mx = 60, my = 160, mw = W - 120;
      var mh = fillHeight ? Math.max(MAP_MIN_H, H - 14 - 30 - footerH - my) : MAP_MIN_H;
      ctx.save();
      CS.roundRect(ctx, mx, my, mw, mh, 24);
      ctx.fillStyle = '#eef3e2';
      ctx.fill();
      ctx.clip();

      var lats = PLACES.map(function (pl) { return pl.center[0]; });
      var lngs = PLACES.map(function (pl) { return pl.center[1]; });
      var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
      var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
      var pad = 0.2;
      function project(c) {
        var fx = (c[1] - minLng) / ((maxLng - minLng) || 1);
        var fy = (maxLat - c[0]) / ((maxLat - minLat) || 1);
        return [mx + mw * (pad + fx * (1 - pad * 2)), my + mh * (pad + fy * (1 - pad * 2))];
      }

      // 장식용 도로 — 실제 도로망이 아니라 "지도 같은 느낌"을 내는 그림
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(mx, my + mh * 0.58); ctx.lineTo(mx + mw, my + mh * 0.5);
      ctx.moveTo(mx + mw * 0.32, my); ctx.lineTo(mx + mw * 0.4, my + mh);
      ctx.stroke();

      PLACES.forEach(function (pl) {
        var pt = project(pl.center);
        if (pl.kind === 'park') {
          ctx.fillStyle = '#d3e6bd';
          ctx.beginPath();
          ctx.ellipse(pt[0], pt[1], 110, 80, -0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (pl.kind === 'water') {
          ctx.strokeStyle = '#cfe3ef';
          ctx.lineWidth = 44;
          ctx.beginPath();
          ctx.moveTo(pt[0] + 40, my - 20);
          ctx.quadraticCurveTo(pt[0] - 50, pt[1], pt[0] + 60, my + mh + 20);
          ctx.stroke();
          ctx.fillStyle = '#d3e6bd';
          ctx.beginPath();
          ctx.ellipse(pt[0] - 40, pt[1], 70, 90, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#ead7c1';
          CS.roundRect(ctx, pt[0] - 70, pt[1] - 44, 140, 88, 14);
          ctx.fill();
        }
      });

      PLACES.forEach(function (pl, i) {
        var pt = project(pl.center);
        var got = !!p.visited[pl.id];
        var r = 46;
        ctx.save();
        ctx.translate(pt[0], pt[1]);
        if (got) {
          ctx.rotate([-0.2, 0.15, -0.08][i % 3]);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#c8423a';
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, r - 9, 0, Math.PI * 2); ctx.stroke();
          if (CS.emojiReady('🐾')) ctx.drawImage(CS.getEmojiImage('🐾'), -20, -20, 40, 40);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
          ctx.setLineDash([7, 6]);
          ctx.strokeStyle = '#a8977f';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '34px "Black Han Sans", sans-serif';
          ctx.fillStyle = '#a8977f';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', 0, 2);
        }
        ctx.restore();

        ctx.font = (got ? '600 ' : '') + '17px "Malgun Gothic", sans-serif';
        ctx.fillStyle = got ? '#8b2e2a' : '#8a7c6d';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(pl.name, pt[0], pt[1] + r + 8);
      });
      ctx.restore();

      var y = my + mh + 28;
      if (s.tiersOn) {
        var nt = RR.nextTier(p.walks);
        var label = nt ? tier.name + ' → ' + nt.name + ' 테두리까지 산책 ' + (nt.minWalks - p.walks) + '회'
                       : '최고 등급 금 테두리 달성';
        ctx.font = '16px "Malgun Gothic", sans-serif';
        ctx.fillStyle = '#4a3f35';
        ctx.fillText(label, W / 2, y);
        var bx = 90, bw = W - 180, by = y + 30, frac = 1;
        if (nt) frac = (p.walks - tier.minWalks) / (nt.minWalks - tier.minWalks);
        ctx.fillStyle = '#eadfce';
        CS.roundRect(ctx, bx, by, bw, 14, 7); ctx.fill();
        ctx.fillStyle = frameGradient(ctx, nt || tier, bx, by, bw, 14);
        CS.roundRect(ctx, bx, by, Math.max(14, bw * frac), 14, 7); ctx.fill();
        y = by + 34;
      }
      ctx.font = '13px "Malgun Gothic", sans-serif';
      ctx.fillStyle = '#a8977f';
      ctx.fillText('공용 장소 도장만 표시돼요 · 실제 산책 경로는 담기지 않아요', W / 2, y);
      ctx.textAlign = 'left';
      return y + 20;
    }

    // ── 렌더 ──
    var measureCanvas = document.createElement('canvas');
    measureCanvas.width = W;
    measureCanvas.height = 1600;

    // 앞/뒷면을 양면 아크릴로 뽑을 걸 고려해 두 면의 높이를 항상 같게 맞춘다
    function sharedHeight(p) {
      var mctx = measureCanvas.getContext('2d');
      var front = drawFront(mctx, measureCanvas.height, p);
      var back = drawBack(mctx, measureCanvas.height, p);
      return Math.ceil(Math.max(front, back)) + 30;
    }

    function drawSide(targetCanvas, which, p, H) {
      targetCanvas.width = W;
      targetCanvas.height = H;
      var c = targetCanvas.getContext('2d');
      if (which === 'front') drawFront(c, H, p); else drawBack(c, H, p, true);
    }

    // 앞/뒷면을 나란히 붙인 한 장(양면 출력·저장용)
    function drawBoth(p) {
      var H = sharedHeight(p);
      var gap = 40;
      var out = document.createElement('canvas');
      out.width = W * 2 + gap;
      out.height = H;
      var tmp = document.createElement('canvas');
      drawSide(tmp, 'front', p, H);
      out.getContext('2d').drawImage(tmp, 0, 0);
      drawSide(tmp, 'back', p, H);
      out.getContext('2d').drawImage(tmp, W + gap, 0);
      return out;
    }

    return { sharedHeight: sharedHeight, drawSide: drawSide, drawBoth: drawBoth };
  }

  window.RewardCard = {
    W: W,
    PHOTO_D: PHOTO_D,
    PHOTO_CX: PHOTO_CX,
    PHOTO_CY: PHOTO_CY,
    PHOTO_RECT: PHOTO_RECT,
    EMOJI: EMOJI,
    create: create
  };
})();
