"""
UnderFireAI Social Launch Pack
Post 05: CODING CHALLENGES
Seven runtime columns. One ignited. Six standing by.
"""
import cairo, math, os
from PIL import Image, ImageDraw, ImageFont

SCALE = 2
W = 1080 * SCALE
H = 1080 * SCALE
OUT_DIR = "/sessions/blissful-amazing-hypatia/mnt/underfireai/social"
OUT_FILE = os.path.join(OUT_DIR, "post_05_coding.png")
FONT_DIR = "/sessions/blissful-amazing-hypatia/mnt/.claude/skills/canvas-design/canvas-fonts"

BG          = (0.031, 0.027, 0.039)
INK         = (0.839, 0.827, 0.812)
INK_DIM     = (0.420, 0.408, 0.392)
HAIRLINE    = (0.196, 0.184, 0.172)
HEAT_HOT    = (1.000, 0.475, 0.094)
HEAT_DEEP   = (0.749, 0.196, 0.027)
HEAT_GLOW   = (1.000, 0.690, 0.408)
MAGNESIUM   = (0.964, 0.945, 0.875)
SEAL        = (0.295, 0.286, 0.270)


def cairo_to_pil(s):
    return Image.frombuffer("RGBA", (s.get_width(), s.get_height()),
                            bytes(s.get_data()), "raw", "BGRA", 0, 1)

def pil_to_cairo_source(ctx, pil_img, x, y):
    arr = pil_img.tobytes("raw", "BGRA")
    isurf = cairo.ImageSurface.create_for_data(
        bytearray(arr), cairo.FORMAT_ARGB32, pil_img.width, pil_img.height)
    ctx.set_source_surface(isurf, x, y); ctx.paint()

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
        max_h = max(max_h, bb[3]); min_top = min(min_top, bb[1])
    total_w = sum(widths) + tracking * max(0, len(text) - 1)
    img = Image.new("RGBA", (total_w + 8, max_h - min_top + 16), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(img); cur_x = 4
    for ch, cw in zip(text, widths):
        d2.text((cur_x, 8 - min_top), ch, font=font, fill=fill)
        cur_x += cw + tracking
    return img


surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
ctx = cairo.Context(surface)

# Background + vignette
ctx.set_source_rgb(*BG); ctx.paint()
rg = cairo.RadialGradient(W/2, H/2, W*0.25, W/2, H/2, W*0.78)
rg.add_color_stop_rgba(0, 0, 0, 0, 0.0)
rg.add_color_stop_rgba(1, 0, 0, 0, 0.55)
ctx.set_source(rg); ctx.rectangle(0, 0, W, H); ctx.fill()

# Field
margin = 72 * SCALE
field_l = margin; field_t = margin
field_r = W - margin; field_b = H - margin
field_w = field_r - field_l

# Corner brackets
ctx.set_source_rgba(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2], 0.6)
ctx.set_line_width(1 * SCALE / 2)
b = 28 * SCALE
ctx.new_path()
ctx.move_to(field_l, field_t + b); ctx.line_to(field_l, field_t); ctx.line_to(field_l + b, field_t)
ctx.move_to(field_r - b, field_t); ctx.line_to(field_r, field_t); ctx.line_to(field_r, field_t + b)
ctx.move_to(field_l, field_b - b); ctx.line_to(field_l, field_b); ctx.line_to(field_l + b, field_b)
ctx.move_to(field_r - b, field_b); ctx.line_to(field_r, field_b); ctx.line_to(field_r, field_b - b)
ctx.stroke()

# Top corner tags
img = make_text_image("N . 05 / 05", f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l + 16 * SCALE), int(field_t + 16 * SCALE))
img = make_text_image("REF . UFA-JDG-007", f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_r - img.width - 16 * SCALE), int(field_t + 16 * SCALE))

# === MAIN BLOCK: 7 RUNTIME COLUMNS ===
runtimes = [
    {"code": "PY",  "name": "PYTHON",     "fill": 0.65, "active": False, "verdict": "PASS"},
    {"code": "JS",  "name": "JAVASCRIPT", "fill": 0.40, "active": False, "verdict": "PASS"},
    {"code": "TS",  "name": "TYPESCRIPT", "fill": 0.78, "active": False, "verdict": "PASS"},
    {"code": "GO",  "name": "GO",         "fill": 1.00, "active": True,  "verdict": "PASS"},
    {"code": "RS",  "name": "RUST",       "fill": 0.55, "active": False, "verdict": "PASS"},
    {"code": "JV",  "name": "JAVA",       "fill": 0.35, "active": False, "verdict": "PASS"},
    {"code": "C++", "name": "C++",        "fill": 0.72, "active": False, "verdict": "PASS"},
]
n_rt = 7

