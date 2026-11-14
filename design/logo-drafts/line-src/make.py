# 받은 그림을 단순하게 다듬은 판을 만든다:  python3 make.py /경로/받은그림.png
# 좌표(눈, 송곳니, 이빨 자리)는 2026-11-14에 받은 그림에 맞춘 값이다. 다른 그림이면 edit()·edit_strong()을 다시 맞춘다.
import sys
import cv2, numpy as np
import simplify as Z
S = Z.S

def circle(mask, c, r, val):
    cv2.circle(mask, (int(round(c[0] * S)), int(round(c[1] * S))), int(round(r * S)), val, -1, lineType=cv2.LINE_8)

def ellipse(mask, c, ax, val):
    cv2.ellipse(mask, (int(c[0] * S), int(c[1] * S)), (int(ax[0] * S), int(ax[1] * S)), 0, 0, 360, val, -1)

def fill_holes_in(ink, boxes):
    """상자 안에 중심이 있는 작은 노란 조각(작은 이빨 등)을 잉크로 메운다."""
    yel = (1 - ink).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(yel, connectivity=4)
    for k in range(1, n):
        if st[k, cv2.CC_STAT_AREA] > 0.012 * ink.size: continue
        cx, cy = cen[k][0] / S, cen[k][1] / S
        if any(x0 <= cx <= x1 and y0 <= cy <= y1 for x0, y0, x1, y1 in boxes):
            ink[lab == k] = 1
    return ink

def edit(ink):
    ink = ink.copy()
    # 1) 가까운 눈: 주변의 가는 곡선들을 지우고 눈알·흰 테·굵은 테만 남기게 다시 그린다
    er = np.zeros_like(ink); ellipse(er, (528, 430), (97, 90), 1); er[:, int(596 * S):] = 0
    ink[er > 0] = 0
    Z.poly(ink, [(478, 500), (577, 488), (577, 530), (478, 530)], 0)      # 눈 밑 속눈썹 같은 선
    Z.poly(ink, [(579, 470), (598, 462), (601, 503), (584, 505)], 0)      # 눈 오른쪽 아래의 가는 선
    circle(ink, (530, 429), 76, 1)        # 굵은 테
    white = np.zeros_like(ink); circle(white, (532, 436), 60, 1)
    lid = np.zeros_like(ink)              # 눈꺼풀: 코 쪽(오른쪽)으로 갈수록 내려오는 선 위쪽은 덮는다
    Z.poly(lid, [(430, 369), (640, 437), (640, 300), (430, 300)], 1)
    ink[(white > 0) & (lid == 0)] = 0     # 흰 테(눈꺼풀 아래만)
    circle(ink, (534, 438), 47, 1)        # 눈알
    circle(ink, (517, 417), 11, 0); circle(ink, (533, 429), 4.5, 0)       # 반짝임
    # 2) 먼 눈 위의 잔선
    Z.poly(ink, [(770, 342), (797, 343), (797, 357), (785, 363), (771, 363)], 0)
    # 3) 입 밖으로 매달린 송곳니
    Z.poly(ink, [(798, 566), (828, 562), (828, 638), (786, 638), (786, 600), (798, 598)], 0)
    ink = fill_holes_in(ink, [(762, 564, 796, 596)])                 # 송곳니 옆에 남은 자잘한 이빨 둘
    Z.poly(ink, [(802, 572), (804, 610), (768, 610)], 0)             # 윗입술 끝을 비스듬히 다듬는다
    return ink

def edit_strong(ink):
    """아이콘용: 입 안은 송곳니 셋과 혀만 남긴다."""
    ink = ink.copy()
    ink = fill_holes_in(ink, [(582, 560, 668, 598), (712, 556, 800, 606), (556, 604, 745, 712), (688, 722, 760, 754)])
    Z.poly(ink, [(590, 650), (612, 634), (646, 630), (676, 644), (694, 668), (690, 684), (670, 672), (644, 660), (616, 656), (598, 660)], 0)   # 혀
    return ink

def thicken(ink, r):
    holes = Z.small_holes(ink)
    thick = cv2.dilate(ink, Z.disk(int(round(r * S))))
    return (thick & (1 - holes)).astype(np.uint8)

def build(r=3.5, sm=1.5, sm_left=None, strong=False):
    ink0 = Z.load_ink()
    ink1, removed = Z.drop_small(ink0, 1100)
    ink2 = edit(ink1)
    if strong:
        ink2 = edit_strong(ink2)
    ink2, _ = Z.drop_small(ink2, 500)
    ink3 = thicken(ink2, r)
    circle(ink3, (771, 579), 9, 1)        # 굵게 한 뒤 남는 작은 구멍 하나
    out = Z.smooth(ink3, sm)
    if sm_left:
        # 귀와 목털 쪽(왼쪽)은 더 세게 다듬어 잔가시를 줄인다
        strong = Z.smooth(ink3, sm_left)
        h, w = out.shape
        ramp = np.clip((np.arange(w) / S - 400) / 60.0, 0, 1)[None, :]      # x<400: 왼쪽, x>460: 오른쪽
        mix = strong.astype(np.float32) * (1 - ramp) + out.astype(np.float32) * ramp
        out = (mix > 0.5).astype(np.uint8)
    return ink2, out

if __name__ == "__main__":
    ink2, final = build(sm_left=3.2)
    fill = Z.inside(final, close_r=5)
    _, strong = build(r=5.0, sm=2.2, sm_left=4.0, strong=True)
    sfill = Z.inside(strong, close_r=5)
    np.save('final_ink.npy', final); np.save('final_fill.npy', fill); np.save('strong_ink.npy', strong); np.save('strong_fill.npy', sfill)
    orig = Z.load_ink()
    row1 = np.hstack([Z.render(orig, size=560), Z.render(final, size=560), Z.render(strong, size=560)])
    row2 = np.hstack([Z.render(orig, Z.inside(orig, close_r=5), size=560), Z.render(final, fill, size=560), Z.render(strong, sfill, size=560)])
    cv2.imwrite('m_cmp.png', np.vstack([row1, row2]))
    # 작은 크기 비교: 84 / 48 / 32 / 16 을 3배로 키워서 본다
    rows = []
    for ink_, fill_ in ((orig, None), (final, None), (final, fill), (strong, None), (strong, sfill)):
        big = Z.render(ink_, fill_, size=1024)
        cells = []
        for sz in (84, 48, 32, 16):
            sm_ = cv2.resize(big, (sz, sz), interpolation=cv2.INTER_AREA)
            cell = np.zeros((84 * 3, sz * 3 + 12, 3), np.uint8); cell[:] = (243, 250, 255)
            up = cv2.resize(sm_, (sz * 3, sz * 3), interpolation=cv2.INTER_NEAREST)
            cell[84 * 3 - sz * 3:, :sz * 3] = up
            cells.append(cell)
        rows.append(np.hstack(cells))
    cv2.imwrite('m_small.png', np.vstack(rows))
