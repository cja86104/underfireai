"""
UnderFireAI Social Launch Pack
Post 03: HIDDEN PERSONALITIES
Five interviewer plates — four sealed, one ignited.
"""
import cairo, math, os
from PIL import Image, ImageDraw, ImageFont

SCALE = 2
W = 1080 * SCALE
H = 1080 * SCALE
OUT_DIR = "/sessions/blissful-amazing-hypatia/mnt/underfireai/social"
OUT_FILE = os.path.join(OUT_DIR, "post_03_personalities.png")
FONT_DIR = "/sessions/blissful-amazing-hypatia/mnt/.claude/skills/canvas-design/canvas-fonts"

BG          = (0.031, 0.027, 0.039)
INK         = (0.839, 0.827, 0.812)
INK_DIM     = (0.420, 0.408, 0.392)
HAIRLINE    = (0.196, 0.184, 0.172)
HEAT_HOT    = (1.000, 0.475, 0.094)
HEAT_DEEP   = (0.749, 0.196, 0.027)
HEAT_GLOW   = (1.000, 0.690, 0.408)
SEAL        = (0.295, 0.286, 0.270)
SEAL_DIM    = (0.180, 0.172, 0.160)


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
img = make_text_image("N . 03 / 05", f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l + 16 * SCALE), int(field_t + 16 * SCALE))
img = make_text_image("REF . UFA-PSY-005", f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_r - img.width - 16 * SCALE), int(field_t + 16 * SCALE))

# === SECTION HEADING ===
heading_y = field_t + 80 * SCALE
img = make_text_image("INTERVIEWER  REGISTRY  .  MK . I - V",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(5 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(heading_y))

# Small subtitle hairlines on each side
sub_y = heading_y + img.height // 2 + 2 * SCALE
ctx.set_line_width(0.7 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.6)
hline_len = 110 * SCALE
ctx.move_to(W / 2 - img.width / 2 - hline_len - 12 * SCALE, sub_y)
ctx.line_to(W / 2 - img.width / 2 - 12 * SCALE, sub_y)
ctx.move_to(W / 2 + img.width / 2 + 12 * SCALE, sub_y)
ctx.line_to(W / 2 + img.width / 2 + hline_len + 12 * SCALE, sub_y)
ctx.stroke()

# === FIVE DISCS ===
# Define each disc: (roman, code, status, pattern, revealed)
discs = [
    {"roman": "I",   "code": "P-01", "label": "SKEPTIC",   "pattern": "rings"},
    {"roman": "II",  "code": "P-02", "label": "WARM",      "pattern": "sine"},
    {"roman": "III", "code": "P-03", "label": "REVEALED",  "pattern": "spokes", "revealed": True},
    {"roman": "IV",  "code": "P-04", "label": "SCOPE",     "pattern": "arcs"},
    {"roman": "V",   "code": "P-05", "label": "PROBE",     "pattern": "cross"},
]
n_disc = 5
disc_cy = H * 0.46
disc_r = 90 * SCALE
disc_spacing = (field_w - disc_r * 2) / (n_disc - 1)
disc_x0 = field_l + disc_r

# Connecting axis hairline through all discs
ctx.set_line_width(0.6 * SCALE)
ctx.set_source_rgba(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2], 0.85)
ctx.move_to(field_l, disc_cy); ctx.line_to(field_r, disc_cy); ctx.stroke()
# small terminator ticks
for x in (field_l, field_r):
    ctx.move_to(x, disc_cy - 10 * SCALE); ctx.line_to(x, disc_cy + 10 * SCALE); ctx.stroke()


