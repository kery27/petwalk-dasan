# 받은 그림에서 '사진의 자세'가 드러나는 부분(뒤로 젖힌 귀, 목털, 턱털, 입 안)을 빼고 새로 그린 것으로 바꾼 판(E안).
#   python3 make2.py /경로/받은그림.png --b      (make.py 를 먼저 돌려 둔다)
# build2()는 입까지 통째로 새로 그려 본 첫 시도이고, 시안에 쓴 것은 build2b()다.
# 남기는 것: 둥근 머리, 눈(다시 그린 것), 눈썹 가시, 먼 눈, 코.  새로 그리는 것: 선 귀 둘, 입(도장 판의 입), 목털 조금.
import sys, re
import cv2, numpy as np
import simplify as Z
import make as M
S = Z.S
CX, CY, RO, T = 505.5, 511.3, 354.2, 13.5      # 머리 원(바깥 반지름)과 선 굵기

def sample(d, n=14):
    """SVG 경로(M L C Q Z, 절대 좌표)를 점 목록으로."""
    toks = re.findall(r'[MLCQZ]|-?\d+\.?\d*', d)
    pts, i, cur = [], 0, None
    while i < len(toks):
        c = toks[i]; i += 1
        if c in 'ML':
            cur = (float(toks[i]), float(toks[i + 1])); i += 2; pts.append(cur)
        elif c == 'C':
            p = [cur] + [(float(toks[i + k]), float(toks[i + k + 1])) for k in (0, 2, 4)]; i += 6
            for t in np.linspace(0, 1, n)[1:]:
                a = (1 - t) ** 3; b = 3 * (1 - t) ** 2 * t; c2 = 3 * (1 - t) * t * t; e = t ** 3
                pts.append((a * p[0][0] + b * p[1][0] + c2 * p[2][0] + e * p[3][0], a * p[0][1] + b * p[1][1] + c2 * p[2][1] + e * p[3][1]))
            cur = p[3]
        elif c == 'Q':
            p = [cur] + [(float(toks[i + k]), float(toks[i + k + 1])) for k in (0, 2)]; i += 4
            for t in np.linspace(0, 1, n)[1:]:
                pts.append(((1 - t) ** 2 * p[0][0] + 2 * (1 - t) * t * p[1][0] + t * t * p[2][0], (1 - t) ** 2 * p[0][1] + 2 * (1 - t) * t * p[1][1] + t * t * p[2][1]))
            cur = p[2]
    return pts

def fill(mask, d_or_pts, val, tf=None):
    pts = sample(d_or_pts) if isinstance(d_or_pts, str) else d_or_pts
    if tf: pts = [tf(x, y) for x, y in pts]
    cv2.fillPoly(mask, [np.array([(int(round(x * S)), int(round(y * S))) for x, y in pts], np.int32)], val)

def stroke(mask, pts, w, val):
    cv2.polylines(mask, [np.array([(int(round(x * S)), int(round(y * S))) for x, y in pts], np.int32)], False, val, int(round(w * S)), lineType=cv2.LINE_8)

def polar(h, w):
    yy, xx = np.mgrid[0:h, 0:w]
    dx = xx / S - CX; dy = yy / S - CY
    return np.hypot(dx, dy), (np.degrees(np.arctan2(dy, dx)) + 360) % 360, xx / S, yy / S

# --- 새로 그리는 부분 ---
def P(th, r):
    t = np.radians(th); return (CX + r * np.cos(t), CY + r * np.sin(t))

def ear(base0, base1, tip_th, tip_r, bulge=0.16, round_r=16):
    """머리 원 위의 두 각도(base0→base1) 사이에서 솟는 귀. 바깥선 점 목록을 준다."""
    a, b, t = P(base0, RO - 40), P(base1, RO - 40), P(tip_th, tip_r)
    def edge(p, q, sgn):
        mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
        nx, ny = -(q[1] - p[1]), (q[0] - p[0])
        c = (mx + sgn * bulge * nx, my + sgn * bulge * ny)
        return [((1 - u) ** 2 * p[0] + 2 * (1 - u) * u * c[0] + u * u * q[0], (1 - u) ** 2 * p[1] + 2 * (1 - u) * u * c[1] + u * u * q[1]) for u in np.linspace(0, 1, 16)]
    return edge(a, t, -1) + edge(t, b, -1)[1:]

def shrink(pts, k, toward):
    return [(toward[0] + (x - toward[0]) * k, toward[1] + (y - toward[1]) * k) for x, y in pts]

