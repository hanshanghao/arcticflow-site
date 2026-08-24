import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "images"))
os.makedirs(OUT, exist_ok=True)

ICE = (56, 189, 248)
CYAN = (34, 211, 238)
BLUE = (59, 130, 246)
WHITE = (234, 244, 255)
MUTED = (143, 169, 201)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diag_gradient(w, h, c1, c2):
    img = Image.new("RGB", (w, h))
    px = img.load()
    denom = float(w + h)
    for y in range(h):
        for x in range(w):
            px[x, y] = lerp(c1, c2, (x + y) / denom)
    return img


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    img.putalpha(mask)
    return img


def rot(vx, vy, deg):
    r = math.radians(deg)
    c, s = math.cos(r), math.sin(r)
    return vx * c - vy * s, vx * s + vy * c


def flake(draw, cx, cy, r, w, color):
    for ang in (0, 60, 120):
        rad = math.radians(ang)
        ux, uy = math.cos(rad), math.sin(rad)
        draw.line(
            [(cx - ux * r, cy - uy * r), (cx + ux * r, cy + uy * r)],
            fill=color,
            width=w,
            joint="curve",
        )
        bx, by = cx + ux * r * 0.55, cy + uy * r * 0.55
        for tip in ((cx + ux * r, cy + uy * r), (cx - ux * r, cy - uy * r)):
            dx, dy = tip[0] - bx, tip[1] - by
            ln = math.hypot(dx, dy)
            if ln == 0:
                continue
            nx, ny = dx / ln, dy / ln
            for sign in (1, -1):
                tx, ty = rot(nx, ny, 35 * sign)
                draw.line(
                    [(bx, by), (bx + tx * r * 0.22, by + ty * r * 0.22)],
                    fill=color,
                    width=max(1, int(w * 0.7)),
                )


def load_font(size, bold=False):
    candidates = (
        [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/Library/Fonts/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        if bold
        else [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def glow_base(w, h):
    base = diag_gradient(w, h, (5, 13, 26), (10, 32, 62)).convert("RGBA")
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([-200, -260, 520, 360], fill=(34, 211, 238, 46))
    od.ellipse([w - 460, h - 420, w + 240, h + 200], fill=(59, 130, 246, 52))
    overlay = overlay.filter(ImageFilter.GaussianBlur(90))
    return Image.alpha_composite(base, overlay)


def make_og():
    w, h = 1200, 630
    img = glow_base(w, h)

    wm = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wm)
    flake(wd, 960, 330, 250, 12, ICE + (30,))
    img = Image.alpha_composite(img, wm.filter(ImageFilter.GaussianBlur(2)))

    d = ImageDraw.Draw(img)

    mark = diag_gradient(88, 88, CYAN, BLUE)
    mark = rounded(mark, 24)
    md = ImageDraw.Draw(mark)
    flake(md, 44, 44, 27, 8, (3, 16, 31))
    img.alpha_composite(mark, (70, 58))

    brand_font = load_font(38, bold=True)
    d.text((182, 74), "ArcticFlow", font=brand_font, fill=WHITE)

    head_font = load_font(72, bold=True)
    d.text((70, 208), "Your AC business,", font=head_font, fill=WHITE)
    d.text((70, 296), "in perfect flow.", font=head_font, fill=(125, 211, 252))

    sub_font = load_font(28)
    d.text(
        (72, 408),
        "Scheduling · Invoicing · Online Payments · Team Jobs · Bank-grade Security",
        font=sub_font,
        fill=MUTED,
    )

    pill_font = load_font(24, bold=True)
    pills = [("Available on Android & iOS", 70), ("arcticflow.app", None)]
    x = 70
    for label, _ in pills:
        tw = d.textlength(label, font=pill_font)
        pad = 26
        box = [x, 502, x + tw + pad * 2, 556]
        d.rounded_rectangle(box, radius=27, outline=ICE + (160,), width=2)
        d.text((x + pad, 512), label, font=pill_font, fill=WHITE)
        x = box[2] + 18

    img.convert("RGB").save(os.path.join(OUT, "og-cover.png"), optimize=True)
    print("og-cover.png")


def app_icon(size, name):
    grad = diag_gradient(size, size, CYAN, BLUE)
    icon = rounded(grad.convert("RGBA"), int(size * 0.24))
    idr = ImageDraw.Draw(icon)
    flake(idr, size // 2, size // 2, int(size * 0.36), max(6, int(size * 0.075)), (3, 16, 31))
    icon.save(os.path.join(OUT, name), optimize=True)
    print(name)


def make_favicon():
    base = 48
    img = Image.new("RGBA", (base, base), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    flake(d, base // 2, base // 2, 19, 4, ICE)
    img.save(
        os.path.join(OUT, "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("favicon.ico")


if __name__ == "__main__":
    make_og()
    app_icon(192, "icon-192.png")
    app_icon(512, "icon-512.png")
    app_icon(180, "apple-touch-icon.png")
    make_favicon()
    print("done ->", OUT)
