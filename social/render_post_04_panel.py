"""
UnderFireAI Social Launch Pack
Post 04: PANEL INTERVIEWS
Triangulation of three thermal stations onto a central focal subject.
"""
import cairo, math, os
from PIL import Image, ImageDraw, ImageFont

SCALE = 2
W = 1080 * SCALE
H = 1080 * SCALE
OUT_DIR = "/sessions/blissful-amazing-hypatia/mnt/underfireai/social"
OUT_FILE = os.path.join(OUT_DIR, "post_04_panel.png")
FONT_DIR = "/sessions/blissful-amazing-hypatia/mnt/.claude/skills/canvas-design/canvas-fonts"

BG          = (0.031, 0.027, 0.039)
INK         = (0.839, 0.827, 0.812)
INK_DIM     = (0.420, 0.408, 0.392)
HAIRLINE    = (0.196, 0.184, 0.172)
HEAT_HOT    = (1.000, 0.475, 0.094)
HEAT_DEEP   = (0.749, 0.196, 0.027)
HEAT_GLOW   = (1.000, 0.690, 0.408)
MAGNESIUM   = (0.964, 0.945, 0.875)


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
img = make_text_image("N . 04 / 05", f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l + 16 * SCALE), int(field_t + 16 * SCALE))
img = make_text_image("REF . UFA-PNL-003", f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_r - img.width - 16 * SCALE), int(field_t + 16 * SCALE))


# === FOCAL NODE ===
focus_cx = W / 2
focus_cy = H * 0.44

# Stations at three positions (top, bottom-left, bottom-right) — equilateral triangle around focus
station_r_outer = W * 0.26   # distance from focus to each station
stations = [
    {"angle": -math.pi / 2,        "label": "STN  A", "ref": "STK-08", "role": "TECHNICAL"},
    {"angle": math.pi - math.pi/6, "label": "STN  B", "ref": "STK-12", "role": "BEHAVIOURAL"},
    {"angle": math.pi/6,           "label": "STN  C", "ref": "STK-04", "role": "EXECUTIVE"},
]
# adjust angles to form a proper inverted-triangle layout
stations[0]["pos"] = (focus_cx + math.cos(-math.pi/2) * station_r_outer,
                      focus_cy + math.sin(-math.pi/2) * station_r_outer)
stations[1]["pos"] = (focus_cx + math.cos(math.pi + math.pi/6) * station_r_outer,
                      focus_cy + math.sin(math.pi + math.pi/6) * station_r_outer)
stations[2]["pos"] = (focus_cx + math.cos(-math.pi/6) * station_r_outer,
                      focus_cy + math.sin(-math.pi/6) * station_r_outer)

# Background pressure field — soft concentric rings emanating outward from focus
ctx.save()
for i in range(1, 7):
    ctx.set_line_width(0.5 * SCALE)
    ctx.set_source_rgba(HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.10 + 0.04 * (6 - i))
    ctx.arc(focus_cx, focus_cy, 32 * SCALE + i * 28 * SCALE, 0, 2 * math.pi)
    ctx.stroke()
ctx.restore()

# Vectors from each station to focus
for st in stations:
    sx, sy = st["pos"]
    # Vector hairline with subtle gradient (hot near focus, ink near station)
    grad = cairo.LinearGradient(sx, sy, focus_cx, focus_cy)
    grad.add_color_stop_rgba(0.0,  INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.55)
    grad.add_color_stop_rgba(0.55, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.85)
    grad.add_color_stop_rgba(1.0,  HEAT_HOT[0], HEAT_HOT[1], HEAT_HOT[2], 0.95)
    ctx.set_source(grad)
    ctx.set_line_width(1.4 * SCALE)
    # Stop short of focus so arrow indicator can sit cleanly
    end_dx = focus_cx - sx; end_dy = focus_cy - sy
    end_len = math.hypot(end_dx, end_dy)
    ux = end_dx / end_len; uy = end_dy / end_len
    end_short = 38 * SCALE
    ctx.move_to(sx + ux * 26 * SCALE, sy + uy * 26 * SCALE)
    ctx.line_to(focus_cx - ux * end_short, focus_cy - uy * end_short)
    ctx.stroke()
    # Midpoint tick mark
    mx = sx + ux * (end_len * 0.55)
    my = sy + uy * (end_len * 0.55)
    perp_x = -uy; perp_y = ux
    ctx.set_line_width(1.0 * SCALE)
    ctx.set_source_rgba(HEAT_HOT[0], HEAT_HOT[1], HEAT_HOT[2], 0.85)
    ctx.move_to(mx - perp_x * 6 * SCALE, my - perp_y * 6 * SCALE)
    ctx.line_to(mx + perp_x * 6 * SCALE, my + perp_y * 6 * SCALE)
    ctx.stroke()
    # Arrowhead near focus
    ah = 10 * SCALE
    ctx.set_line_width(1.2 * SCALE)
    ctx.set_source_rgba(HEAT_HOT[0], HEAT_HOT[1], HEAT_HOT[2], 0.95)
    head_tip_x = focus_cx - ux * end_short
    head_tip_y = focus_cy - uy * end_short
    ctx.move_to(head_tip_x, head_tip_y)
    ctx.line_to(head_tip_x - ux * ah - uy * ah * 0.6,
                head_tip_y - uy * ah + ux * ah * 0.6)
    ctx.move_to(head_tip_x, head_tip_y)
    ctx.line_to(head_tip_x - ux * ah + uy * ah * 0.6,
                head_tip_y - uy * ah - ux * ah * 0.6)
    ctx.stroke()