def build2(small_teeth=True, r=3.5, sm=1.5):
    ink0 = Z.load_ink()
    ink1, _ = Z.drop_small(ink0, 1100)
    ink = M.edit(ink1)                       # 눈 다시 그리기, 잔선·매달린 송곳니 지우기
    h, w = ink.shape
    rad, ang, X, Y = polar(h, w)
    # 1) 뒤로 젖힌 귀와 목털(왼쪽), 입·볼 주름·턱털(아래)을 지운다
    ink[X < 410] = 0
    er = np.zeros_like(ink)
    Z.poly(er, [(495, 512), (600, 512), (700, 540), (716, 548), (716, 566), (845, 566), (866, 600), (866, 900), (495, 900)], 1)
    ink[er > 0] = 0
    # 2) 머리 테두리는 원으로 다시 긋는다(코가 나온 오른쪽만 원래 선을 둔다)
    arc = ((ang >= 12) & (ang <= 325))
    ink[arc & (rad > RO - T - 10)] = 0
    ink[(rad > RO + 10) & (X < 700)] = 0
    # 3) 선 귀 둘: 테두리 + 안쪽 어두운 면 + 밝은 줄 하나. 머리 원 바깥 부분만 보인다
    ears = np.zeros_like(ink)
    for (b0, b1, tth, tr, k) in ((196, 258, 221, 1.70 * RO, 0.74), (284, 322, 304, 1.46 * RO, 0.70)):
        pts = ear(b0, b1, tth, tr)
        o = np.zeros_like(ink); fill(o, pts, 1)
        o = Z.smooth(o, 5)                                   # 귀 끝을 둥글게
        line = o & (1 - cv2.erode(o, Z.disk(int(T * S))))
        base_mid = P((b0 + b1) / 2, RO - 60)
        i_ = np.zeros_like(ink); fill(i_, shrink(pts, k, base_mid), 1)
        i_ = Z.smooth(i_, 4) & cv2.erode(o, Z.disk(int((T + 8) * S)))
        tip = P(tth, tr); st = [P((b0 + b1) / 2, RO + 6), ((base_mid[0] + tip[0]) / 2, (base_mid[1] + tip[1]) / 2), (base_mid[0] + (tip[0] - base_mid[0]) * 0.74, base_mid[1] + (tip[1] - base_mid[1]) * 0.74)]
        stroke(i_, st, 8, 0)
        ears |= (line | i_)
    ink |= (ears & (rad > RO - T / 2).astype(np.uint8))
    ink[arc & (rad <= RO) & (rad >= RO - T)] = 1
    # 4) 입: 머리 원의 오른쪽 아래를 크게 벌린 입으로 쓴다(아래턱 선 = 머리 테두리)
    top = [(832, 556), (808, 566), (770, 576), (720, 586), (670, 598), (628, 616), (598, 640), (584, 668)]
    jaw = [(592, 712), (616, 756), (652, 790)]
    arc_pts = [P(th, RO - T) for th in np.linspace(62, 12, 26)]
    mouth = np.zeros_like(ink); fill(mouth, top + jaw + arc_pts, 1)
    ink[mouth > 0] = 1
    stroke(ink, top, 16, 1); stroke(ink, [top[-1]] + jaw + [P(64, RO - T / 2)], 14, 1)
    teeth = np.zeros_like(ink)
    fangs = [[(690, 600), (718, 592), (722, 632), (712, 668)],            # 위 송곳니(가까운 쪽)
             [(792, 578), (814, 572), (812, 606), (802, 632)],            # 위 송곳니(먼 쪽)
             [(744, 742), (776, 716), (760, 690), (740, 664)],            # 아래 송곳니
             [(640, 768), (664, 786), (662, 756), (650, 730)]]            # 아래 송곳니(안쪽)
    small = [[(748, 590), (762, 587), (756, 606)], [(765, 586), (778, 583), (773, 602)],
             [(668, 606), (684, 602), (678, 628)], [(646, 616), (662, 610), (657, 636)], [(624, 630), (640, 622), (637, 648)],
             [(686, 794), (706, 800), (698, 770)], [(716, 800), (734, 792), (722, 766)]]
    tongue = [(642, 708), (668, 688), (704, 682), (734, 694), (748, 716), (736, 734), (704, 738), (668, 734), (648, 724)]
    for poly_ in fangs + (small if small_teeth else []) + [tongue]:
        fill(teeth, poly_, 1)
    ink[(teeth > 0) & (mouth > 0)] = 0
    # 5) 입꼬리 주름 하나, 목털 가시 셋
    stroke(ink, [(578, 664), (560, 640), (556, 610)], 9, 1)
    for th, ln in ((114, 46), (127, 58), (141, 44)):
        a0, a1, at = np.radians(th - 6), np.radians(th + 6), np.radians(th + 5)
        tri = [(CX + (RO - 6) * np.cos(a0), CY + (RO - 6) * np.sin(a0)), (CX + (RO - 6) * np.cos(a1), CY + (RO - 6) * np.sin(a1)), (CX + (RO + ln) * np.cos(at), CY + (RO + ln) * np.sin(at))]
        fill(ink, tri, 1)
    ink, _ = Z.drop_small(ink, 300)
    pre = ink.copy()
    out = Z.smooth(M.thicken(ink, r), sm)
    return pre, out

