# 선 뽑기 실험: 부드럽게 한 흑백 사진에서 XDoG로 잉크 같은 선을 만든다.
import cv2, numpy as np, sys
from base import padded, S

def smooth_gray(scale=2):
    imp, fgp = padded()
    I = cv2.resize(imp, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    for _ in range(3):
        I = cv2.bilateralFilter(I, 9, 30, 7)
    g = cv2.cvtColor(I, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32) / 255.0
    return I, g, fgp

def xdog(g, sigma=1.4, k=1.6, p=20.0, eps=0.55, phi=12.0):
    g1 = cv2.GaussianBlur(g, (0, 0), sigma)
    g2 = cv2.GaussianBlur(g, (0, 0), sigma * k)
    s = (1 + p) * g1 - p * g2
    out = np.where(s >= eps, 1.0, 1.0 + np.tanh(phi * (s - eps)))
    return np.clip(out, 0, 1)

if __name__ == "__main__":
    I, g, fgp = smooth_gray(2)
    tiles = []
    for (sigma, p, eps, phi) in ((1.4, 20, 0.55, 12), (2.0, 20, 0.5, 12), (2.0, 30, 0.45, 20), (2.8, 25, 0.45, 20)):
        o = xdog(g, sigma=sigma, p=p, eps=eps, phi=phi)
        t = (o * 255).astype(np.uint8)
        cv2.putText(t, f"s{sigma} p{p} e{eps} phi{phi}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, 0, 2)
        tiles.append(cv2.resize(t, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))
    top = np.hstack(tiles[:2]); bot = np.hstack(tiles[2:])
    cv2.imwrite('xdog_test.png', np.vstack([top, bot]))
