# 도장 풍 치와와: 새로 그린 그림(흑백으로 그린 뒤 필터로 잉크 한 색으로 바꾼다). 사진은 쓰지 않는다.
import sys

INK = "#5a3210"
PAPER = "#fff2c8"
SW = 3.6   # 윤곽선 굵기(그림 좌표)

HEAD_S = "M146 140 C144 112 172 88 212 88 C256 88 292 112 296 152 C299 182 292 214 276 238 C264 254 248 266 228 276 C208 288 180 298 158 296 C144 294 134 284 134 272 C134 264 132 257 129 251 C121 246 114 238 113 228 C111 216 116 205 126 202 C132 200 134 195 134 190 C124 178 124 160 132 152 C138 147 144 146 146 140 Z"
NECK_S = "M270 226 C280 262 290 290 306 312 C320 330 340 344 368 352 L368 440 L160 440 C184 404 204 366 210 336 C213 320 214 304 214 284 Z"
EAR_FAR = "M198 92 C186 70 160 40 136 26 C128 22 120 26 120 34 C118 66 128 100 150 128 Z"
EAR_NEAR = "M232 96 C240 70 276 34 302 22 C312 18 320 24 320 34 C324 78 316 122 294 152 C274 142 250 122 232 96 Z"
MOUTH_S = "M130 254 C137 245 150 242 162 244 C178 247 194 253 206 264 C202 277 190 287 172 291 C158 294 144 289 138 279 C134 271 131 262 130 254 Z"

def K(d, extra=""):      # 검은 면
    return f'<path d="{d}" style="fill: #000{extra}"/>'
def W(d):                # 흰 면(종이)
    return f'<path d="{d}" style="fill: #fff"/>'
def L(d, w=3.0, c="#000"):   # 선
    return f'<path d="{d}" style="fill: none; stroke: {c}; stroke-width: {w}; stroke-linecap: round; stroke-linejoin: round"/>'
def SHAPE(d):            # 흰 면 + 검은 윤곽
    return f'<path d="{d}" style="fill: #fff; stroke: #000; stroke-width: {SW}; stroke-linejoin: round"/>'