if __name__ == "__main__":
    pre, final = build2()
    fl = Z.inside(final, close_r=5)
    _, strong = build2(small_teeth=False, r=5.0, sm=2.2)
    sfl = Z.inside(strong, close_r=5)
    np.save('v2_ink.npy', final); np.save('v2_fill.npy', fl); np.save('v2s_ink.npy', strong); np.save('v2s_fill.npy', sfl)
    cv2.imwrite('v2_cmp.png', np.hstack([Z.render(np.load('final_ink.npy'), np.load('final_fill.npy'), size=600), Z.render(final, fl, size=600), Z.render(strong, sfl, size=600)]))


# --- 두 번째 방식: 입 테두리는 두고(안쪽 이빨·혀는 새로 그린 것), 귀·목털·턱털만 새로 ---
EAR2_NEAR = "M185 362 C150 290 96 150 110 60 C112 44 126 36 142 40 C230 52 360 100 432 165 L360 300 Z"
EAR2_NEAR_IN = "M206 330 C176 268 138 160 146 84 C220 96 330 136 396 186 L330 280 Z"
EAR2_FAR = "M603 171 C640 110 720 60 770 46 C786 42 798 52 800 68 C806 140 800 220 777 284 L690 320 Z"
EAR2_FAR_IN = "M628 176 C660 126 724 84 768 70 C776 72 778 80 778 90 C782 150 776 214 760 262 L690 300 Z"

def build2b(strong_mouth=True, r=3.5, sm=1.5):
    ink0 = Z.load_ink()
    ink1, _ = Z.drop_small(ink0, 1100)
    ink = M.edit(ink1)
    if strong_mouth:
        ink = M.edit_strong(ink)             # 입 안: 송곳니 셋 + 새로 그린 혀
    h, w = ink.shape
    rad, ang, X, Y = polar(h, w)
    # 1) 뒤로 젖힌 귀·목털(왼쪽), 턱 밑 털을 지운다
    ink[X < 410] = 0
    Z.poly(ink, [(486, 700), (500, 694), (540, 738), (580, 765), (620, 788), (660, 803), (680, 806), (640, 826), (600, 838), (540, 842), (480, 842), (470, 760)], 0)
    # 2) 머리 테두리: 왼쪽·위·아래는 원으로 다시 긋는다(오른쪽 코와 턱은 원래 선)
    arc = ((ang >= 75) & (ang <= 325))
    ink[arc & (rad > RO - T - 10)] = 0
    ink[(rad > RO + 10) & (X < 600)] = 0
    # 3) 선 귀 둘
    ears = np.zeros_like(ink)
    for outer, inner, streak in ((EAR2_NEAR, EAR2_NEAR_IN, [(268, 262), (210, 170), (172, 112)]), (EAR2_FAR, EAR2_FAR_IN, [(716, 214), (748, 140), (764, 98)])):
        o = np.zeros_like(ink); fill(o, outer, 1)
        o = Z.smooth(o, 10)                                  # 귀 끝을 둥글게
        line = o & (1 - cv2.erode(o, Z.disk(int(T * S))))
        i_ = np.zeros_like(ink); fill(i_, inner, 1)
        i_ = Z.smooth(i_, 4) & cv2.erode(o, Z.disk(int((T + 9) * S)))
        stroke(i_, streak, 8, 0)
        ears |= (line | i_)
    ink |= (ears & (rad > RO - T / 2).astype(np.uint8))
    ring = ((ang >= 54) & (ang <= 327))                 # 원래 턱선·이마선과 겹치게 조금 더 길게 긋는다
    ink[ring & (rad <= RO) & (rad >= RO - T)] = 1
    # 4) 목털 가시 셋(새로 그린 것)
    for th, ln in ((120, 34), (132, 46), (144, 32)):
        a0, a1, at = np.radians(th - 5), np.radians(th + 5), np.radians(th + 9)
        tri = [(CX + (RO - 6) * np.cos(a0), CY + (RO - 6) * np.sin(a0)), (CX + (RO - 6) * np.cos(a1), CY + (RO - 6) * np.sin(a1)), (CX + (RO + ln) * np.cos(at), CY + (RO + ln) * np.sin(at))]
        fill(ink, tri, 1)
    ink, _ = Z.drop_small(ink, 300)
    return Z.smooth(M.thicken(ink, r), sm)

if __name__ == "__main__" and '--b' in sys.argv:
    fin = build2b()
    fl = Z.inside(fin, close_r=5)
    np.save('v2b_ink.npy', fin); np.save('v2b_fill.npy', fl)
    cv2.imwrite('v2b_cmp.png', np.hstack([Z.render(np.load('final_ink.npy'), np.load('final_fill.npy'), size=640), Z.render(fin, fl, size=640), Z.render(np.load('v2_ink.npy'), np.load('v2_fill.npy'), size=640)]))
