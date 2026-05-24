"""
UnderFireAI Social Launch Pack
Post 01: HERO
Philosophy: PYROMETRIC CALM
Output: 1080x1080 PNG (supersampled from 2160x2160)
"""
import cairo
import math
import os
from PIL import Image, ImageDraw, ImageFont

SCALE = 2
W = 1080 * SCALE
H = 1080 * SCALE
OUT_DIR = "/sessions/blissful-amazing-hypatia/mnt/underfireai/social"
OUT_FILE = os.path.join(OUT_DIR, "post_01_hero.png")
FONT_DIR = "/sessions/blissful-amazing-hypatia/mnt/.claude/skills/canvas-design/canvas-fonts"

# Palette
BG          = (0.031, 0.027, 0.039)
INK         = (0.839, 0.827, 0.812)
INK_DIM     = (0.420, 0.408, 0.392)
HAIRLINE    = (0.196, 0.184, 0.172)
HEAT_HOT    = (1.000, 0.475, 0.094)
HEAT_DEEP   = (0.749, 0.196, 0.027)
HEAT_GLOW   = (1.000, 0.690, 0.408)


def cairo_to_pil(surface):
    buf = surface.get_data()
    return Image.frombuffer("RGBA", (surface.get_width(), surface.get_height()),
                            bytes(buf), "raw", "BGRA", 0, 1)


def pil_to_cairo_source(ctx, pil_img, x, y):
    arr = pil_img.tobytes("raw", "BGRA")
    img_surface = cairo.ImageSurface.create_for_data(
        bytearray(arr), cairo.FORMAT_ARGB32,
        pil_img.width, pil_img.height
    )
    ctx.set_source_surface(img_surface, x, y)
    ctx.paint()


