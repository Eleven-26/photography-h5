# -*- coding: utf-8 -*-
"""Ardot 导出 SVG 图标：内容去重 + 生成对照表 HTML
用法: python organize_icons.py
"""
import os, re, json, hashlib, html

RAW_DIR = r"D:\workbuddy\www\photography-h5\.assets-raw\icons"
OUT_JSON = os.path.join(RAW_DIR, "manifest.json")
OUT_HTML = os.path.join(RAW_DIR, "contact-sheet.html")

# 节点 -> 来源画板（用于人工识别语境）
BOARD = {
    "C01首页": ["1:62","1:78","1:143","1:147","1:150","1:154","1:157","1:161","1:164","1:170","1:174","1:177","1:181","1:184","1:203"],
    "C02套餐详情": ["1:287","1:294","1:301","1:308","1:315","1:363","1:368","1:373","1:402"],
    "C03选日期": ["1:2074","1:2082","1:2086","1:2170","1:2175","1:2191"],
    "C04需求表单": ["1:2737","1:2766"],
    "C05确认订单": ["1:2567","1:2634","1:2639"],
    "C06报价": ["1:419"],
    "C07定金支付": ["1:491","1:511","1:519","1:523","1:533","1:551"],
    "C08支付结果": ["1:1741","1:1748","1:1758","1:1769","1:1780","1:1791","1:1802"],
    "C09a订单详情进行中": ["1:633","1:652","1:658","1:661","1:667","1:676","1:684","1:692","1:705"],
    "C09b订单详情选片": ["1:772","1:793","1:799","1:802","1:808","1:817","1:825","1:833","1:861"],
    "C09c订单详情完成": ["1:889","1:908","1:920","1:931","1:942"],
    "C10修改订单": ["1:979","1:1001","1:1006","1:1011","1:1016","1:1021","1:1033"],
    "C11拍摄准备": ["1:1044","1:1070","1:1078","1:1086","1:1094"],
    "C12拍摄状态": ["1:1697","1:1725"],
    "C13选片列表": ["1:1623","1:1654","1:1662","1:1670","1:1681"],
    "C14选片反馈": ["1:1108","1:1125","1:1130","1:1137","1:1181"],
    "C15选片确认": ["1:1194","1:1274","1:1280","1:1289","1:1297"],
    "C16尾款": ["1:562","1:579","1:587","1:591","1:601","1:619"],
    "C16A尾款结果": ["1:1832","1:1839","1:1908","9:1459","9:1470","9:1481","9:1495","9:1516"],
    "C17交付": ["1:1976","1:1989","1:1996","1:2004","1:2011","1:2018","1:2026","1:2037","1:2046","1:2053","1:2057"],
    "C18改期": ["1:1918","1:1941","1:1949","1:1952","1:1960","1:1963"],
    "C20取消": ["1:2362","1:2369","1:2401","1:2422"],
    "C21退款进度": ["1:2437","1:2444","1:2457","1:2468","1:2479","1:2499"],
    "C21B退款到账": ["1:2512","1:2519","1:2551"],
    "C24作品": ["1:1306","1:1340","1:1348","1:1356","1:1364","1:1372","1:1380"],
    "C27定制需求": ["1:1390","1:1458","1:1463"],
}
NODE2BOARD = {nid: b for b, ids in BOARD.items() for nid in ids}

def node_id_of(fname):
    m = re.match(r"(\d+_\d+(?:_\d+)*)-", fname)  # 1_62-... / 9_1459-...
    return m.group(1).replace("_", ":") if m else None

