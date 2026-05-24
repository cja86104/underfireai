"""
UnderFireAI Social Launch Pack
Post 02: VOICE MODE — refined
"""
import cairo, math, os, random
from PIL import Image, ImageDraw, ImageFont

SCALE = 2
W = 1080 * SCALE
H = 1080 * SCALE
OUT_DIR = "/sessions/blissful-amazing-hypatia/mnt/underfireai/social"
OUT_FILE = os.path.join(OUT_DIR, "post_02_voice.png")
FONT_DIR = "/sessions/blissful-amazing-hypatia/mnt/.claude/skills/canvas-design/canvas-fonts"

BG          = (0.031, 0.027, 0.039)
INK         = (0.839, 0.827, 0.812)
INK_DIM     = (0.420, 0.408, 0.392)
HAIRLINE    = (0.196, 0.184, 0.172)
HEAT_HOT    = (1.000, 0.475, 0.094)
HEAT_DEEP   = (0.749, 0.196, 0.027)
HEAT_GLOW   = (1.000, 0.690, 0.408)
MAGNESIUM   = (0.964, 0.945, 0.875)


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
img = make_text_image("N . 02 / 05",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l + 16 * SCALE), int(field_t + 16 * SCALE))
img = make_text_image("REF . UFA-VCE-040",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(14 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_r - img.width - 16 * SCALE), int(field_t + 16 * SCALE))

# === 40 MS CALLOUT BLOCK (top-center, fully inside field) ===
callout_top = field_t + 56 * SCALE
# Big "40"
img40 = make_text_image("40", f"{FONT_DIR}/BigShoulders-Bold.ttf",
                        int(96 * SCALE), MAGNESIUM, tracking=int(-2 * SCALE))
# "MS" small
img_ms = make_text_image("MS", f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                         int(24 * SCALE), MAGNESIUM, tracking=int(3 * SCALE))
# Label below
img_lbl = make_text_image("TIME TO FIRST AUDIO",
                          f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                          int(13 * SCALE), INK_DIM, tracking=int(4 * SCALE))

# Compose the callout horizontally: 40 + MS to its right top, label centered below
block_w = img40.width + 18 * SCALE + img_ms.width
block_x = (W - block_w) // 2
img40_y = callout_top
ms_y = callout_top + 20 * SCALE  # baseline-align MS with the upper portion of "40"
pil_to_cairo_source(ctx, img40, int(block_x), int(img40_y))
pil_to_cairo_source(ctx, img_ms,
                    int(block_x + img40.width + 18 * SCALE),
                    int(ms_y))
# Label centered under "40 MS" block
label_y = callout_top + img40.height + 4 * SCALE
pil_to_cairo_source(ctx, img_lbl, int((W - img_lbl.width) / 2), int(label_y))

# Dashed vertical guide dropping FROM the label DOWN toward the waveform crest
guide_top = label_y + img_lbl.height + 12 * SCALE
guide_bot = H * 0.34  # ends just above waveform crest
ctx.save()
ctx.set_line_width(1.0 * SCALE)
ctx.set_source_rgba(MAGNESIUM[0], MAGNESIUM[1], MAGNESIUM[2], 0.55)
ctx.set_dash([6 * SCALE, 5 * SCALE])
ctx.move_to(W / 2, guide_top); ctx.line_to(W / 2, guide_bot)
ctx.stroke()
ctx.restore()

# === THERMAL WAVEFORM ===
wave_cy = H * 0.42
wave_left = field_l + 12 * SCALE
wave_right = field_r - 12 * SCALE
wave_w = wave_right - wave_left

# Background zero axis
ctx.set_line_width(0.8 * SCALE)
ctx.set_source_rgba(HAIRLINE[0], HAIRLINE[1], HAIRLINE[2], 0.9)
ctx.move_to(wave_left, wave_cy); ctx.line_to(wave_right, wave_cy); ctx.stroke()

# Deterministic sample stream
random.seed(7)
N = 220
samples = []
for i in range(N):
    t = i / (N - 1)
    env_a = math.exp(-((t - 0.32) ** 2) / 0.018) * 0.55
    env_b = math.exp(-((t - 0.50) ** 2) / 0.006) * 1.10
    env_c = math.exp(-((t - 0.72) ** 2) / 0.022) * 0.45
    env = max(env_a, env_b, env_c)
    carrier = (math.sin(t * 36) * 0.45
               + math.sin(t * 73 + 1.3) * 0.30
               + math.sin(t * 127 + 0.7) * 0.18
               + (random.random() - 0.5) * 0.16)
    samples.append(env * carrier)

max_amp = max(abs(s) for s in samples)
wave_h_amp = H * 0.13   # reduced so crest stays well within field
peak_idx = max(range(N), key=lambda i: abs(samples[i]))

