#!/usr/bin/env python3
"""Deterministic image treatment for make-placeholder-section-art.mjs; Pillow only."""
import sys
from io import BytesIO
from fontTools.ttLib import TTFont
from PIL import Image, ImageOps, ImageDraw, ImageFont

source, target, colour = sys.argv[1:]
# Match History's original exports: 3:4, with colour baked into every pixel.
size = (1440, 1920)
frame = ImageOps.fit(Image.open(source).convert('RGB'), size, method=Image.Resampling.LANCZOS)
grey = ImageOps.autocontrast(ImageOps.grayscale(frame), cutoff=1)
frame = ImageOps.colorize(grey, black='#1c1c1c', white=colour)
# Central diagonal hazard band survives both tall pane and phone landscape crops.
band = Image.new('RGBA', (1900, 280), '#1c1c1c')
draw = ImageDraw.Draw(band)
for x in range(-280, 2200, 70):
    draw.polygon([(x, 0), (x+28, 0), (x-252, 280), (x-280, 280)], fill=colour)
draw.rectangle((0, 60, 1900, 220), fill='#1c1c1c')
# Bundled mono face; identical mark on macOS and CI, no system font dependency.
face = TTFont('public/publicAssets/fonts/IBM-Plex/IBM-Plex-Mono/fonts/split/woff/IBMPlexMono-Medium-Latin1.woff')
face.flavor = None
font_bytes = BytesIO()
face.save(font_bytes)
font_bytes.seek(0)
font = ImageFont.truetype(font_bytes, 115)
text = 'PLACEHOLDER'
box = draw.textbbox((0,0), text, font=font)
width = box[2]-box[0] + (len(text)-1)*8
x = (1900-width)//2
for char in text:
    draw.text((x, 68), char, font=font, fill='white')
    x += draw.textlength(char,font=font)+8
band = band.rotate(18, resample=Image.Resampling.BICUBIC, expand=True)
frame = frame.convert('RGBA')
frame.alpha_composite(band, ((1440-band.width)//2, (1920-band.height)//2))
frame.convert('RGB').save(target, 'WEBP', quality=84, method=6)
