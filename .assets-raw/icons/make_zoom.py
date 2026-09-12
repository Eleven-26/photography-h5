# -*- coding: utf-8 -*-
"""放大复核表：63 个唯一图标按 6x 渲染，输出 2 张分页 HTML"""
import os, re, json, html

RAW_DIR = r"D:\workbuddy\www\photography-h5\.assets-raw\icons"
m = json.load(open(os.path.join(RAW_DIR, "manifest.json"), encoding="utf-8"))

cards = []
for gi, g in enumerate(m["groups"]):
    svg = open(os.path.join(RAW_DIR, g["representative"]), encoding="utf-8", errors="ignore").read()
    svg_inline = re.sub(r"<\?xml[^>]*\?>", "", svg).strip()
    nodes = ", ".join(g["nodes"][:5])
    cards.append(f'''<div class="card">
      <div class="demo dark">{svg_inline}</div>
      <div class="meta"><b>#{gi}</b> {g["w"]:.0f}×{g["h"]:.0f} {g["boards"][0]}<br><code>{nodes}</code></div>
    </div>''')

half = (len(cards) + 1) // 2
for pi, part in enumerate([cards[:half], cards[half:]]):
    doc = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{{background:#17181C;font:13px/1.5 monospace;color:#eee;margin:16px}}
.grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}}
.card{{background:#25262A;border-radius:10px;padding:10px}}
.demo{{width:180px;height:180px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#17181C;margin:0 auto}}
.demo svg{{width:150px;height:150px}}
.meta{{margin-top:8px;color:#aaa;text-align:center;font-size:12px}} code{{color:#7fd;font-size:11px}}
</style></head><body><div class="grid">{"".join(part)}</div></body></html>'''
    open(os.path.join(RAW_DIR, f"_zoom{pi}.html"), "w", encoding="utf-8").write(doc)
print("done", half)