# Draw each STATION arc (mini thermal gauge, aimed toward focus)
def draw_station_arc(ctx, sx, sy, focus_x, focus_y, label, ref, role):
    # Vector from station to focus
    dx = focus_x - sx; dy = focus_y - sy
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    # Arc center sits at station position; arc faces the focus
    arc_r = 38 * SCALE
    # The arc faces the focus, so the arc opens toward it
    # Angle from station to focus
    aim_angle = math.atan2(uy, ux)
    # Draw a semi-arc facing the focus (open side toward focus)
    arc_start = aim_angle - math.pi / 2
    arc_end = aim_angle + math.pi / 2
    # The "open" arc is the one BEHIND the station — closed arc is the half facing the focus
    # We want a half-circle of ticks on the side facing the focus
    ctx.set_line_width(1.4 * SCALE)
    ctx.set_source_rgba(INK[0], INK[1], INK[2], 0.82)
    ctx.arc(sx, sy, arc_r, arc_start, arc_end)
    ctx.stroke()
    # Tick marks on the arc — facing the focus
    n_ticks = 21
    for i in range(n_ticks):
        a = arc_start + (arc_end - arc_start) * i / (n_ticks - 1)
        is_major = (i % 5 == 0)
        tlen = 9 * SCALE if is_major else 4 * SCALE
        tw = 1.4 * SCALE if is_major else 0.8 * SCALE
        x1 = sx + math.cos(a) * arc_r
        y1 = sy + math.sin(a) * arc_r
        x2 = sx + math.cos(a) * (arc_r + tlen)
        y2 = sy + math.sin(a) * (arc_r + tlen)
        # Center ticks (pointed at focus) glow hot
        center_dist = abs(i - (n_ticks - 1) / 2)
        if center_dist < 2:
            col = HEAT_HOT; alpha = 0.95
        else:
            col = INK; alpha = 0.75
        ctx.set_line_width(tw)
        ctx.set_source_rgba(col[0], col[1], col[2], alpha)
        ctx.move_to(x1, y1); ctx.line_to(x2, y2); ctx.stroke()

    # Small inner ring (instrument hub)
    ctx.set_line_width(0.7 * SCALE)
    ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.65)
    ctx.arc(sx, sy, arc_r * 0.55, 0, 2 * math.pi)
    ctx.stroke()
    # Hub fill — small heat dot
    ctx.set_source_rgba(HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.85)
    ctx.arc(sx, sy, 5 * SCALE, 0, 2 * math.pi); ctx.fill()

    # Station label — placed on the BACK side (away from focus)
    label_dx = -ux; label_dy = -uy  # away from focus
    label_offset = arc_r + 30 * SCALE
    lx = sx + label_dx * label_offset
    ly = sy + label_dy * label_offset

    # Main label (e.g., "STN  A")
    img = make_text_image(label, f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                          int(18 * SCALE), INK, tracking=int(4 * SCALE))
    pil_to_cairo_source(ctx, img, int(lx - img.width / 2), int(ly - img.height / 2 - 14 * SCALE))

    # Role
    img = make_text_image(role, f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                          int(11 * SCALE), HEAT_HOT, tracking=int(3 * SCALE))
    pil_to_cairo_source(ctx, img, int(lx - img.width / 2), int(ly + 6 * SCALE))

    # Ref code
    img = make_text_image(ref, f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                          int(11 * SCALE), INK_DIM, tracking=int(3 * SCALE))
    pil_to_cairo_source(ctx, img, int(lx - img.width / 2), int(ly + 24 * SCALE))


for st in stations:
    draw_station_arc(ctx, st["pos"][0], st["pos"][1], focus_cx, focus_cy,
                     st["label"], st["ref"], st["role"])