def normalize(svg_text):
    """提取 viewBox 和所有 path/circle/rect 的形状数据做指纹"""
    vb = re.search(r'viewBox="([^"]+)"', svg_text)
    vb = vb.group(1) if vb else ""
    shapes = re.findall(r'<(path|circle|rect|ellipse|polygon|line)\b[^>]*?/?>', svg_text)
    # 用 d 属性/属性串做指纹（忽略空白差异）
    datas = []
    for tag in re.finditer(r'<(path|circle|rect|ellipse|polygon|line)\b([^>]*?)/?>', svg_text):
        attrs = tag.group(2)
        d = re.search(r'\b(?:d|cx|cy|r|x|y|width|height|points|x1|x2|y1|y2)="([^"]*)"', attrs)
        datas.append(d.group(1).strip() if d else attrs.strip())
    key = vb + "|" + "|".join(sorted(datas))
    return vb, hashlib.md5(key.encode()).hexdigest(), len(shapes)

records = []
for f in sorted(os.listdir(RAW_DIR)):
    if not f.endswith(".svg"):
        continue
    path = os.path.join(RAW_DIR, f)
    text = open(path, encoding="utf-8", errors="ignore").read()
    nid = node_id_of(f)
    vb, h, nshapes = normalize(text)
    w = h_ = 0
    m = re.search(r'width="([\d.]+)"', text)
    if m: w = float(m.group(1))
    m = re.search(r'height="([\d.]+)"', text)
    if m: h_ = float(m.group(1))
    records.append({
        "file": f, "node": nid, "board": NODE2BOARD.get(nid, "?"),
        "viewBox": vb, "w": w, "h": h_, "shapes": nshapes,
        "hash": h, "bytes": os.path.getsize(path),
    })

# 去重分组
groups = {}
for r in records:
    groups.setdefault(r["hash"], []).append(r)

manifest = {"total_files": len(records), "unique_icons": len(groups), "groups": []}
for h, items in groups.items():
    manifest["groups"].append({
        "hash": h,
        "representative": items[0]["file"],
        "nodes": sorted({i["node"] for i in items}, key=lambda x: (x.split(":")[0], int(x.split(":")[1]))),
        "boards": sorted({i["board"] for i in items}),
        "viewBox": items[0]["viewBox"], "w": items[0]["w"], "h": items[0]["h"],
        "shapes": items[0]["shapes"], "bytes": items[0]["bytes"],
        "files": [i["file"] for i in items],
    })
json.dump(manifest, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# 生成对照表：每个唯一图标按首个节点渲染，暗底明底各一份
cards = []
for gi, g in enumerate(manifest["groups"]):
    svg = open(os.path.join(RAW_DIR, g["representative"]), encoding="utf-8", errors="ignore").read()
    # 去掉 xml 头，尺寸交给容器
    svg_inline = re.sub(r"<\?xml[^>]*\?>", "", svg).strip()
    nodes = ", ".join(g["nodes"][:6]) + ("…" if len(g["nodes"]) > 6 else "")
    cards.append(f'''<div class="card">
      <div class="demo"><div class="dark">{svg_inline}</div><div class="light">{svg_inline}</div></div>
      <div class="meta"><b>#{gi}</b> {g["w"]:.0f}×{g["h"]:.0f} vb[{g["viewBox"]}] {g["shapes"]}形状 {g["bytes"]}B<br>
      <span class="bd">{g["boards"][0]}</span> <code>{nodes}</code></div>
    </div>''')

html_doc = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{{background:#222;font:11px/1.4 monospace;color:#eee;margin:12px}}
.grid{{display:flex;flex-wrap:wrap;gap:10px}}
.card{{width:230px;background:#333;border-radius:8px;padding:8px}}
.demo{{display:flex;gap:6px}}
.dark,.light{{width:100px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:6px}}
.dark{{background:#17181C}}.light{{background:#F2F3F5}}
.dark svg,.light svg{{max-width:56px;max-height:56px}}
.meta{{margin-top:6px;color:#bbb}} code{{color:#7fd}} .bd{{color:#fc6}}
</style></head><body>
<h2>共 {manifest["total_files"]} 文件 → {manifest["unique_icons"]} 个唯一图标</h2>
<div class="grid">{"".join(cards)}</div></body></html>'''
open(OUT_HTML, "w", encoding="utf-8").write(html_doc)
print(f"files={len(records)} unique={len(groups)}")
print("html:", OUT_HTML)