def draw_disc(ctx, cx, cy, r, disc):
    revealed = disc.get("revealed", False)

    if revealed:
        # Glow halo
        halo = cairo.RadialGradient(cx, cy, 0, cx, cy, r * 2.4)
        halo.add_color_stop_rgba(0,    HEAT_GLOW[0], HEAT_GLOW[1], HEAT_GLOW[2], 0.40)
        halo.add_color_stop_rgba(0.30, HEAT_HOT[0],  HEAT_HOT[1],  HEAT_HOT[2],  0.22)
        halo.add_color_stop_rgba(0.70, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.08)
        halo.add_color_stop_rgba(1.0, 0, 0, 0, 0.0)
        ctx.set_source(halo)
        ctx.arc(cx, cy, r * 2.4, 0, 2 * math.pi)
        ctx.fill()
        # Inner glow inside disc
        inner = cairo.RadialGradient(cx, cy, 0, cx, cy, r)
        inner.add_color_stop_rgba(0,   HEAT_GLOW[0], HEAT_GLOW[1], HEAT_GLOW[2], 0.55)
        inner.add_color_stop_rgba(0.6, HEAT_HOT[0],  HEAT_HOT[1],  HEAT_HOT[2],  0.32)
        inner.add_color_stop_rgba(1.0, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.18)
        ctx.set_source(inner)
        ctx.arc(cx, cy, r * 0.96, 0, 2 * math.pi); ctx.fill()
        ring_col = HEAT_HOT; ring_alpha = 1.0; ring_lw = 1.8 * SCALE
        tick_col = HEAT_HOT
    else:
        # Subtle sealed shading
        seal = cairo.RadialGradient(cx, cy - r * 0.2, 0, cx, cy, r * 1.1)
        seal.add_color_stop_rgba(0, 0.07, 0.063, 0.071, 0.30)
        seal.add_color_stop_rgba(1, 0, 0, 0, 0.0)
        ctx.set_source(seal)
        ctx.arc(cx, cy, r * 0.96, 0, 2 * math.pi); ctx.fill()
        ring_col = SEAL; ring_alpha = 0.85; ring_lw = 1.2 * SCALE
        tick_col = SEAL

    # Outer ring
    ctx.set_line_width(ring_lw)
    ctx.set_source_rgba(ring_col[0], ring_col[1], ring_col[2], ring_alpha)
    ctx.arc(cx, cy, r, 0, 2 * math.pi); ctx.stroke()

    # Tick marks around ring — 24 around
    for k in range(24):
        a = k * (2 * math.pi / 24)
        is_major = (k % 6 == 0)
        tlen = 7 * SCALE if is_major else 4 * SCALE
        tw = 1.2 * SCALE if is_major else 0.7 * SCALE
        x1 = cx + math.cos(a) * (r + 2 * SCALE)
        y1 = cy + math.sin(a) * (r + 2 * SCALE)
        x2 = cx + math.cos(a) * (r + 2 * SCALE + tlen)
        y2 = cy + math.sin(a) * (r + 2 * SCALE + tlen)
        ctx.set_line_width(tw)
        ctx.set_source_rgba(tick_col[0], tick_col[1], tick_col[2], 0.85 if revealed else 0.55)
        ctx.move_to(x1, y1); ctx.line_to(x2, y2); ctx.stroke()

    # Inner pattern based on disc type
    p = disc["pattern"]
    inner_col = tick_col
    inner_alpha = 0.95 if revealed else 0.7
    ctx.set_source_rgba(inner_col[0], inner_col[1], inner_col[2], inner_alpha)

    if p == "rings":
        for ri in (0.32, 0.52, 0.72):
            ctx.set_line_width(0.9 * SCALE)
            ctx.arc(cx, cy, r * ri, 0, 2 * math.pi); ctx.stroke()
    elif p == "sine":
        ctx.set_line_width(1.1 * SCALE)
        ctx.new_path()
        steps = 60
        amp = r * 0.32
        for i in range(steps + 1):
            t = i / steps
            x = cx - r * 0.7 + (1.4 * r) * t
            y = cy + math.sin(t * math.pi * 3) * amp * 0.5
            if i == 0: ctx.move_to(x, y)
            else: ctx.line_to(x, y)
        ctx.stroke()
    elif p == "spokes":
        # 12 radial spokes — focused interrogator
        for k in range(12):
            a = k * (2 * math.pi / 12) + math.pi / 12
            x1 = cx + math.cos(a) * r * 0.20
            y1 = cy + math.sin(a) * r * 0.20
            x2 = cx + math.cos(a) * r * 0.78
            y2 = cy + math.sin(a) * r * 0.78
            ctx.set_line_width(1.2 * SCALE)
            ctx.move_to(x1, y1); ctx.line_to(x2, y2); ctx.stroke()
        # central hub dot
        ctx.arc(cx, cy, 4 * SCALE, 0, 2 * math.pi); ctx.fill()
    elif p == "arcs":
        # broad arc fragments
        for ang in (math.pi * 0.15, math.pi * 1.15):
            ctx.set_line_width(1.4 * SCALE)
            ctx.new_path()
            ctx.arc(cx, cy, r * 0.55, ang, ang + math.pi * 0.7)
            ctx.stroke()
    elif p == "cross":
        # crosshair / probe pattern
        ctx.set_line_width(1.0 * SCALE)
        ctx.move_to(cx - r * 0.65, cy); ctx.line_to(cx + r * 0.65, cy); ctx.stroke()
        ctx.move_to(cx, cy - r * 0.65); ctx.line_to(cx, cy + r * 0.65); ctx.stroke()
        ctx.arc(cx, cy, r * 0.30, 0, 2 * math.pi); ctx.stroke()
        # corner ticks
        for sx, sy in [(-1,-1), (1,-1), (-1,1), (1,1)]:
            ctx.move_to(cx + sx * r * 0.45, cy + sy * r * 0.45)
            ctx.line_to(cx + sx * r * 0.55, cy + sy * r * 0.55)
            ctx.stroke()


