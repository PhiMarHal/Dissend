"""Build the small static font files used by the video.

Downloads are not automated here: place the upstream Google Fonts (OFL) files in
SRC (default: ./.font-src) and run `python3 tools/build_fonts.py`.  Variable
fonts are pinned to static instances, then every face is subset to the glyphs
the lyrics actually need so the repository stays light.

Requires: pip install fonttools brotli
"""
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, ".font-src")
OUT = os.path.join(ROOT, "assets", "fonts")

lyr = json.load(open(os.path.join(ROOT, "data", "lyrics.json"), encoding="utf-8"))
extra = json.load(open(os.path.join(ROOT, "data", "untimed-placement.json"), encoding="utf-8"))
text = "".join(l["text"] for l in lyr["lyrics"])
text += "".join(l["text"] for l in lyr["untimed_source_lines"])
text += "".join(l.get("text", "") for l in extra["placements"])
LATIN = "".join(chr(c) for c in range(0x20, 0x7F)) + "’‘“”—–…·"
KANA = "".join(chr(c) for c in range(0x3040, 0x30FF))
JP = "".join(sorted(set(c for c in text if ord(c) > 0x2000))) + KANA + "、。・「」ー｜"

FACES = [
    # (source file, output name, axes, glyph set)
    ("notoserifjp/NotoSerifJP[wght].ttf", "NotoSerifJP-Black.ttf", {"wght": 900}, JP + LATIN),
    ("notoserifjp/NotoSerifJP[wght].ttf", "NotoSerifJP-ExtraLight.ttf", {"wght": 200}, JP + LATIN),
    ("delagothicone/DelaGothicOne-Regular.ttf", "DelaGothicOne.ttf", None, JP + LATIN),
    ("anton/Anton-Regular.ttf", "Anton.ttf", None, LATIN),
    ("instrumentserif/InstrumentSerif-Italic.ttf", "InstrumentSerif-Italic.ttf", None, LATIN),
    ("instrumentserif/InstrumentSerif-Regular.ttf", "InstrumentSerif.ttf", None, LATIN),
    ("archivo/Archivo[wdth,wght].ttf", "Archivo-ExpandedBlack.ttf", {"wdth": 125, "wght": 900}, LATIN),
    ("archivo/Archivo[wdth,wght].ttf", "Archivo-ExpandedThin.ttf", {"wdth": 125, "wght": 100}, LATIN),
    ("archivo/Archivo[wdth,wght].ttf", "Archivo-CondensedBlack.ttf", {"wdth": 62, "wght": 900}, LATIN),
    ("archivo/Archivo[wdth,wght].ttf", "Archivo-Medium.ttf", {"wdth": 100, "wght": 500}, LATIN),
]

os.makedirs(OUT, exist_ok=True)
for src, name, axes, glyphs in FACES:
    font = TTFont(os.path.join(SRC, src))
    if axes:
        font = instancer.instantiateVariableFont(font, axes, updateFontNames=False)
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(text=glyphs)
    sub.subset(font)
    font.save(os.path.join(OUT, name))
    print(f"{name:32s} {os.path.getsize(os.path.join(OUT, name)) // 1024:6d} KB")