# === FOCAL NODE (subject under pressure) ===
# Hot inner ring + outer ring + crosshair
# Big halo glow
halo = cairo.RadialGradient(focus_cx, focus_cy, 0, focus_cx, focus_cy, 90 * SCALE)
halo.add_color_stop_rgba(0,   HEAT_GLOW[0], HEAT_GLOW[1], HEAT_GLOW[2], 0.55)
halo.add_color_stop_rgba(0.3, HEAT_HOT[0],  HEAT_HOT[1],  HEAT_HOT[2],  0.30)
halo.add_color_stop_rgba(0.7, HEAT_DEEP[0], HEAT_DEEP[1], HEAT_DEEP[2], 0.10)
halo.add_color_stop_rgba(1.0, 0, 0, 0, 0.0)
ctx.set_source(halo)
ctx.arc(focus_cx, focus_cy, 90 * SCALE, 0, 2 * math.pi); ctx.fill()

# Outer ring (hairline)
ctx.set_line_width(1.0 * SCALE)
ctx.set_source_rgba(MAGNESIUM[0], MAGNESIUM[1], MAGNESIUM[2], 0.55)
ctx.arc(focus_cx, focus_cy, 30 * SCALE, 0, 2 * math.pi); ctx.stroke()
# Inner ring
ctx.set_line_width(1.4 * SCALE)
ctx.set_source_rgba(MAGNESIUM[0], MAGNESIUM[1], MAGNESIUM[2], 0.95)
ctx.arc(focus_cx, focus_cy, 16 * SCALE, 0, 2 * math.pi); ctx.stroke()
# Crosshair through center
ctx.set_line_width(0.8 * SCALE)
ctx.set_source_rgba(MAGNESIUM[0], MAGNESIUM[1], MAGNESIUM[2], 0.85)
ctx.move_to(focus_cx - 44 * SCALE, focus_cy); ctx.line_to(focus_cx - 22 * SCALE, focus_cy)
ctx.move_to(focus_cx + 22 * SCALE, focus_cy); ctx.line_to(focus_cx + 44 * SCALE, focus_cy)
ctx.move_to(focus_cx, focus_cy - 44 * SCALE); ctx.line_to(focus_cx, focus_cy - 22 * SCALE)
ctx.move_to(focus_cx, focus_cy + 22 * SCALE); ctx.line_to(focus_cx, focus_cy + 44 * SCALE)
ctx.stroke()
# Central dot
ctx.set_source_rgba(MAGNESIUM[0], MAGNESIUM[1], MAGNESIUM[2], 1.0)
ctx.arc(focus_cx, focus_cy, 3.5 * SCALE, 0, 2 * math.pi); ctx.fill()

# "SUBJECT" label below the focal point
img = make_text_image("SUBJECT  .  YOU",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(13 * SCALE), MAGNESIUM, tracking=int(4 * SCALE))
pil_to_cairo_source(ctx, img, int(focus_cx - img.width / 2), int(focus_cy + 60 * SCALE))

# === CONTEXT BAND ===
context_y = H * 0.63
ctx.set_line_width(0.7 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.65)
ctx.move_to(field_l, context_y); ctx.line_to(field_r, context_y); ctx.stroke()
for x in (field_l, field_r):
    ctx.move_to(x, context_y); ctx.line_to(x, context_y + 12 * SCALE); ctx.stroke()
img = make_text_image("THREE STATIONS  .  ONE SUBJECT  .  SIMULTANEOUS PRESSURE",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(12 * SCALE), INK_DIM, tracking=int(4 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(context_y + 22 * SCALE))

# Wordmark
wordmark_y = context_y + 44 * SCALE
img = make_text_image("PANEL INTERVIEWS.", f"{FONT_DIR}/BigShoulders-Bold.ttf",
                      int(106 * SCALE), INK, tracking=int(-2 * SCALE))
if img.width > field_w:
    new_w = field_w
    new_h = int(img.height * (field_w / img.width))
    img = img.resize((new_w, new_h), Image.LANCZOS)
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(wordmark_y))

# Tagline
tagline_y = wordmark_y + img.height + 32 * SCALE
img = make_text_image("Three voices at once. Hold the line.",
                      f"{FONT_DIR}/InstrumentSerif-Italic.ttf",
                      int(38 * SCALE), INK_DIM, tracking=int(1 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(tagline_y))

# Footer
footer_y = H - margin - 24 * SCALE
img = make_text_image("UFA  .  PNL-03  .  2026",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l), int(footer_y))
img = make_text_image("TRIANGULATION  .  3X",
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