SIDE_ART = "".join([
    # 목, 턱 밑 그늘
    SHAPE(NECK_S),
    K("M214 284 C236 274 258 258 276 236 C284 258 278 282 260 298 C247 309 231 314 216 316 C216 305 215 295 214 284 Z"),
    L("M250 326 l-2 12 M270 318 l0 12 M290 312 l2 12", 2.6),
    # 먼 쪽 귀
    SHAPE(EAR_FAR),
    K("M186 92 C176 74 156 52 138 40 C132 38 130 42 130 48 C130 72 138 96 154 116 Z"),
    L("M150 100 C145 84 141 66 139 52", 2.6, "#fff"),
    # 머리
    SHAPE(HEAD_S),
    # 가까운 눈
    '<circle cx="208" cy="176" r="28" style="fill: #000"/>',
    '<g clip-path="url(#stEyeN)">' + W("M166 186 L244 149 L248 120 L166 120 Z") + '</g>',
    K("M170 187 C167 181 169 174 176 171 L239 144 C243 146 243 151 240 154 Z"),
    '<circle cx="202" cy="185" r="6.5" style="fill: #fff"/><circle cx="217" cy="196" r="3.2" style="fill: #fff"/>',
    # 먼 눈
    '<ellipse cx="146" cy="172" rx="15" ry="22" style="fill: #000"/>',
    '<g clip-path="url(#stEyeFar)">' + W("M168 184 L124 151 L120 120 L168 120 Z") + '</g>',
    K("M166 185 C169 180 168 174 163 171 L131 150 C128 151 127 155 129 158 Z"),
    '<circle cx="142" cy="179" r="4.5" style="fill: #fff"/>',
    # 미간, 콧등 주름
    L("M171 160 Q174 168 172 176", 2.8),
    L("M168 198 Q166 205 172 210 M157 204 Q155 211 161 216", 3.0),
    # 코, 코 밑 그늘
    K("M108 215 C108 206 118 201 128 203 C135 205 139 212 137 220 C134 228 122 231 114 228 C109 226 108 220 108 215 Z"),
    W("M113 211 C116 207 123 206 127 208 C122 209 118 211 115 215 Z"),
    K("M113 229 C119 235 124 241 130 251 C135 246 143 243 153 243 C145 239 137 234 131 229 C125 231 119 231 113 229 Z"),
    # 윗입술 주름, 수염 자리
    L("M148 235 C160 229 177 232 190 243", 3.0),
    '<circle cx="152" cy="224" r="2.4" style="fill: #000"/><circle cx="162" cy="222" r="2.4" style="fill: #000"/><circle cx="172" cy="226" r="2.4" style="fill: #000"/>',
    # 입
    f'<path d="{MOUTH_S}" style="fill: #000; stroke: #000; stroke-width: 5; stroke-linejoin: round"/>',
    '<g clip-path="url(#stMouth)">',
    W("M140 249 L158 247 L158 253 C156 258 153.5 258 152 254 C150.5 259 147.5 259 146 255 C144.5 259 141.5 259 140.5 255 Z"),
    W("M132 256 C133 262 135 267 137.5 271 C139 266 140.5 260 140.5 253 Z"),
    W("M161 246 C161 258 164 270 170 279 C173 270 175 259 174 250 Z"),
    W("M177 252 L181 261 L185.5 254 Z"), W("M187.5 255.5 L191 263.5 L195.5 258 Z"), W("M197 259.5 L199.5 266 L203 262 Z"),
    W("M138 279 Q140.5 272 144 277 Q146.5 271 149 277.5 Q151.5 273 154 279 L156 290 L140 286 Z"),
    W("M156 291 C157 282 159.5 274 163 268 C166.5 274 169 282 170 290 Z"),
    W("M174 289 L178 281 L182 288 Z"), W("M184 286 L187.5 278 L191 284 Z"),
    W("M173 276 C179 271 189 271 197 275 C189 275 181 277 177 281 Z"),
    '</g>',
    # 입꼬리 주름
    L("M212 264 C218 272 216 282 208 290", 3.0),
    # 가까운 귀
    SHAPE(EAR_NEAR),
    K("M246 98 C254 78 282 50 302 38 C308 35 312 39 312 45 C314 78 308 114 292 138 C276 130 258 116 246 98 Z"),
    L("M262 104 C274 86 290 66 304 52", 3.0, "#fff"),
    L("M279 122 C289 104 298 84 306 66", 2.4, "#fff"),
])
SIDE_FILL = "".join(f'<path d="{d}"/>' for d in (NECK_S, EAR_FAR, HEAD_S, EAR_NEAR))
SIDE_TF = "translate(206 16) scale(1.3) translate(-215 -18)"
SIDE_DEFS = f'<clipPath id="stMouth"><path d="{MOUTH_S}"/></clipPath><clipPath id="stEyeN"><circle cx="208" cy="176" r="28"/></clipPath><clipPath id="stEyeFar"><ellipse cx="146" cy="172" rx="15" ry="22"/></clipPath>'

HEAD_F = "M194 94 C238 94 280 116 292 158 C299 184 297 212 286 236 C277 255 264 268 254 280 C242 300 224 318 194 318 C164 318 146 300 134 280 C124 268 111 255 102 236 C91 212 89 184 96 158 C108 116 150 94 194 94 Z"
MOUTH_F = "M144 268 C145 254 158 246 176 246 L194 250 L212 246 C230 246 243 254 244 268 C244 288 226 306 194 306 C162 306 144 288 144 268 Z"
NECK_F = "M160 290 C156 310 140 326 112 340 C92 350 80 376 76 440 L312 440 C308 376 296 350 276 340 C248 326 232 310 228 290 Z"
EAR_F = "M232 102 C246 78 286 44 318 36 C328 34 336 40 336 50 C338 96 322 144 294 178 L252 150 Z"

def MIR(sv):
    return f'<g transform="translate(388 0) scale(-1 1)">{sv}</g>'

