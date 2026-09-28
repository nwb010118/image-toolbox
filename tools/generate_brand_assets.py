"""
브랜드 이미지 생성 스크립트 (OG 이미지, PWA 아이콘, 애플 터치 아이콘).

favicon.svg의 브랜드 마크(둥근 사각형 + 흰색 선 3개 + 화살표)를 Pillow로
동일한 비율로 다시 그려서 여러 크기의 PNG로 내보낸다. 외부 이미지·폰트
에셋 없이 시스템에 이미 설치된 맑은 고딕(malgun.ttf)만 사용한다.

실행: python3 tools/generate_brand_assets.py
출력: images/og-image.png, images/icon-192.png, images/icon-512.png,
      images/apple-touch-icon.png
"""

from PIL import Image, ImageDraw, ImageFont

ACCENT = (17, 107, 93)  # #116b5d, css/site.css --color-accent
ACCENT_DARK = (11, 80, 69)  # #0b5045, --color-accent-dark
WHITE = (255, 255, 255)

FONT_BOLD = "C:/Windows/Fonts/malgunbd.ttf"
FONT_REGULAR = "C:/Windows/Fonts/malgun.ttf"


def draw_brand_mark(size, corner_radius_ratio=0.25, bg=ACCENT):
    """favicon.svg의 32x32 viewBox 마크를 size x size로 다시 그린다."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=int(size * corner_radius_ratio),
        fill=bg,
    )

    scale = size / 32.0
    stroke_w = max(2, round(2 * scale))

    def pt(x, y):
        return (x * scale, y * scale)

    line_specs = [(8, 11, 24, 11), (8, 16, 19, 16), (8, 21, 15, 21)]
    for x1, y1, x2, y2 in line_specs:
        draw.line([pt(x1, y1), pt(x2, y2)], fill=WHITE, width=stroke_w)

    arrow = [pt(21, 15), pt(24, 18), pt(21, 21)]
    draw.line([arrow[0], arrow[1]], fill=WHITE, width=stroke_w, joint="curve")
    draw.line([arrow[1], arrow[2]], fill=WHITE, width=stroke_w, joint="curve")

    return img


def generate_icons():
    for size, name in [(192, "icon-192.png"), (512, "icon-512.png")]:
        icon = draw_brand_mark(size, corner_radius_ratio=0.28)
        icon.save(f"images/{name}")
        print(f"saved images/{name}")

    # Apple touch icon: solid background (no transparency), iOS applies its own mask.
    apple = Image.new("RGB", (180, 180), ACCENT)
    mark = draw_brand_mark(180, corner_radius_ratio=0)
    apple.paste(mark, (0, 0), mark)
    apple.save("images/apple-touch-icon.png")
    print("saved images/apple-touch-icon.png")


def generate_og_image():
    width, height = 1200, 630
    img = Image.new("RGB", (width, height), ACCENT)
    draw = ImageDraw.Draw(img)

    # Subtle darker panel at the bottom for depth.
    draw.rectangle([0, height - 120, width, height], fill=ACCENT_DARK)

    mark_size = 96
    mark = draw_brand_mark(mark_size, corner_radius_ratio=0.22, bg=WHITE)
    # Redraw with accent-colored lines on white background for contrast on the card.
    mark = Image.new("RGBA", (mark_size, mark_size), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(mark)
    mdraw.rounded_rectangle([0, 0, mark_size - 1, mark_size - 1], radius=22, fill=WHITE)
    scale = mark_size / 32.0
    stroke_w = max(3, round(2.4 * scale))
    for x1, y1, x2, y2 in [(8, 11, 24, 11), (8, 16, 19, 16), (8, 21, 15, 21)]:
        mdraw.line([(x1 * scale, y1 * scale), (x2 * scale, y2 * scale)], fill=ACCENT, width=stroke_w)
    mdraw.line([(21 * scale, 15 * scale), (24 * scale, 18 * scale)], fill=ACCENT, width=stroke_w, joint="curve")
    mdraw.line([(24 * scale, 18 * scale), (21 * scale, 21 * scale)], fill=ACCENT, width=stroke_w, joint="curve")

    img.paste(mark, (80, 80), mark)

    title_font = ImageFont.truetype(FONT_BOLD, 64)
    tagline_font = ImageFont.truetype(FONT_REGULAR, 34)
    footer_font = ImageFont.truetype(FONT_REGULAR, 26)

    draw.text((80, 210), "image toolbox.", font=title_font, fill=WHITE)
    draw.text(
        (80, 300),
        "이미지 압축 · PDF 변환 · AI 업스케일링",
        font=tagline_font,
        fill=WHITE,
    )
    draw.text(
        (80, 350),
        "전부 브라우저에서 무료로 처리, 서버 전송 없음",
        font=tagline_font,
        fill=(220, 235, 230),
    )
    draw.text(
        (80, height - 80),
        "nwb010118.github.io/image-toolbox",
        font=footer_font,
        fill=(200, 220, 214),
    )

    img.save("images/og-image.png")
    print("saved images/og-image.png")


if __name__ == "__main__":
    generate_icons()
    generate_og_image()
