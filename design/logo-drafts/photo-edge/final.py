# 시안에 올릴 그림 네 장을 만든다.
import os
import cv2, numpy as np
from base import upscaled
import variants as V
import coin_fit as C

os.makedirs('out', exist_ok=True)
big, mask = upscaled()
ms = V.smooth2()
ink = V.ink_mask(big, eps=0.5)
ink_light = V.ink_mask(big, eps=0.42)
outs = {
    'photo-sticker': V.export(V.compose(V.sticker_body(big), mask, True)),
    'photo-toon': V.export(V.compose(V.toon_body(big, mask, ms, ink=ink_light), mask, True)),
    'photo-stamp': V.export(V.compose(V.stamp_body(big, ink), mask, False)),
}
coin = cv2.imread('coin-blank.png', cv2.IMREAD_UNCHANGED)
outs['photo-gold-coin'] = C.compose_coin(coin, C.place(C.gold_layer(True), 0.68, 236, 100))
for name, im in outs.items():
    cv2.imwrite(f'out/{name}.png', im, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    print(name, im.shape)

def tile(im, bg, size):
    t = V.on(bg, im)
    return cv2.resize(t, (size, size), interpolation=cv2.INTER_AREA)
Y = '#f7c84a'
big_row = np.hstack([tile(outs[k], Y, 400) for k in outs])
pad = np.zeros((140, big_row.shape[1], 3), np.uint8); pad[:] = V.hexbgr('#fffaf3')
x = 10
for k in outs:
    for sz in (112, 60, 32, 16):
        t = tile(outs[k], Y, sz)
        pad[10:10 + sz, x:x + sz] = t; x += sz + 12
    x += 30
cv2.imwrite('prev_final.png', np.vstack([big_row, pad]))