# Soft echo shadows
for shadow_pass in range(3):
    offset = (shadow_pass + 1) * 3 * SCALE
    alpha = 0.10 - shadow_pass * 0.025
    ctx.set_line_width((1.2 - shadow_pass * 0.25) * SCALE)
    ctx.set_source_rgba(HEAT_HOT[0], HEAT_HOT[1], HEAT_HOT[2], alpha)
    ctx.new_path()
    for i, s in enumerate(samples):
        x = wave_left + (wave_w * i / (N - 1))
        y = wave_cy - (s / max_amp) * wave_h_amp + offset
        if i == 0: ctx.move_to(x, y)
        else: ctx.line_to(x, y)
    ctx.stroke()

# Vertical bars
ctx.set_line_cap(cairo.LINE_CAP_BUTT)
for i, s in enumerate(samples):
    x = wave_left + (wave_w * i / (N - 1))
    amp = (s / max_amp) * wave_h_amp
    rel = abs(i - peak_idx) / max(N - peak_idx, peak_idx)
    if rel < 0.04:   col = MAGNESIUM; alpha = 1.00; lw = 2.0 * SCALE
    elif rel < 0.15: col = HEAT_GLOW; alpha = 0.95; lw = 1.6 * SCALE
    elif rel < 0.35: col = HEAT_HOT;  alpha = 0.88; lw = 1.4 * SCALE
    elif rel < 0.60: col = HEAT_DEEP; alpha = 0.75; lw = 1.2 * SCALE
    else:            col = INK_DIM;   alpha = 0.55; lw = 1.0 * SCALE
    ctx.set_line_width(lw)
    ctx.set_source_rgba(col[0], col[1], col[2], alpha)
    ctx.move_to(x, wave_cy - amp); ctx.line_to(x, wave_cy + amp); ctx.stroke()

# Crest ring
peak_x = wave_left + (wave_w * peak_idx / (N - 1))
peak_amp = abs(samples[peak_idx] / max_amp) * wave_h_amp
ctx.set_line_width(1.4 * SCALE)
ctx.set_source_rgba(MAGNESIUM[0], MAGNESIUM[1], MAGNESIUM[2], 0.95)
ctx.arc(peak_x, wave_cy - peak_amp, 8 * SCALE, 0, 2 * math.pi)
ctx.stroke()

# Time axis below
axis_y = wave_cy + wave_h_amp + 50 * SCALE
ctx.set_line_width(0.7 * SCALE)
ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.75)
ctx.move_to(wave_left, axis_y); ctx.line_to(wave_right, axis_y); ctx.stroke()
for x in (wave_left, wave_right):
    ctx.move_to(x, axis_y); ctx.line_to(x, axis_y + 12 * SCALE); ctx.stroke()

time_labels = ["0 MS", "200 MS", "400 MS", "600 MS", "800 MS"]
n_t = len(time_labels)
for i, lbl in enumerate(time_labels):
    x = wave_left + (wave_w * i / (n_t - 1))
    ctx.set_line_width(1.0 * SCALE)
    ctx.set_source_rgba(INK_DIM[0], INK_DIM[1], INK_DIM[2], 0.85)
    ctx.move_to(x, axis_y); ctx.line_to(x, axis_y + 10 * SCALE); ctx.stroke()
    img = make_text_image(lbl, f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                          int(13 * SCALE), INK_DIM, tracking=int(2 * SCALE))
    pil_to_cairo_source(ctx, img, int(x - img.width / 2), int(axis_y + 18 * SCALE))

# Sub-axis caption
img = make_text_image("STREAM  .  REAL-TIME  .  CONTINUOUS",
                      f"{FONT_DIR}/JetBrainsMono-Regular.ttf",
                      int(12 * SCALE), INK_DIM, tracking=int(4 * SCALE))
pil_to_cairo_source(ctx, img, int(wave_left + (wave_w - img.width) / 2),
                    int(axis_y + 56 * SCALE))

# Horizon position (used to anchor wordmark only — no visible rule, axis below waveform serves that role)
horizon_y = H * 0.62

# Wordmark
wordmark_y = horizon_y + 52 * SCALE
img = make_text_image("VOICE MODE.", f"{FONT_DIR}/BigShoulders-Bold.ttf",
                      int(132 * SCALE), INK, tracking=int(-2 * SCALE))
if img.width > field_w:
    new_w = field_w
    new_h = int(img.height * (field_w / img.width))
    img = img.resize((new_w, new_h), Image.LANCZOS)
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(wordmark_y))

# Tagline
tagline_y = wordmark_y + img.height + 28 * SCALE
img = make_text_image("Pressure-tested in real time.",
                      f"{FONT_DIR}/InstrumentSerif-Italic.ttf",
                      int(40 * SCALE), INK_DIM, tracking=int(1 * SCALE))
pil_to_cairo_source(ctx, img, int((W - img.width) / 2), int(tagline_y))

# Footer
footer_y = H - margin - 24 * SCALE
img = make_text_image("UFA  .  VCE-01  .  2026",
                      f"{FONT_DIR}/JetBrainsMono-Bold.ttf",
                      int(15 * SCALE), INK_DIM, tracking=int(2 * SCALE))
pil_to_cairo_source(ctx, img, int(field_l), int(footer_y))
img = make_text_image("CARTESIA  .  SONIC III",
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
