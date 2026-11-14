# 벡터 경로로 아이콘 칸(SVG)을 만든다.
import json, sys
import numpy as np
P = json.load(open('paths.json'))
INK, PAPER = "#5a3210", "#fff2c8"

def framing(mask_name, target=0.80):
    m = np.load(mask_name)
    ys, xs = np.where(m > 0)
    x0, x1, y0, y1 = xs.min() / 2, xs.max() / 2, ys.min() / 2, ys.max() / 2
    w, h = x1 - x0, y1 - y0
    s = min(1024 * target / w, 1024 * 0.84 / h)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return f"translate(512 512) scale({s:.4f}) translate({-cx:.1f} {-cy:.1f})", (x0, x1, y0, y1, s)

TF, BOX = framing('final_ink.npy')
TFS, BOXS = framing('strong_ink.npy')

def art(kind, fill=True):
    ink = P[kind + '_ink']; fl = P[kind + '_fill']; tf = TF if kind == 'final' else TFS
    f = f'<path d="{fl}" style="fill: {PAPER}; fill-rule: evenodd"/>' if fill else ''
    return f'<g transform="{tf}">{f}<path d="{ink}" style="fill: {INK}; fill-rule: evenodd"/></g>'

def svg(kind, size, bg, radius, fill=True, extra=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="{size}" height="{size}" style="display: block; border-radius: {radius}px; background: {bg}{extra}">{art(kind, fill)}</svg>'

if __name__ == "__main__":
    print('frame', BOX, BOXS)
    Y, T = "#f7c84a", "#b8563a"
    big = "".join(svg(k, 420, bg, 92, f) for k, bg, f in (('final', Y, False), ('final', Y, True), ('strong', Y, True), ('final', T, True)))
    small = ""
    for k, f in (('final', False), ('final', True), ('strong', True)):
        small += '<div style="display:flex;gap:10px;align-items:flex-end;margin-right:30px">' + "".join(svg(k, sz, Y, int(sz * 0.22), f) for sz in (84, 48, 32, 16)) + '</div>'
    open('chi_preview.html', 'w').write(f'<!doctype html><meta charset="utf-8"><body style="margin:0;background:#f7ede2"><div style="display:flex;gap:16px;padding:16px">{big}</div><div style="display:flex;padding:0 16px">{small}</div>')
