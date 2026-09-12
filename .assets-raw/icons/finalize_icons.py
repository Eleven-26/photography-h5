# -*- coding: utf-8 -*-
"""将去重后的图标按语义命名拷贝到 src/static/icons/，并注入 viewBox"""
import os, re, shutil

RAW = r"D:\workbuddy\www\photography-h5\.assets-raw\icons"
DEST = r"D:\workbuddy\www\photography-h5\src\static\icons"
os.makedirs(DEST, exist_ok=True)

# 代表文件 -> 语义名（尺寸为设计稿 1x）
MAP = {
    "1_1044-20260907_211230408.svg": "back",            # 44 返回箭头（白，含点击域）
    "1_1340-20260907_211230470.svg": "like-overlay",    # 24 作品图角标（圆底+心形）
    "1_143-20260907_211217558.svg": "flow-1",           # 22 C01 流程步骤 1
    "1_150-20260907_211217560.svg": "flow-2",
    "1_157-20260907_211217562.svg": "flow-3",
    "1_164-20260907_211217563.svg": "flow-4",
    "1_170-20260907_211217564.svg": "flow-5",
    "1_177-20260907_211217565.svg": "flow-6",
    "1_184-20260907_211217567.svg": "flow-7",
    "1_147-20260907_211217559.svg": "chevron-all",      # 14 查看全部箭头
    "1_78-20260907_211217549.svg": "star-gold",         # 14 评分星
    "1_62-20260907_211217547.svg": "hero-nav",          # 375x44 hero 顶栏（备用）
    "1_287-20260907_211217568.svg": "clock-xs",         # 14 C02 特性
    "1_294-20260907_211217569.svg": "pin-xs",
    "1_301-20260907_211217571.svg": "image-xs",
    "1_308-20260907_211217574.svg": "photo-xs",
    "1_315-20260907_211217579.svg": "refresh-xs",
    # 修正(2026-09-11)：以下三枚 16x17 小圆图标原先整组错位一位（抓错节点，形状+颜色双错）
    "1_363-20260907_211217581.svg": "check-circle-green-xs",  # 16 圆勾(绿) #9FCB87 —— 原误命名 alert-gold-xs
    "1_368-20260907_211217581.svg": "alert-gold-xs",          # 16 圆叹号(金) #D9A735 —— 原误命名 x-red-xs
    "1_373-20260907_211217583.svg": "x-red-xs",               # 16 圆叉(红) #E37B76 —— 原漏映射
    "1_2082-20260907_211217589.svg": "cal-prev",        # 20 C03 月份切换
    "1_2086-20260907_211217591.svg": "cal-next",
    "1_2191-20260907_211217593.svg": "asterisk",        # 13 C03 提示
    "1_1033-20260907_211217637.svg": "info-sm",         # 13 弱化信息(白40%)
    "1_1908-20260907_211230442.svg": "lock",            # 13 档期锁定
    "1_2766-20260907_211217595.svg": "check-sm",        # 12 表单勾
    "1_1130-20260907_211230431.svg": "chevron-left-xs", # 13
    "1_1137-20260907_211230432.svg": "chevron-right-xs",
    "1_1297-20260907_211230436.svg": "chevron-right-sm",# 15 列表行箭头
    "1_1274-20260907_211230434.svg": "alert-gold",      # 18 重要提示
    "1_1280-20260907_211230434.svg": "shield-green",    # 13
    "1_1289-20260907_211230435.svg": "forbid",          # 20 不可修改
    "1_511-20260907_211217599.svg": "wechat",           # 40 支付渠道
    "1_523-20260907_211217600.svg": "alipay",
    "1_533-20260907_211217601.svg": "bank",
    "1_519-20260907_211217599.svg": "pay-selected",     # 20 支付方式选中
    "1_1748-20260907_211217603.svg": "clock-processing",# 72 处理中大图
    "1_1758-20260907_211217603.svg": "alert-red",       # 18
    "1_1654-20260907_211230416.svg": "check-circle-gold",# 20 已完成/已支付
    "1_1802-20260907_211217606.svg": "coin",            # 20 退款原路
    "1_1989-20260907_211230448.svg": "download",        # 24 批量下载
    "1_2046-20260907_211230453.svg": "star",            # 20 评价
    "1_2057-20260907_211230454.svg": "cloud-down",      # 16
    "1_1941-20260907_211230455.svg": "calendar-gold-lg",# 44 C18 改期
    "1_1952-20260907_211230457.svg": "x-red-lg",        # 44 不可改期
    "1_1963-20260907_211230459.svg": "shield",          # 13 政策
    "1_2369-20260907_211230460.svg": "alert-red-lg",    # 64 C20 取消
    "1_2444-20260907_211230463.svg": "coin-lg",         # 72 C21 退款中
    "1_2499-20260907_211230465.svg": "clock-sm",        # 13
    "1_2519-20260907_211230467.svg": "check-lg-green",  # 72 退款到账
    "1_1458-20260907_211230475.svg": "image-plus",      # 28 C27 参考图占位
    "1_1725-20260907_211230414.svg": "camera-sm",       # 13 C12
    "1_1001-20260907_211217633.svg": "radio-off",       # 20 C10 选项
    "1_1011-20260907_211217635.svg": "radio-checked",
    "1_705-20260907_211217612.svg": "clipboard",        # 20 C09 拍摄信息
    "1_652-20260907_211217608.svg": "node-current",     # 28x34 时间线当前
    "1_658-20260907_211217608.svg": "node-dot",         # 13x15 时间线节点
    "1_861-20260907_211217628.svg": "clock-gold",       # 18 选片倒计时
    "1_1125-20260907_211230430.svg": "divider-gold",    # 238x4 C14 分割线
    "1_1070-20260907_211230409.svg": "gift",            # 20 C11 准备项
    "1_1078-20260907_211230410.svg": "clock",           # 20
    "1_1086-20260907_211230411.svg": "pin",             # 20
    "1_1094-20260907_211230412.svg": "bulb",            # 20
}

def inject_viewbox(text, w, h):
    if "viewBox" in text:
        return text
    return text.replace("<svg ", f'<svg viewBox="0 0 {w:g} {h:g}" preserveAspectRatio="xMidYMid meet" ', 1)

ok, miss = [], []
for fname, name in MAP.items():
    src = os.path.join(RAW, fname)
    if not os.path.exists(src):
        miss.append(fname); continue
    text = open(src, encoding="utf-8", errors="ignore").read()
    wm = re.search(r'width="([\d.]+)"', text); hm = re.search(r'height="([\d.]+)"', text)
    text = inject_viewbox(text, float(wm.group(1)), float(hm.group(1)))
    open(os.path.join(DEST, f"{name}.svg"), "w", encoding="utf-8").write(text)
    ok.append(name)

print(f"written={len(ok)} missing={miss}")
print(sorted(os.listdir(DEST)))
