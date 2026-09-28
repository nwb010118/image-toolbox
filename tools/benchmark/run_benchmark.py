"""
image-toolbox 압축률 실측 스크립트

목적: JPG/PNG/WebP 압축률을 이미지 종류(사진형/그래픽형)와 품질 설정별로
실제로 측정해 tools/benchmark/results.json에 기록한다.

중요: 이 스크립트는 Python Pillow의 인코더를 사용한다. 이 사이트의 실제
압축 도구(index.html)는 브라우저의 Canvas API(toBlob)로 인코딩하므로,
같은 품질 설정이라도 브라우저마다, 그리고 Pillow와 Canvas API 사이에
바이트 단위로 다른 결과가 나올 수 있다. 이 스크립트의 결과는
"형식/품질에 따른 압축 경향"을 보여주는 참고 자료이며, 사이트 도구가
브라우저에서 만들어내는 정확한 파일 크기를 그대로 재현하지는 않는다.

실행: python3 tools/benchmark/run_benchmark.py
"""

import json
import os
import random
import time
from pathlib import Path

from PIL import Image, ImageDraw

BASE_DIR = Path(__file__).parent
SAMPLES_DIR = BASE_DIR / "samples"
RESULTS_PATH = BASE_DIR / "results.json"

WIDTH, HEIGHT = 1200, 800
QUALITIES = [100, 90, 80, 60, 40]
RANDOM_SEED = 20260928


def make_photo_like_sample():
    """그라디언트 + 노이즈로 만든 사진형 샘플 (연속톤 이미지 특성)."""
    random.seed(RANDOM_SEED)
    img = Image.new("RGB", (WIDTH, HEIGHT))
    pixels = img.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            r = int(255 * (x / WIDTH))
            g = int(255 * (y / HEIGHT))
            b = int(255 * ((x + y) / (WIDTH + HEIGHT)))
            noise = random.randint(-12, 12)
            pixels[x, y] = (
                max(0, min(255, r + noise)),
                max(0, min(255, g + noise)),
                max(0, min(255, b + noise)),
            )
    return img


def make_graphic_like_sample():
    """단색 블록 + 선으로 만든 그래픽형 샘플 (스크린샷/UI/로고 특성)."""
    img = Image.new("RGB", (WIDTH, HEIGHT), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    block_colors = [
        (20, 184, 166), (13, 148, 136), (255, 255, 255),
        (30, 41, 59), (241, 245, 249), (244, 63, 94),
    ]
    cols, rows = 6, 4
    cell_w, cell_h = WIDTH // cols, HEIGHT // rows
    for row in range(rows):
        for col in range(cols):
            color = block_colors[(row + col) % len(block_colors)]
            x0, y0 = col * cell_w, row * cell_h
            draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], fill=color)
    for i in range(0, WIDTH, 40):
        draw.line([(i, 0), (i, HEIGHT)], fill=(15, 23, 42), width=2)
    for i in range(0, HEIGHT, 40):
        draw.line([(0, i), (WIDTH, i)], fill=(15, 23, 42), width=2)
    return img


def measure_format(img, sample_name, fmt, quality=None):
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    suffix = f"_{fmt.lower()}" + (f"_q{quality}" if quality is not None else "")
    ext = "jpg" if fmt == "JPEG" else fmt.lower()
    out_path = SAMPLES_DIR / f"{sample_name}{suffix}.{ext}"

    save_kwargs = {}
    if fmt == "JPEG":
        save_kwargs = {"quality": quality, "optimize": True}
    elif fmt == "WEBP":
        save_kwargs = {"quality": quality}
    elif fmt == "PNG":
        save_kwargs = {"optimize": True}

    start = time.perf_counter()
    img.save(out_path, format=fmt, **save_kwargs)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    size_bytes = out_path.stat().st_size
    return size_bytes, elapsed_ms


def run():
    samples = {
        "photo_like": make_photo_like_sample(),
        "graphic_like": make_graphic_like_sample(),
    }

    results = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z") or time.strftime("%Y-%m-%d"),
        "encoder": f"Pillow {Image.__version__ if hasattr(Image, '__version__') else 'unknown'}",
        "note": (
            "이 결과는 Python Pillow 인코더로 측정한 값이며, 사이트의 실제 압축 도구가 쓰는 "
            "브라우저 Canvas API(toBlob) 결과와 바이트 단위로 다를 수 있습니다. "
            "형식/품질별 압축 경향을 보여주는 참고 자료입니다."
        ),
        "image_dimensions": {"width": WIDTH, "height": HEIGHT},
        "samples": {},
    }

    for sample_name, img in samples.items():
        sample_result = {"formats": {}}

        png_size, png_ms = measure_format(img, sample_name, "PNG")
        sample_result["formats"]["PNG"] = {
            "quality": None,
            "size_bytes": png_size,
            "encode_time_ms": png_ms,
            "reduction_vs_png_percent": 0.0,
        }

        for fmt in ("JPEG", "WEBP"):
            sample_result["formats"].setdefault(fmt, {})
            for q in QUALITIES:
                size_bytes, ms = measure_format(img, sample_name, fmt, quality=q)
                reduction = round((1 - size_bytes / png_size) * 100, 1)
                sample_result["formats"][fmt][f"q{q}"] = {
                    "quality": q,
                    "size_bytes": size_bytes,
                    "encode_time_ms": ms,
                    "reduction_vs_png_percent": reduction,
                }

        results["samples"][sample_name] = sample_result

    RESULTS_PATH.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"결과 저장 완료: {RESULTS_PATH}")
    print_summary(results)


def print_summary(results):
    for sample_name, data in results["samples"].items():
        print(f"\n=== {sample_name} ({results['image_dimensions']['width']}x{results['image_dimensions']['height']}) ===")
        png = data["formats"]["PNG"]
        print(f"PNG (원본 기준): {png['size_bytes']:,} bytes")
        for fmt in ("JPEG", "WEBP"):
            for q in QUALITIES:
                entry = data["formats"][fmt][f"q{q}"]
                print(
                    f"  {fmt} q{q}: {entry['size_bytes']:,} bytes "
                    f"({entry['reduction_vs_png_percent']}% vs PNG)"
                )


if __name__ == "__main__":
    run()