def make_text_image(text, font_path, size, color_rgb, tracking=0):
    font = ImageFont.truetype(font_path, size)
    tmp = Image.new("RGBA", (10, 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    fill = (int(color_rgb[0]*255), int(color_rgb[1]*255), int(color_rgb[2]*255), 255)
    if tracking == 0:
        bbox = d.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]; h = bbox[3] - bbox[1]
        img = Image.new("RGBA", (w + 6, h + 12), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(img)
        d2.text((-bbox[0] + 3, -bbox[1] + 6), text, font=font, fill=fill)
        return img
    widths = []; max_h = 0; min_top = 0
    for ch in text:
        bb = d.textbbox((0, 0), ch, font=font)
        widths.append(bb[2] - bb[0])
        max_h = max(max_h, bb[3])
        min_top = min(min_top, bb[1])
    total_w = sum(widths) + tracking * max(0, len(text) - 1)
    img = Image.new("RGBA", (total_w + 8, max_h - min_top + 16), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(img)
    cur_x = 4
    for ch, cw in zip(text, widths):
        d2.text((cur_x, 8 - min_top), ch, font=font, fill=fill)
        cur_x += cw + tracking
    return img


surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
ctx = cairo.Context(surface)

# 1. BACKGROUND
ctx.set_source_rgb(*BG)
ctx.paint()

# Subtle radial vignette
rg = cairo.RadialGradient(W/2, H/2, W*0.25, W/2, H/2, W*0.78)
rg.add_color_stop_rgba(0, 0, 0, 0, 0.0)
rg.add_color_stop_rgba(1, 0, 0, 0, 0.55)
ctx.set_source(rg)
ctx.rectangle(0, 0, W, H)
ctx.fill()

# 2. CORNER BRACKETS
margin = 72 * SCALE
field_l = margin; field_t = margin
field_r = W - margin; field_b = H - margin
field_w = field_r - field_l; field_h = field_b - field_t

ctx.set_source_rgba(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2], 0.6)
ctx.set_line_width(1 * SCALE / 2)
b = 28 * SCALE
ctx.new_path()
ctx.move_to(field_l, field_t + b); ctx.line_to(field_l, field_t); ctx.line_to(field_l + b, field_t)
ctx.move_to(field_r - b, field_t); ctx.line_to(field_r, field_t); ctx.line_to(field_r, field_t + b)
ctx.move_to(field_l, field_b - b); ctx.line_to(field_l, field_b); ctx.line_to(field_l + b, field_b)
ctx.move_to(field_r - b, field_b); ctx.line_to(field_r, field_b); ctx.line_to(field_r, field_b - b)
ctx.stroke()

# 3. THERMAL ARC
arc_cx = W / 2
arc_cy = H * 0.58
arc_r = W * 0.38

# 3a. Glow inside arc
ctx.save()
ctx.arc(arc_cx, arc_cy, arc_r * 1.005, math.pi, 2 * math.pi)
ctx.close_path()
ctx.clip()
glow = cairo.RadialGradient(arc_cx, arc_cy - arc_r * 0.08, 0, arc_cx, arc_cy - arc_r * 0.08, arc_r * 1.15)
glow.add_color_stop_rgba(0, HEAT_GLOW[0], HEAT_GLOW[1], HEAT_GLOW[2], 0.34)
glow.add_color_stop_rgba(0.22, HEAT_HOT[0], HEAT_HOT[1], HEAT_HOT[2], 0.27)
glow.add_color_stop_rgba(0.55, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.12)
glow.add_color_stop_rgba(1.0, 0, 0, 0, 0.0)
ctx.set_source(glow)
ctx.rectangle(0, 0, W, H)
ctx.fill()
# inner concentric rings
ctx.set_line_width(0.6 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.32)
ctx.arc(arc_cx, arc_cy, arc_r * 0.72, math.pi, 2 * math.pi)
ctx.stroke()
ctx.set_line_width(0.5 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.20)
ctx.arc(arc_cx, arc_cy, arc_r * 0.44, math.pi, 2 * math.pi)
ctx.stroke()
ctx.restore()

# 3b. Main arc stroke
ctx.set_line_width(1.4 * SCALE)
ctx.set_source_rgba(INK[0], INK[1], INK[2], 0.80)
ctx.arc(arc_cx, arc_cy, arc_r, math.pi, 2 * math.pi)
ctx.stroke()

# 3c. Tick marks
n_ticks = 61
for i in range(n_ticks):
    a = math.pi + (math.pi * i / (n_ticks - 1))
    is_major = (i % 10 == 0)
    is_mid = (i % 5 == 0) and not is_major
    if is_major:
        tlen = 22 * SCALE; tw = 1.8 * SCALE; col = INK
    elif is_mid:
        tlen = 12 * SCALE; tw = 1.0 * SCALE; col = INK
    else:
        tlen = 6 * SCALE; tw = 0.7 * SCALE; col = INK_DIM
    x1 = arc_cx + math.cos(a) * arc_r
    y1 = arc_cy + math.sin(a) * arc_r
    x2 = arc_cx + math.cos(a) * (arc_r + tlen)
    y2 = arc_cy + math.sin(a) * (arc_r + tlen)
    ctx.set_line_width(tw)
    center_dist = abs(i - (n_ticks - 1) / 2)
    if center_dist < 6:
        ctx.set_source_rgba(HEAT_HOT[0], HEAT_HOT[1], HEAT_HOT[2], 0.95)
    else:
        ctx.set_source_rgba(col[0], col[1], col[2], 0.85)
    ctx.move_to(x1, y1)
    ctx.line_to(x2, y2)
    ctx.stroke()

# 3d. Major tick labels
major_labels = ["0480", "0860", "1240", "1620", "2000", "2380", "2760"]
n_majors = 7
for i, lbl in enumerate(major_labels):
    a = math.pi + (math.pi * i / (n_majors - 1))
    label_r = arc_r + 56 * SCALE
    x = arc_cx + math.cos(a) * label_r
    y = arc_cy + math.sin(a) * label_r
    is_center = (i == 3)
    color = HEAT_HOT if is_center else INK_DIM
    if is_center:
        continue  # skip center label; PEAK marker occupies that position
    img = make_text_image(lbl, f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                          int(15 * SCALE), color, tracking=1)
    pil_to_cairo_source(ctx, img, int(x - img.width / 2), int(y - img.height / 2))

# 3e. Apex marker
apex_x = arc_cx
apex_y = arc_cy - arc_r
ctx.set_line_width(1.4 * SCALE)
ctx.set_source_rgba(HEAT_HOT[0], HEAT_HOT[1], HEAT_HOT[2], 0.95)
ctx.move_to(apex_x, apex_y - 8 * SCALE)
ctx.line_to(apex_x, apex_y - 56 * SCALE)
ctx.stroke()
ctx.arc(apex_x, apex_y - 64 * SCALE, 4.5 * SCALE, 0, 2 * math.pi)
ctx.fill()
img = make_text_image("PEAK", f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), HEAT_HOT, tracking=int(5 * SCALE))
pil_to_cairo_source(ctx, img, int(apex_x - img.width / 2), int(apex_y - 102 * SCALE))

# 4. THERMAL HORIZON
horizon_y = arc_cy + 8 * SCALE
ctx.set_line_width(0.8 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.7)
ctx.move_to(field_l, horizon_y)
ctx.line_to(field_r, horizon_y)
ctx.stroke()
for x in (field_l, field_r):
    ctx.move_to(x, horizon_y)
    ctx.line_to(x, horizon_y + 12 * SCALE)
    ctx.stroke()

# 5. WORDMARK
wordmark_y = horizon_y + 56 * SCALE
img = make_text_image("TRAIN UNDER FIRE.", f"{FONT_DIR}/BigShoulders-Bold.ttf",
                      int(150 * SCALE), INK, tracking=int(-2 * SCALE))
if img.width > field_w:
    new_w = field_w
    new_h = int(img.height * (field_w / img.width))
    img = img.resize((new_w, new_h), Image.LANCZOS)
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(wordmark_y))

# 6. TAGLINE
tagline_y = wordmark_y + img.height + 28 * SCALE
img = make_text_image("So the real thing feels easy.",
                      f"{FONT_DIR}/InstrumentSerif-Italic.ttf",
                      int(46 * SCALE), INK_DIM, tracking=int(1 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(tagline_y))

# 7. FOOTER
footer_y = H - margin - 24 * SCALE
img = make_text_image("UFA  .  MK-I  .  2026",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l), int(footer_y))

img = make_text_image("PYROMETRIC  .  MK-I",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(footer_y))

img = make_text_image("UNDERFIREAI.COM",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_r - img.width), int(footer_y))

# 8. TOP CORNER TAGS
img = make_text_image("N . 01 / 05",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l + 16 * SCALE), int(field_t + 16 * SCALE))

img = make_text_image("REF . UFA-23-0480",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_r - img.width - 16 * SCALE), int(field_t + 16 * SCALE))

# Output
pil = cairo_to_pil(surface)
final = pil.resize((1080, 1080), Image.LANCZOS).convert("RGB")
os.makedirs(OUT_DIR, exist_ok=True)
final.save(OUT_FILE, "PNG", optimize=True)
print(f"OK  {OUT_FILE}  {final.size}")
