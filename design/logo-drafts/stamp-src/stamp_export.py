# 도장 치와와를 따로 쓸 수 있는 SVG로 내보낸다(바탕 없음). --ink 를 주면 속을 칠하지 않은 잉크만.
import sys
import stamp as T

def standalone(which, fill=True, title=""):
    art, fl, tf, defs = {"side": (T.SIDE_ART, T.SIDE_FILL, T.SIDE_TF, T.SIDE_DEFS), "front": (T.FRONT_ART, T.FRONT_FILL, T.FRONT_TF, T.FRONT_DEFS)}[which]
    f = f'<g filter="url(#stampFill)"><g transform="{tf}" style="fill: {T.PAPER}">{fl}</g></g>\n' if fill else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="{title}">
<title>{title}</title>
<defs>{defs}{T.filters()}</defs>
{f}<g filter="url(#stampInk)"><rect x="-80" y="-80" width="560" height="560" style="fill: #fff"/><g transform="{tf}">{art}</g></g>
</svg>
'''

if __name__ == "__main__":
    out = sys.argv[1]
    import os
    os.makedirs(out, exist_ok=True)
    open(f"{out}/chi-stamp-side.svg", "w").write(standalone("side", True, "도장 풍 으르렁 치와와, 옆얼굴"))
    open(f"{out}/chi-stamp-front.svg", "w").write(standalone("front", True, "도장 풍 으르렁 치와와, 정면"))
    open(f"{out}/chi-stamp-side-ink.svg", "w").write(standalone("side", False, "도장 풍 으르렁 치와와, 옆얼굴 (잉크만)"))
    open(f"{out}/chi-stamp-front-ink.svg", "w").write(standalone("front", False, "도장 풍 으르렁 치와와, 정면 (잉크만)"))