F_EAR = SHAPE(EAR_F) + K("M250 108 C262 90 292 62 316 52 C322 50 326 54 326 60 C326 96 314 134 294 160 C276 146 260 128 250 108 Z") + L("M270 124 C284 104 300 84 314 68", 3.0, "#fff") + L("M285 141 C297 122 308 101 317 82", 2.4, "#fff")
F_EYE = "".join([
    '<circle cx="248" cy="186" r="29" style="fill: #000"/>',
    '<g clip-path="url(#stEyeF)">' + W("M204 189 L286 151 L290 120 L204 120 Z") + '</g>',
    K("M207 191 C204 185 206 178 213 175 L281 146 C285 148 285 153 282 156 Z"),
])
F_SIDE = "".join([
    L("M221 225 C229 220 233 213 233 205", 3.0),
    '<circle cx="230" cy="239" r="2.4" style="fill: #000"/><circle cx="238" cy="248" r="2.4" style="fill: #000"/><circle cx="226" cy="250" r="2.4" style="fill: #000"/>',
    L("M200 168 Q197 178 199 188", 3.0),
])
F_TEETH = W("M218 256 C219 268 221 280 225 288 C229 280 232 268 233 256 Z") + W("M208 304 C209 295 211 286 214 280 C217 286 219 295 220 302 Z")

FRONT_ART = "".join([
    SHAPE(NECK_F),
    K("M146 296 C162 322 178 330 194 330 C210 330 226 322 242 296 C238 324 218 342 194 342 C170 342 150 324 146 296 Z"),
    L("M174 352 l-2 11 M194 355 l0 12 M214 352 l2 11", 2.6),
    F_EAR, MIR(F_EAR),
    SHAPE(HEAD_F),
    F_EYE, MIR(F_EYE),
    '<circle cx="134" cy="188" r="7.5" style="fill: #fff"/><circle cx="151" cy="201" r="3.4" style="fill: #fff"/>',
    '<circle cx="242" cy="190" r="7.5" style="fill: #fff"/><circle cx="259" cy="202" r="3.4" style="fill: #fff"/>',
    F_SIDE, MIR(F_SIDE),
    L("M180 197 Q194 190 208 197", 3.0),
    K("M171 217 C171 209 182 205 194 205 C206 205 217 209 217 217 C217 228 206 237 194 237 C182 237 171 228 171 217 Z"),
    '<ellipse cx="185" cy="213" rx="6.5" ry="3" style="fill: #fff"/>',
    L("M194 237 L194 248", 3.4),
    f'<path d="{MOUTH_F}" style="fill: #000; stroke: #000; stroke-width: 5; stroke-linejoin: round"/>',
    '<g clip-path="url(#stMouthF)">',
    W("M172 255 L216 255 L216 263 Q212.3 271 208.7 263 Q205 271 201.3 263 Q197.7 271 194 263 Q190.3 271 186.7 263 Q183 271 179.3 263 Q175.7 271 172 263 Z"),
    W("M181 308 L181 298 Q184.25 292 187.5 298 Q190.75 292 194 298 Q197.25 292 200.5 298 Q203.75 292 207 298 L207 308 Z"),
    F_TEETH, MIR(F_TEETH),
    W("M178 289 C186 282 202 282 210 289 C202 286 186 286 178 289 Z"),
    '</g>',
])
FRONT_FILL = f'<path d="{NECK_F}"/><path d="{EAR_F}"/><g transform="translate(388 0) scale(-1 1)"><path d="{EAR_F}"/></g><path d="{HEAD_F}"/>'
FRONT_TF = "translate(200 20) scale(1.15) translate(-194 -30)"
FRONT_DEFS = f'<clipPath id="stMouthF"><path d="{MOUTH_F}"/></clipPath><clipPath id="stEyeF"><circle cx="248" cy="186" r="29"/></clipPath>'