# Column geometry
col_top = H * 0.21
col_bottom = H * 0.58
col_h = col_bottom - col_top
col_w = 56 * SCALE
gap_total = field_w - col_w * n_rt
gap = gap_total / (n_rt - 1)

# Section heading above columns
heading_y = field_t + 70 * SCALE
img = make_text_image("JUDGE0  .  SANDBOX  .  SEVEN RUNTIMES",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(5 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(heading_y))

# Top axis hairline above columns
top_axis_y = col_top - 24 * SCALE
ctx.set_line_width(0.7 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.6)
ctx.move_to(field_l, top_axis_y); ctx.line_to(field_r, top_axis_y); ctx.stroke()

# Bottom axis hairline
bot_axis_y = col_bottom + 36 * SCALE
ctx.set_line_width(0.7 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.65)
ctx.move_to(field_l, bot_axis_y); ctx.line_to(field_r, bot_axis_y); ctx.stroke()

# Calibration labels on the LEFT side of the column field
calib_x = field_l - 2 * SCALE
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.7)
for frac, label in [(0.0, "MAX"), (0.25, "75%"), (0.5, "50%"), (0.75, "25%"), (1.0, "0")]:
    y = col_top + frac * col_h
    # short tick into field
    ctx.set_line_width(0.7 * SCALE)
    ctx.move_to(calib_x, y); ctx.line_to(calib_x + 8 * SCALE, y); ctx.stroke()
    img = make_text_image(label, f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                          int(10 * SCALE), INK_DIM, tracking=int(1 * SCALE))
    pil_to_cairo_source(ctx, img, int(calib_x - img.width - 6 * SCALE),
                        int(y - img.height / 2))


def draw_column(ctx, x, top, bot, width, rt):
    fill = rt["fill"]
    active = rt["active"]
    fill_top = top + (1 - fill) * (bot - top)

    # Column frame (faint side rails)
    ctx.set_line_width(0.6 * SCALE)
    ctx.set_source_rgba(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2], 1.0)
    ctx.move_to(x, top); ctx.line_to(x, bot)
    ctx.move_to(x + width, top); ctx.line_to(x + width, bot)
    ctx.stroke()

    # Tick marks (calibration) along the column sides — 10 divisions
    for i in range(11):
        y = top + (bot - top) * i / 10
        tw = 1.0 * SCALE if i % 5 == 0 else 0.6 * SCALE
        tlen = 6 * SCALE if i % 5 == 0 else 3 * SCALE
        ctx.set_line_width(tw)
        ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.55)
        ctx.move_to(x, y); ctx.line_to(x + tlen, y)
        ctx.move_to(x + width - tlen, y); ctx.line_to(x + width, y)
        ctx.stroke()

    # FILL — thermal gradient bar
    if active:
        # Active column — magnesium top, amber body, deep ember at base
        grad = cairo.LinearGradient(x, fill_top, x, bot)
        grad.add_color_stop_rgba(0.00, MAGNESIUM[0], MAGNESIUM[1], MAGNESIUM[2], 1.0)
        grad.add_color_stop_rgba(0.18, HEAT_GLOW[0], HEAT_GLOW[1], HEAT_GLOW[2], 0.98)
        grad.add_color_stop_rgba(0.55, HEAT_HOT[0],  HEAT_HOT[1],  HEAT_HOT[2],  0.95)
        grad.add_color_stop_rgba(1.00, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.88)
        ctx.set_source(grad)
        ctx.rectangle(x + 4 * SCALE, fill_top, width - 8 * SCALE, bot - fill_top)
        ctx.fill()
        # Glow halo around active column
        halo = cairo.RadialGradient(x + width / 2, (fill_top + bot) / 2, 0,
                                    x + width / 2, (fill_top + bot) / 2, width * 1.6)
        halo.add_color_stop_rgba(0,    HEAT_GLOW[0], HEAT_GLOW[1], HEAT_GLOW[2], 0.16)
        halo.add_color_stop_rgba(0.5,  HEAT_HOT[0],  HEAT_HOT[1],  HEAT_HOT[2],  0.06)
        halo.add_color_stop_rgba(1.0, 0, 0, 0, 0.0)
        ctx.save()
        ctx.set_source(halo)
        ctx.rectangle(x - width * 0.8, fill_top - 30 * SCALE,
                      width * 2.6, bot - fill_top + 60 * SCALE)
        ctx.fill()
        ctx.restore()
        # Bright top-cap line — heat crest
        ctx.set_line_width(2.0 * SCALE)
        ctx.set_source_rgba(MAGNESIUM[0], MAGNESIUM[1], MAGNESIUM[2], 1.0)
        ctx.move_to(x + 4 * SCALE, fill_top)
        ctx.line_to(x + width - 4 * SCALE, fill_top)
        ctx.stroke()
    else:
        # Inactive — dim ember fill (recent-run heat residue)
        grad = cairo.LinearGradient(x, fill_top, x, bot)
        grad.add_color_stop_rgba(0.00, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.55)
        grad.add_color_stop_rgba(0.60, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.30)
        grad.add_color_stop_rgba(1.00, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.12)
        ctx.set_source(grad)
        ctx.rectangle(x + 4 * SCALE, fill_top, width - 8 * SCALE, bot - fill_top)
        ctx.fill()
        # Top-cap line — dim
        ctx.set_line_width(1.0 * SCALE)
        ctx.set_source_rgba(SEAL[0], SEAL[1], SEAL[2], 0.85)
        ctx.move_to(x + 4 * SCALE, fill_top)
        ctx.line_to(x + width - 4 * SCALE, fill_top)
        ctx.stroke()

    # Top label — code (PY, JS, etc)
    is_active = active
    col_lbl = MAGNESIUM if is_active else INK_DIM
    img = make_text_image(rt["code"], f"{FONT_DIR}/BigShoulders-Bold.ttf",
                          int(28 * SCALE), col_lbl, tracking=int(-1 * SCALE))
    pil_to_cairo_source(ctx, img, int(x + width / 2 - img.width / 2),
                        int(top - img.height - 8 * SCALE))

    # Bottom label — name
    name_y = bot + 12 * SCALE
    img = make_text_image(rt["name"], f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                          int(11 * SCALE), col_lbl, tracking=int(2 * SCALE))
    pil_to_cairo_source(ctx, img, int(x + width / 2 - img.width / 2), int(name_y))

    # Verdict dot
    verdict_y = bot + 56 * SCALE
    dot_col = HEAT_HOT if is_active else SEAL
    ctx.set_source_rgba(dot_col[0], dot_col[1], dot_col[2], 0.95)
    ctx.arc(x + width / 2, verdict_y, 4 * SCALE, 0, 2 * math.pi); ctx.fill()
    # Verdict label
    img = make_text_image(rt["verdict"], f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                          int(10 * SCALE), dot_col, tracking=int(2 * SCALE))
    pil_to_cairo_source(ctx, img, int(x + width / 2 - img.width / 2),
                        int(verdict_y + 10 * SCALE))


