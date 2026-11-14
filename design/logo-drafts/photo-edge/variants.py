# 사진에서 '가장자리 처리' 판들을 만든다.
#   sticker: 사진 그대로 + 테두리      toon: 색면 + 선(사진 색)
#   gold:    금화 색 몇 단 + 선         stamp: 선만(잉크 한 색)
import cv2, numpy as np
from base import padded, upscaled, S, PT, PL
from lines import xdog

def hexbgr(h):
    h = h.lstrip('#'); return (int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16))

LINE = hexbgr('#5a3210')
INK = hexbgr('#3a1e08')
WHITE = hexbgr('#fffaf0')
X0, Y0, TILE = 36, -68, 400    # 원본 좌표에서 아이콘 칸이 보는 창(왼쪽 위, 한 변)
OUT = 2                        # 내보내는 배수(칸 400 → 800px)

def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))

def clean_small(binary, min_area):
    n, lab, st, _ = cv2.connectedComponentsWithStats(binary.astype(np.uint8), connectivity=8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= min_area
    return keep[lab]

def window(img, x0=None, y0=None, tile=None):
    x0 = X0 if x0 is None else x0; y0 = Y0 if y0 is None else y0; tile = TILE if tile is None else tile
    x = int(round((x0 + PL) * S)); y = int(round((y0 + PT) * S)); n = int(round(tile * S))
    return img[y:y + n, x:x + n]

def rings(mask, line=5, sticker=7):
    """마스크 가장자리에 걸치는 굵은 선(line, 원본 픽셀)과 그 바깥 흰 테(sticker)."""
    me = cv2.erode(mask, disk(6))                       # 흰 배경이 묻은 가장자리를 조금 깎는다
    half = int(round(line * S / 2))
    inner = cv2.erode(me, disk(max(1, half - 2)))
    outer = cv2.dilate(me, disk(half + 2))
    st = cv2.dilate(outer, disk(int(round(sticker * S))))
    return inner, outer, st

def compose(body, mask, with_sticker, line=5, sticker=7):
    inner, outer, st = rings(mask, line, sticker)
    out = np.zeros_like(body); out[:] = WHITE
    out[outer > 0] = LINE
    out[inner > 0] = body[inner > 0]
    alpha = (st if with_sticker else outer) > 0
    return np.dstack([out, alpha.astype(np.uint8) * 255])

def export(rgba, **kw):
    w = window(rgba, **kw)
    return cv2.resize(w, (TILE * OUT, TILE * OUT), interpolation=cv2.INTER_AREA)

def smooth2():
    imp, fgp = padded()
    I2 = cv2.resize(imp, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    for _ in range(3):
        I2 = cv2.bilateralFilter(I2, 9, 34, 7)
    return cv2.pyrMeanShiftFiltering(I2, 14, 30, maxLevel=1)

def up_labels(lbl, K, shape, sigma=5):
    H, W = shape
    best = np.full((H, W), -1.0, np.float32); out = np.zeros((H, W), np.uint8)
    for k in range(K):
        f = cv2.resize((lbl == k).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
        f = cv2.GaussianBlur(f, (0, 0), sigma)
        upd = f > best; best[upd] = f[upd]; out[upd] = k
    return out

def step_lines(lbl_big, tone_L, thresh, width=2.2):
    """색면 사이의 밝기 차가 큰 경계에만 가는 선을 긋는다."""
    Lmap = np.asarray(tone_L, np.float32)[lbl_big]
    gx = cv2.Sobel(Lmap, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(Lmap, cv2.CV_32F, 0, 1, ksize=3)
    e = (np.hypot(gx, gy) / 8.0) > thresh
    e = cv2.dilate(e.astype(np.uint8), disk(int(round(width * S / 2))))
    e = cv2.GaussianBlur(e.astype(np.float32), (0, 0), 2.0) > 0.5
    return clean_small(e, 900)

def sticker_body(big):
    photo = big.copy()
    for _ in range(2):
        photo = cv2.bilateralFilter(photo, 9, 26, 6)
    blur = cv2.GaussianBlur(photo, (0, 0), 3)
    photo = cv2.addWeighted(photo, 1.5, blur, -0.5, 0)
    hsv = cv2.cvtColor(photo, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.12, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

def toon_body(big, mask, ms, K=8, ink=None):
    lab = cv2.cvtColor(ms, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    m2 = cv2.resize(mask, (ms.shape[1], ms.shape[0]), interpolation=cv2.INTER_NEAREST).reshape(-1) > 0
    rng = np.random.default_rng(7)
    samp = lab[m2]; samp = samp[rng.choice(len(samp), min(60000, len(samp)), replace=False)]
    cv2.setRNGSeed(7)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5)
    _, _, centers = cv2.kmeans(samp, K, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    lbl = ((lab[:, None, :] - centers[None, :, :]) ** 2).sum(2).argmin(1).reshape(ms.shape[:2])
    big_lbl = up_labels(lbl, K, big.shape[:2], sigma=5)
    cols = cv2.cvtColor(centers.reshape(1, K, 3).astype(np.uint8), cv2.COLOR_LAB2BGR)
    hsv = cv2.cvtColor(cols, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.25 + 6, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * 1.04, 0, 255)
    cols = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).reshape(K, 3)
    body = cols[big_lbl]
    if ink is not None:
        body[ink] = INK
    return body

GOLD_TONES = ['#8a4f16', '#d98a2b', '#f2b440', '#f9d05c', '#fff2c8']
GOLD_CUTS = [70, 120, 165, 216]

def gold_body(big, ms, tones=GOLD_TONES, cuts=GOLD_CUTS, ink=None):
    L = cv2.cvtColor(ms, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
    lbl = np.digitize(L, cuts).astype(np.uint8)
    K = len(tones)
    big_lbl = up_labels(lbl, K, big.shape[:2], sigma=6)
    pal = np.array([hexbgr(t) for t in tones], np.uint8)
    body = pal[big_lbl]
    if ink is not None:
        body[ink] = INK
    return body

def ink_mask(big, eps=0.5, sigma=2.0, blur=3.4, min_ink=1100, min_paper=700):
    """XDoG로 뽑은 잉크 자리(어두운 면과 굵은 선). 4배 크기의 참/거짓 배열."""
    imp, fgp = padded()
    I2 = cv2.resize(imp, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    for _ in range(3):
        I2 = cv2.bilateralFilter(I2, 9, 30, 7)
    L = cv2.cvtColor(I2, cv2.COLOR_BGR2LAB)[..., 0]
    o = xdog(L.astype(np.float32) / 255.0, sigma=sigma, p=20, eps=eps, phi=12)
    H, W = big.shape[:2]
    ink = cv2.resize((o < 0.5).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    ink = cv2.GaussianBlur(ink, (0, 0), blur) > 0.5
    ink = clean_small(ink, min_ink)
    return ~clean_small(~ink, min_paper)

def stamp_body(big, ink, fill='#fff2c8'):
    body = np.zeros_like(big); body[:] = hexbgr(fill); body[ink] = LINE
    return body

def on(bg_hex, im):
    t = np.zeros((im.shape[0], im.shape[1], 3), np.float32); t[:] = hexbgr(bg_hex)
    al = im[..., 3:4].astype(np.float32) / 255
    return (t * (1 - al) + im[..., :3] * al).astype(np.uint8)

COIN_WIN = dict(x0=-7.5, y0=-91, tile=500)   # 동전 안에 넣을 때 보는 창(얼굴을 0.8배로)

if __name__ == "__main__":
    big, mask = upscaled()
    ms = smooth2()
    ink = ink_mask(big, eps=0.5)
    ink_light = ink_mask(big, eps=0.42)
    outs = {
        'photo-sticker': export(compose(sticker_body(big), mask, True)),
        'photo-toon': export(compose(toon_body(big, mask, ms, ink=ink_light), mask, True)),
        'photo-stamp': export(compose(stamp_body(big, ink), mask, False)),
        'photo-gold-dog': export(compose(gold_body(big, ms, ink=ink_light), mask, False, line=6), **COIN_WIN),
    }
    for name, im in outs.items():
        cv2.imwrite(f'out/{name}.png', im)
    row = np.hstack([on('#f7c84a', outs[k]) for k in ('photo-sticker', 'photo-toon', 'photo-stamp')] + [on('#ec9c2c', outs['photo-gold-dog'])])
    cv2.imwrite('prev_ab.png', row[:, :1600]); cv2.imwrite('prev_cd.png', row[:, 1600:])
