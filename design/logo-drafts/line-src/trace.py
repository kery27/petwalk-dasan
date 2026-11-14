# 다듬은 마스크를 벡터(SVG 경로)로 바꾼다.
import sys, time, json
import numpy as np, potrace

def path_d(mask, scale, turd=12, tol=0.35):
    bm = potrace.Bitmap(~mask.astype(bool))     # 이 라이브러리는 거짓(검정) 쪽을 따라 그린다
    plist = bm.trace(turdsize=turd, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=tol)
    f = lambda v: f"{v * scale:.1f}".rstrip('0').rstrip('.')
    out = []
    for curve in plist:
        s = curve.start_point
        out.append(f"M{f(s.x)} {f(s.y)}")
        for seg in curve.segments:
            if seg.is_corner:
                out.append(f"L{f(seg.c.x)} {f(seg.c.y)}L{f(seg.end_point.x)} {f(seg.end_point.y)}")
            else:
                out.append(f"C{f(seg.c1.x)} {f(seg.c1.y)} {f(seg.c2.x)} {f(seg.c2.y)} {f(seg.end_point.x)} {f(seg.end_point.y)}")
        out.append("Z")
    return "".join(out), len(plist)

if __name__ == "__main__":
    res = {}
    for name in ('final_ink', 'final_fill', 'strong_ink', 'strong_fill'):
        m = np.load(name + '.npy')
        t = time.time()
        d, n = path_d(m, 0.5)
        res[name] = d
        print(name, 'curves', n, 'chars', len(d), 'sec', round(time.time() - t, 1))
    json.dump(res, open('paths.json', 'w'))
