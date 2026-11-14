# 금화 안에 금색 얼굴을 어디에, 얼마나 크게 놓을지 여러 안을 나란히 본다.
import sys
import cv2, numpy as np
from base import upscaled, S, PT, PL
import variants as V

CX, CY, RIN, RF = 194, 194, 146, 172
PX = 2   # 칸 단위 1 = 2px

def circle_mask(r, ss=4):
    n = 400 * PX * ss
    m = np.zeros((n, n), np.uint8)
    cv2.circle(m, (CX * PX * ss, CY * PX * ss), int(r * PX * ss), 255, -1)
    return cv2.resize(m, (400 * PX, 400 * PX), interpolation=cv2.INTER_AREA).astype(np.float32) / 255

def place(layer, s, xc, ytop):
    """layer: 4배 크기 RGBA. 원본 x=xc 를 동전 가운데로, 머리 꼭대기(원본 y=-1)를 ytop 에."""
    f = s * PX / S
    small = cv2.resize(layer, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    ox = CX * PX - (xc + PL) * s * PX
    oy = ytop * PX - (-1 + PT) * s * PX
    M = np.float32([[1, 0, ox], [0, 1, oy]])
    return cv2.warpAffine(small, M, (400 * PX, 400 * PX), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))

def compose_coin(coin, dog, ears=True):
    """개를 동전 안쪽 원으로 자르되, 원 밖으로 나온 조각 가운데 '귀'(위쪽 조각)만 테 위로 나오게 둔다."""
    inner = circle_mask(RIN - 2)
    alpha = dog[..., 3].astype(np.float32) / 255
    clip = inner.copy()
    allow = np.zeros_like(inner)
    if ears:
        outside = ((alpha > 0.5) & (inner < 0.5)).astype(np.uint8)
        n, lab, st, cen = cv2.connectedComponentsWithStats(outside, connectivity=8)
        for k in range(1, n):
            if st[k, cv2.CC_STAT_AREA] < 40: continue
            bottom = (st[k, cv2.CC_STAT_TOP] + st[k, cv2.CC_STAT_HEIGHT]) / PX
            if cen[k][1] / PX < CY + 0.5 * RIN and bottom < CY + 0.86 * RIN:
                allow[lab == k] = 1
        allow = cv2.dilate(allow, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        allow = allow * circle_mask(RF)
        clip = np.maximum(clip, allow)
    a = (alpha * clip)[..., None]
    out = coin.astype(np.float32).copy()
    out[..., :3] = out[..., :3] * (1 - a) + dog[..., :3] * a
    out[..., 3:4] = np.maximum(out[..., 3:4], a * 255)
    # 안쪽 테를 다시 긋는다: 귀가 넘어간 자리만 빼고
    ss = 4; n2 = 400 * PX * ss
    ring = np.zeros((n2, n2), np.uint8)
    cv2.circle(ring, (CX * PX * ss, CY * PX * ss), RIN * PX * ss, 255, int(5 * PX * ss))
    ring = cv2.resize(ring, (400 * PX, 400 * PX), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    ring = (ring * (1 - cv2.dilate(allow, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))))[..., None]
    out[..., :3] = out[..., :3] * (1 - ring) + np.array(V.LINE, np.float32) * ring
    return np.clip(out, 0, 255).astype(np.uint8)

def gold_layer(fresh=False):
    import os
    if os.path.exists('gold_layer.npy') and not fresh:
        return np.load('gold_layer.npy')
    big, mask = upscaled()
    ms = V.smooth2()
    ink = V.ink_mask(big, eps=0.42)
    ink[(PT + 330) * S:, :] = False          # 사진 아래로 늘린 목에는 잉크를 넣지 않는다
    layer = V.compose(V.gold_body(big, ms, ink=ink), mask, False, line=6)
    np.save('gold_layer.npy', layer)
    return layer

if __name__ == "__main__":
    layer = gold_layer('--fresh' in sys.argv)
    coin = cv2.imread('coin-blank.png', cv2.IMREAD_UNCHANGED)
    tiles = []
    for (sc, xc, ytop) in ((0.62, 240, 112), (0.64, 240, 108), (0.66, 238, 104), (0.68, 236, 100)):
        t = V.on('#f7c84a', compose_coin(coin, place(layer, sc, xc, ytop)))
        cv2.putText(t, f"s{sc} xc{xc} top{ytop}", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
        tiles.append(t)
    sheet = np.vstack([np.hstack(tiles[:2]), np.hstack(tiles[2:])])
    cv2.imwrite('prev_coinfit.png', cv2.resize(sheet, None, fx=0.7, fy=0.7, interpolation=cv2.INTER_AREA))
