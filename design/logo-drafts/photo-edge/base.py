# 사진을 다듬어 작업용 바탕을 만든다: 잘린 윗머리 메우기, 여백 붙이기, 4배 키우기, 마스크.
# 아래 숫자(위쪽 흰 띠 13줄, 구글 표시 자리, 윗머리 원)는 2026-11-14에 받은 사진(500×332)에 맞춘 값이다.
# 다른 사진을 쓰려면 load()와 CA·CB·CR, variants.py의 X0·Y0, final.py의 동전 자리(0.68, 236, 100)를 다시 맞춘다.
import os
import cv2, numpy as np
# 사진 파일은 저장소에 넣지 않는다(권리 미확인). 경로는 환경 변수로 준다: CHI_PHOTO=/어딘가/사진.png
SRC = os.environ.get('CHI_PHOTO', 'photo.png')
PT, PB, PL, PR = 100, 84, 24, 48      # 위·아래·왼쪽·오른쪽 여백(원본 픽셀)
S = 4                                 # 키우는 배수
BG = 252
CA, CB, CR = 217.7, 180.0, 181.25     # 윗머리에 맞춘 원(가운데 x, y, 반지름)

def load():
    im = cv2.imread(SRC)
    im[:13] = BG
    cv2.circle(im, (30, 316), 26, (BG, BG, BG), -1)
    i = im.astype(np.int32); mn = i.min(2); ch = i.max(2) - mn
    fg = (~((mn > 225) & (ch < 14))).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
    fg = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    inv = 1 - fg; n2, lab2, _, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    border = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]])))
    for k in range(1, n2):
        if k not in border: fg[lab2 == k] = 1
    return im, fg

def padded():
    im, fg = load()
    H, W = fg.shape
    # 위: 배경, 아래·오른쪽: 가장자리 줄을 그대로 늘림(잘린 목·귀가 이어지게), 왼쪽: 배경
    # 오른쪽은 거울처럼 접어 붙인다(잘린 귀 끝이 자연스럽게 이어지도록), 아래는 마지막 줄을 늘린다
    imp = cv2.copyMakeBorder(im[13:], 0, 0, 0, PR, cv2.BORDER_REFLECT)
    fgp = cv2.copyMakeBorder(fg[13:], 0, 0, 0, PR, cv2.BORDER_REFLECT)
    imp = cv2.copyMakeBorder(imp, 0, PB, 0, 0, cv2.BORDER_REPLICATE)
    fgp = cv2.copyMakeBorder(fgp, 0, PB, 0, 0, cv2.BORDER_REPLICATE)
    imp = cv2.copyMakeBorder(imp, PT + 13, 0, PL, 0, cv2.BORDER_CONSTANT, value=(BG, BG, BG))
    fgp = cv2.copyMakeBorder(fgp, PT + 13, 0, PL, 0, cv2.BORDER_CONSTANT, value=0)
    # 잘린 윗머리: 13번째 줄을 거울 삼아 위로 접어 올리고, 원 안쪽만 남긴다
    y13 = PT + 13
    yy, xx = np.mgrid[0:imp.shape[0], 0:imp.shape[1]]
    cap = ((xx - (CA + PL)) ** 2 + (yy - (CB + PT)) ** 2 <= CR ** 2) & (yy < y13)
    for d in range(1, 18):
        row = imp[y13 + d - 1].copy()
        m = cap[y13 - d]
        imp[y13 - d][m] = row[m]
    fgp[cap] = 1
    return imp, fgp

def upscaled():
    imp, fgp = padded()
    big = cv2.resize(imp, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    # 마스크는 부드럽게 키운 뒤 다시 자른다(계단 없애기)
    m = cv2.resize(fgp.astype(np.float32), None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    m = cv2.GaussianBlur(m, (0, 0), 8.0)
    mask = (m > 0.5).astype(np.uint8)
    return big, mask

if __name__ == "__main__":
    big, mask = upscaled()
    cv2.imwrite('big.png', big); cv2.imwrite('mask_big.png', mask * 255)
    print(big.shape)
    prev = big.copy(); prev[mask == 0] = (58, 86, 184)
    cv2.imwrite('prev_cut.png', cv2.resize(prev, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))