# Draw each disc
for i, disc in enumerate(discs):
    cx = disc_x0 + i * disc_spacing
    draw_disc(ctx, cx, disc_cy, disc_r, disc)

    revealed = disc.get("revealed", False)
    col = HEAT_HOT if revealed else INK_DIM

    # Roman numeral inside disc (small, near top)
    img = make_text_image(disc["roman"], f"{FONT_DIR}/InstrumentSerif-Italic.ttf",
                          int(28 * SCALE), col if revealed else SEAL, tracking=0)
    pil_to_cairo_source(ctx, img, int(cx - img.width / 2), int(disc_cy - disc_r - 36 * SCALE))

    # Code below disc
    code_y = disc_cy + disc_r + 30 * SCALE
    img = make_text_image(disc["code"], f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                          int(14 * SCALE), col, tracking=int(2 * SCALE))
    pil_to_cairo_source(ctx, img, int(cx - img.width / 2), int(code_y))

    # Status label
    status = "REVEALED" if revealed else "SEALED"
    status_col = HEAT_HOT if revealed else SEAL
    img = make_text_image(status, f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                          int(12 * SCALE), status_col, tracking=int(3 * SCALE))
    pil_to_cairo_source(ctx, img, int(cx - img.width / 2), int(code_y + 22 * SCALE))

# === FOOTER CONTEXT BAND (above wordmark, below discs) ===
context_y = H * 0.62
ctx.set_line_width(0.7 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.65)
ctx.move_to(field_l, context_y); ctx.line_to(field_r, context_y); ctx.stroke()
for x in (field_l, field_r):
    ctx.move_to(x, context_y); ctx.line_to(x, context_y + 12 * SCALE); ctx.stroke()

img = make_text_image("01 OF 05 REVEALED  .  PERSONALITY DETECTED MID-INTERVIEW",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(12 * SCALE), INK_DIM, tracking=int(4 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(context_y + 22 * SCALE))

# === WORDMARK ===
wordmark_y = context_y + 60 * SCALE
img = make_text_image("HIDDEN PERSONALITIES.",
                      f"{FONT_DIR}/BigShoulders-Bold.ttf",
                      int(108 * SCALE), INK, tracking=int(-2 * SCALE))
if img.width > field_w:
    new_w = field_w
    new_h = int(img.height * (field_w / img.width))
    img = img.resize((new_w, new_h), Image.LANCZOS)
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(wordmark_y))

# Tagline
tagline_y = wordmark_y + img.height + 28 * SCALE
img = make_text_image("Each one watches you differently.",
                      f"{FONT_DIR}/InstrumentSerif-Italic.ttf",
                      int(40 * SCALE), INK_DIM, tracking=int(1 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(tagline_y))

# Footer band
footer_y = H - margin - 24 * SCALE
img = make_text_image("UFA  .  PSY-05  .  2026",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l), int(footer_y))
img = make_text_image("REGISTRY  .  MK . I - V",
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
