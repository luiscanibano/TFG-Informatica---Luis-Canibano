from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ICONS_DIR = ROOT / "icons"


def vertical_gradient(size, top_rgb, bottom_rgb):
    width, height = size
    base = Image.new("RGBA", size)
    pixels = []
    for y in range(height):
        ratio = y / max(height - 1, 1)
        row = tuple(
            int(top_rgb[index] + (bottom_rgb[index] - top_rgb[index]) * ratio)
            for index in range(3)
        )
        pixels.extend([(*row, 255)] * width)
    base.putdata(pixels)
    return base


def shape_mask(size, draw_fn):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw_fn(draw)
    return mask


def apply_mask(image, mask):
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.paste(image, (0, 0), mask)
    return result


def add_glow(base, mask, color, blur_radius, alpha=255):
    glow = Image.new("RGBA", base.size, (*color, alpha))
    glow.putalpha(mask)
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(blur_radius)))


def build_icon(master_size=1024):
    canvas = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    outer_margin = int(master_size * 0.06)
    panel_radius = int(master_size * 0.2)
    panel_box = (
        outer_margin,
        outer_margin,
        master_size - outer_margin,
        master_size - outer_margin,
    )

    panel_gradient = vertical_gradient(
        (master_size, master_size),
        (7, 13, 24),
        (14, 24, 38),
    )
    panel_mask = shape_mask(
        (master_size, master_size),
        lambda mask_draw: mask_draw.rounded_rectangle(
            panel_box, radius=panel_radius, fill=255
        ),
    )
    canvas.alpha_composite(apply_mask(panel_gradient, panel_mask))

    border = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border)
    border_draw.rounded_rectangle(
        panel_box,
        radius=panel_radius,
        outline=(170, 206, 255, 240),
        width=max(6, master_size // 85),
    )
    canvas.alpha_composite(border)

    inner_shadow = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    inner_shadow_draw = ImageDraw.Draw(inner_shadow)
    inset = outer_margin + max(10, master_size // 80)
    inner_shadow_draw.rounded_rectangle(
        (inset, inset, master_size - inset, master_size - inset),
        radius=panel_radius - max(10, master_size // 90),
        outline=(255, 255, 255, 24),
        width=max(2, master_size // 200),
    )
    canvas.alpha_composite(inner_shadow)

    grid = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    left = int(master_size * 0.31)
    top = int(master_size * 0.2)
    right = int(master_size * 0.76)
    bottom = int(master_size * 0.83)
    for index in range(5):
        x = int(left + ((right - left) * index / 4))
        grid_draw.line((x, top, x, bottom), fill=(125, 160, 215, 32), width=2)
    for index in range(6):
        y = int(top + ((bottom - top) * index / 5))
        grid_draw.line((left, y, right, y), fill=(125, 160, 215, 28), width=2)
    canvas.alpha_composite(grid)

    pillar_box = (
        int(master_size * 0.32),
        int(master_size * 0.24),
        int(master_size * 0.47),
        int(master_size * 0.76),
    )
    pillar_mask = shape_mask(
        (master_size, master_size),
        lambda mask_draw: mask_draw.rounded_rectangle(
            pillar_box,
            radius=int(master_size * 0.08),
            fill=255,
        ),
    )
    pillar_gradient = vertical_gradient(
        (master_size, master_size),
        (242, 246, 255),
        (133, 173, 255),
    )
    add_glow(canvas, pillar_mask, (146, 184, 255), blur_radius=44, alpha=140)
    canvas.alpha_composite(apply_mask(pillar_gradient, pillar_mask))

    pillar_highlight = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    pillar_highlight_draw = ImageDraw.Draw(pillar_highlight)
    pillar_highlight_draw.rounded_rectangle(
        (
            pillar_box[0] + max(6, master_size // 120),
            pillar_box[1] + max(6, master_size // 120),
            pillar_box[0] + max(20, master_size // 32),
            pillar_box[3] - max(12, master_size // 48),
        ),
        radius=int(master_size * 0.03),
        fill=(255, 255, 255, 100),
    )
    canvas.alpha_composite(pillar_highlight)

    segment = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    segment_draw = ImageDraw.Draw(segment)
    segment_draw.line(
        (
            int(master_size * 0.41),
            int(master_size * 0.58),
            int(master_size * 0.63),
            int(master_size * 0.42),
        ),
        fill=(246, 250, 255, 255),
        width=max(28, master_size // 16),
        joint="curve",
    )
    segment_draw.line(
        (
            int(master_size * 0.41),
            int(master_size * 0.58),
            int(master_size * 0.63),
            int(master_size * 0.42),
        ),
        fill=(150, 191, 255, 120),
        width=max(42, master_size // 12),
        joint="curve",
    )
    segment = segment.filter(ImageFilter.GaussianBlur(6))
    canvas.alpha_composite(segment)

    core_segment = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    core_segment_draw = ImageDraw.Draw(core_segment)
    core_segment_draw.line(
        (
            int(master_size * 0.41),
            int(master_size * 0.58),
            int(master_size * 0.63),
            int(master_size * 0.42),
        ),
        fill=(245, 248, 255, 255),
        width=max(22, master_size // 20),
        joint="curve",
    )
    canvas.alpha_composite(core_segment)

    node = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    node_draw = ImageDraw.Draw(node)
    node_radius = int(master_size * 0.062)
    node_center = (int(master_size * 0.67), int(master_size * 0.37))
    node_draw.ellipse(
        (
            node_center[0] - node_radius,
            node_center[1] - node_radius,
            node_center[0] + node_radius,
            node_center[1] + node_radius,
        ),
        fill=(247, 249, 255, 255),
    )
    add_glow(
        canvas,
        shape_mask(
            (master_size, master_size),
            lambda mask_draw: mask_draw.ellipse(
                (
                    node_center[0] - node_radius,
                    node_center[1] - node_radius,
                    node_center[0] + node_radius,
                    node_center[1] + node_radius,
                ),
                fill=255,
            ),
        ),
        (165, 196, 255),
        blur_radius=28,
        alpha=135,
    )
    canvas.alpha_composite(node)

    shine = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    shine_draw = ImageDraw.Draw(shine)
    shine_draw.pieslice(
        (
            int(master_size * 0.18),
            int(master_size * 0.05),
            int(master_size * 0.82),
            int(master_size * 0.72),
        ),
        start=190,
        end=270,
        fill=(255, 255, 255, 16),
    )
    canvas.alpha_composite(shine.filter(ImageFilter.GaussianBlur(12)))

    return canvas


def save_icons():
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    master = build_icon()
    for size in (128, 48, 16):
        icon = master.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(ICONS_DIR / f"icon{size}.png")


if __name__ == "__main__":
    save_icons()