# Draw columns
x0 = field_l
for i, rt in enumerate(runtimes):
    x = x0 + i * (col_w + gap)
    draw_column(ctx, x, col_top, col_bottom, col_w, rt)

# === ACTIVE RUNTIME CALLOUT BLOCK ===
# Find active column position
active_idx = next(i for i, r in enumerate(runtimes) if r["active"])
active_x = x0 + active_idx * (col_w + gap) + col_w / 2

# Bottom-of-column status pill
status_y = bot_axis_y + 52 * SCALE
img = make_text_image("EXECUTING  .  14 MS  .  VERDICT  PASS",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(13 * SCALE), HEAT_HOT, tracking=int(4 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(status_y))

# === HORIZON RULE + WORDMARK ===
horizon_y = H * 0.68
ctx.set_line_width(0.8 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.7)
ctx.move_to(field_l, horizon_y); ctx.line_to(field_r, horizon_y); ctx.stroke()
for x in (field_l, field_r):
    ctx.move_to(x, horizon_y); ctx.line_to(x, horizon_y + 12 * SCALE); ctx.stroke()

wordmark_y = horizon_y + 40 * SCALE
img = make_text_image("CODING CHALLENGES.",
                      f"{FONT_DIR}/BigShoulders-Bold.ttf",
                      int(98 * SCALE), INK, tracking=int(-2 * SCALE))
if img.width > field_w:
    new_w = field_w
    new_h = int(img.height * (field_w / img.width))
    img = img.resize((new_w, new_h), Image.LANCZOS)
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(wordmark_y))

# Tagline
tagline_y = wordmark_y + img.height + 32 * SCALE
img = make_text_image("Compiled. Tested. Judged.",
                      f"{FONT_DIR}/InstrumentSerif-Italic.ttf",
                      int(38 * SCALE), INK_DIM, tracking=int(1 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(tagline_y))

# Footer
footer_y = H - margin - 24 * SCALE
img = make_text_image("UFA  .  JDG-07  .  2026",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l), int(footer_y))
img = make_text_image("JUDGE0  .  SANDBOX",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(footer_y))
img = make_text_image("UNDERFIREAI.COM",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_r - img.width), int(footer_y))

# Output
pil = cairo_to_pil(surface)
final = pil.resize((1080, 1080), Image.LANCZOS).convert("RGB")
final.save(OUT_FILE, "PNG", optimize=True)
print(f"OK  {OUT_FILE}  {final.size}")
