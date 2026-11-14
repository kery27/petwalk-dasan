# 받은 그림(1024px, 노란 바탕에 갈색 선)에서 선만 뽑아 단순하게 다듬는 데 쓰는 함수들.
# 그림 파일은 저장소에 넣지 않는다. 경로는 make.py / make2.py 의 인자로 준다.
import sys
import cv2, numpy as np

SRC = next((a for a in sys.argv[1:] if not a.startswith('--')), 'orig.png')
S = 2                       # 작업 배수
INK = (16, 50, 90)          # #5a3210 (BGR)
YEL = (74, 200, 247)        # #f7c84a
CREAM = (200, 242, 255)     # #fff2c8

def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))

def poly(mask, pts, val):
    cv2.fillPoly(mask, [np.array([(int(x * S), int(y * S)) for x, y in pts], np.int32)], val)

def load_ink():
    im = cv2.imread(SRC)
    L = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    Lb = cv2.resize(L, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    Lb = cv2.GaussianBlur(Lb, (0, 0), 1.0)
    return (Lb < 122).astype(np.uint8)

def drop_small(ink, min_area):
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= min_area * S * S
    removed = [(int(st[k, 0] / S), int(st[k, 1] / S), int(st[k, 4] / S / S)) for k in range(1, n) if not keep[k]]
    return keep[lab].astype(np.uint8), removed

def small_holes(ink, max_frac=0.012):
    """잉크에 둘러싸인 작은 노란 조각(이빨, 눈 반짝임 등)."""
    yel = (1 - ink).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(yel, connectivity=4)
    lim = max_frac * ink.size
    small = np.zeros(n, bool); small[1:] = st[1:, cv2.CC_STAT_AREA] < lim
    return small[lab].astype(np.uint8)

def smooth(b, sigma):
    return (cv2.GaussianBlur(b.astype(np.float32), (0, 0), sigma * S) > 0.5).astype(np.uint8)

def inside(ink, close_r=22):
    """개의 속(머리 안쪽 전체). 선의 틈을 잠깐 메워서 바깥을 채운 뒤 뒤집는다."""
    sealed = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, disk(close_r * S))
    h, w = sealed.shape
    ff = sealed.copy(); m = np.zeros((h + 2, w + 2), np.uint8)
    for seed in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3), (w // 2, 4)):
        if ff[seed[1], seed[0]] == 0:
            cv2.floodFill(ff, m, seed, 2)
    return (ff != 2).astype(np.uint8)

def render(ink, fill=None, bg=YEL, size=1024):
    h, w = ink.shape
    out = np.zeros((h, w, 3), np.uint8); out[:] = bg
    if fill is not None:
        out[fill > 0] = CREAM
    out[ink > 0] = INK
    return cv2.resize(out, (size, size), interpolation=cv2.INTER_AREA)

if __name__ == "__main__":
    ink0 = load_ink()
    ink1, removed = drop_small(ink0, 1100)
    print('removed small pieces (x, y, area):', removed)
    cv2.imwrite('s_step0.png', render(ink0, size=768)); cv2.imwrite('s_step1.png', render(ink1, size=768))
    np.save('ink1.npy', ink1)