def filters(rough=(0.03, 5.0, 0.11, 2.4), blur=1.2, slope=14):
    f1, s1, f2, s2 = rough
    disp = f'''<feTurbulence type="fractalNoise" baseFrequency="{f1}" numOctaves="2" seed="4" result="n1"/>
<feDisplacementMap in="SourceGraphic" in2="n1" scale="{s1}" xChannelSelector="R" yChannelSelector="G" result="d1"/>
<feTurbulence type="fractalNoise" baseFrequency="{f2}" numOctaves="1" seed="9" result="n2"/>
<feDisplacementMap in="d1" in2="n2" scale="{s2}" xChannelSelector="G" yChannelSelector="B" result="d2"/>'''
    region = 'filterUnits="userSpaceOnUse" x="-40" y="-40" width="480" height="480" color-interpolation-filters="sRGB"'
    return f'''<filter id="stampInk" {region}>
{disp}
<feColorMatrix in="d2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.3333 -0.3333 -0.3333 0 1" result="a"/>
<feGaussianBlur in="a" stdDeviation="{blur}" result="b"/>
<feComponentTransfer in="b" result="t"><feFuncA type="linear" slope="{slope}" intercept="{-(slope-1)/2:.2f}"/></feComponentTransfer>
<feFlood flood-color="{INK}" result="c"/>
<feComposite in="c" in2="t" operator="in"/>
</filter>
<filter id="stampFill" {region}>
{disp}
<feGaussianBlur in="d2" stdDeviation="{blur}" result="b"/>
<feComponentTransfer in="b"><feFuncA type="linear" slope="{slope}" intercept="{-(slope-1)/2:.2f}"/></feComponentTransfer>
</filter>'''

def stamp_svg(art, fill, tf, defs, size=400, bg=None, radius=0, **fkw):
    style = f"display: block; border-radius: {radius}px; background: {bg}" if bg else "display: block"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="{size}" height="{size}" style="{style}">
<defs>{defs}{filters(**fkw)}</defs>
<g filter="url(#stampFill)"><g transform="{tf}" style="fill: {PAPER}">{fill}</g></g>
<g filter="url(#stampInk)"><rect x="-80" y="-80" width="560" height="560" style="fill: #fff"/><g transform="{tf}">{art}</g></g>
</svg>'''

def shared_defs(**fkw):
    return f'''{SIDE_DEFS}{FRONT_DEFS}{filters(**fkw)}
<g id="stArtSide" transform="{SIDE_TF}">{SIDE_ART}</g>
<g id="stFillSide" transform="{SIDE_TF}">{SIDE_FILL}</g>
<g id="stArtFront" transform="{FRONT_TF}">{FRONT_ART}</g>
<g id="stFillFront" transform="{FRONT_TF}">{FRONT_FILL}</g>'''

def tile(which, size, radius, bg, label, fill=True, extra_style=""):
    f = f'<g filter="url(#stampFill)" style="fill: {PAPER}"><use href="#stFill{which}"/></g>' if fill else ""
    return (f'<svg viewBox="0 0 400 400" width="{size}" height="{size}" role="img" aria-label="{label}" style="display: block; border-radius: {radius}px; background: {bg}{extra_style}">'
            f'{f}<g filter="url(#stampInk)"><rect x="-80" y="-80" width="560" height="560" style="fill: #fff"/><use href="#stArt{which}"/></g></svg>')

if __name__ == "__main__":
    # 미리보기 한 장: python3 stamp.py front|side → stamp_preview.html (브라우저로 연다)
    Y = "#f7c84a"
    sets = (("side", SIDE_ART, SIDE_FILL, SIDE_TF, SIDE_DEFS), ("front", FRONT_ART, FRONT_FILL, FRONT_TF, FRONT_DEFS))
    which = sys.argv[1] if len(sys.argv) > 1 else "front"
    name, art, fill, tf, defs = [x for x in sets if x[0] == which][0]
    sizes = "".join(stamp_svg(art, fill, tf, defs, sz, Y, int(sz * 0.22)) for sz in (120, 60, 32, 16))
    html = f'''<!doctype html><meta charset="utf-8"><body style="margin:0;background:#f7ede2">
<div style="display:flex;gap:24px;padding:24px;align-items:flex-end">{stamp_svg(art, fill, tf, defs, 620, Y, 136)}{sizes}</div>'''
    open('stamp_preview.html', 'w').write(html)
