import math
from dataclasses import dataclass, field

AUDIO_RATE = 48000
MAX_SIDE = 1920
DEFAULT_SIZE = (1280, 720)
FPS = 30
EPS = 1e-3
BLEND_MODES = ("normal", "multiply", "screen", "overlay", "darken", "lighten")
PROPS = ("x", "y", "scale", "rotation", "opacity")
DEFAULTS = {"x": 0.0, "y": 0.0, "scale": 100.0, "rotation": 0.0, "opacity": 100.0}


@dataclass(frozen=True)
class Source:
    path: str
    has_audio: bool


@dataclass(frozen=True)
class Cut:
    source: Source
    start: float
    trim_in: float
    duration: float
    layer: int = 0
    blend: str = "normal"
    look: dict = field(default_factory=lambda: dict(DEFAULTS))
    keys: tuple = ()


def even(value: float) -> int:
    return max(2, int(value) // 2 * 2)


def fit_size(width: int | None, height: int | None) -> tuple[int, int]:
    if not width or not height:
        return DEFAULT_SIZE
    scale = min(1.0, MAX_SIDE / max(width, height))
    return even(width * scale), even(height * scale)


def num(value: float) -> str:
    text = f"{value:.5f}".rstrip("0").rstrip(".")
    return text if text not in ("", "-0") else "0"


def curve(points: list[tuple[float, float]], var: str) -> str:
    if len(points) == 1 or all(abs(v - points[0][1]) < 1e-9 for _, v in points):
        return num(points[0][1])
    expr = num(points[-1][1])
    for (t0, v0), (t1, v1) in reversed(list(zip(points, points[1:]))):
        span = max(t1 - t0, 1e-3)
        seg = f"{num(v0)}+({num(v1 - v0)})*({var}-{num(t0)})/{num(span)}"
        expr = f"if(lt({var},{num(t1)}),{seg},{expr})"
    return f"if(lt({var},{num(points[0][0])}),{num(points[0][1])},{expr})"


def channels(cut: Cut, var: str) -> dict[str, str]:
    if not cut.keys:
        return {p: num(cut.look[p]) for p in PROPS}
    keys = sorted(cut.keys, key=lambda k: k["t"])
    return {p: curve([(k["t"] - cut.trim_in, k[p]) for k in keys], var) for p in PROPS}


def is_static(expr: str) -> bool:
    return "(" not in expr


def is_identity(ch: dict[str, str]) -> bool:
    return all(is_static(ch[p]) and abs(float(ch[p]) - DEFAULTS[p]) < 1e-9 for p in ("x", "y", "scale", "rotation"))


def corners(ch: dict[str, str], w: int, h: int) -> dict[str, str]:
    cx = f"({w / 2}+({ch['x']})*{w}/100)"
    cy = f"({h / 2}+({ch['y']})*{h}/100)"
    s = f"(({ch['scale']})/100)"
    th = f"(({ch['rotation']})*PI/180)"
    out = {}
    for n, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        dx, dy = sx * w / 2, sy * h / 2
        out[f"x{n}"] = f"{cx}+{s}*({num(dx)}*cos({th})-({num(dy)})*sin({th}))"
        out[f"y{n}"] = f"{cy}+{s}*({num(dx)}*sin({th})+({num(dy)})*cos({th}))"
    return out


def _silence(seconds: float, label: str) -> str:
    return (f"anullsrc=r={AUDIO_RATE}:cl=stereo,atrim=duration={seconds:.3f},asetpts=PTS-STARTPTS,"
            f"aformat=sample_fmts=fltp:channel_layouts=stereo[{label}]")


def _blank(seconds: float, label: str, w: int, h: int, fps: int) -> str:
    return f"color=c=black@0:s={w}x{h}:r={fps}:d={seconds:.3f},format=rgba,setsar=1[{label}]"


def _picture(cut: Cut, i: int, label: str, w: int, h: int, fps: int) -> list[str]:
    ch = channels(cut, "in/%d" % fps)
    chain = [f"[{i}:v:0]trim=start={cut.trim_in:.3f}:duration={cut.duration:.3f}", "setpts=PTS-STARTPTS", f"fps={fps}",
             f"scale={w}:{h}:force_original_aspect_ratio=decrease", "setsar=1", "format=rgba",
             f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black@0"]
    if not is_identity(ch):
        pts = corners(ch, w, h)
        animated = not all(is_static(v) for v in pts.values())
        args = ":".join(f"{k}='{v}'" for k, v in pts.items())
        chain.append(f"perspective={args}:sense=destination:interpolation=linear:eval={'frame' if animated else 'init'}")
    chain.append("format=rgba")
    op = channels(cut, "t")["opacity"]
    if is_static(op):
        level = max(0.0, min(1.0, float(op) / 100))
        if level < 1 - 1e-9:
            chain.append(f"colorchannelmixer=aa={num(level)}")
        return [",".join(chain) + f"[{label}]"]
    ret = ",".join(chain) + f"[{label}p]"
    shade = f"eq=contrast='({op})/100':brightness='0.5*(({op})/100-1)':eval=frame"
    return [ret, f"[{label}p]split[{label}c][{label}m]", f"[{label}m]alphaextract,{shade}[{label}a]",
            f"[{label}c]format=rgb24[{label}d]", f"[{label}d][{label}a]alphamerge,format=rgba[{label}]"]


def _sound(cut: Cut, i: int, label: str) -> str:
    if not cut.source.has_audio:
        return _silence(cut.duration, label)
    return (f"[{i}:a:0]atrim=start={cut.trim_in:.3f}:duration={cut.duration:.3f},asetpts=PTS-STARTPTS,"
            f"aresample={AUDIO_RATE},aformat=sample_fmts=fltp:channel_layouts=stereo[{label}]")


def _concat_video(items: list[tuple[Cut, int] | float], prefix: str, w: int, h: int, fps: int, parts: list[str]) -> str:
    labels = []
    for n, item in enumerate(items):
        label = f"{prefix}{n}"
        if isinstance(item, float):
            parts.append(_blank(item, label, w, h, fps))
        else:
            parts += _picture(item[0], item[1], label, w, h, fps)
        labels.append(f"[{label}]")
    out = f"{prefix}s"
    if len(labels) == 1:
        parts.append(f"{labels[0]}null[{out}]")
    else:
        parts.append(f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0[{out}]")
    return out


def _timeline(group: list[tuple[Cut, int]], total: float) -> list[tuple[Cut, int] | float]:
    items: list[tuple[Cut, int] | float] = []
    cursor = 0.0
    for cut, i in sorted(group, key=lambda g: g[0].start):
        if cut.start - cursor > EPS:
            items.append(cut.start - cursor)
        items.append((cut, i))
        cursor = cut.start + cut.duration
    if total - cursor > EPS:
        items.append(total - cursor)
    return items


def filter_graph(cuts: list[Cut], w: int, h: int, fps: int = FPS) -> str:
    total = max(c.start + c.duration for c in cuts)
    parts: list[str] = [f"color=c=black:s={w}x{h}:r={fps}:d={total:.3f},format=yuv420p,setsar=1[base0]"]
    indexed = list(enumerate(cuts))
    layers = sorted({c.layer for c in cuts})
    base = "base0"
    step = 0
    for layer in layers:
        for mode in BLEND_MODES:
            group = [(c, i) for i, c in indexed if c.layer == layer and c.blend == mode]
            if not group:
                continue
            step += 1
            stream = _concat_video(_timeline(group, total), f"L{step}_", w, h, fps, parts)
            out = f"base{step}"
            if mode == "normal":
                parts.append(f"[{base}][{stream}]overlay=format=auto:eof_action=pass,format=yuv420p[{out}]")
            else:
                s = f"M{step}"
                parts += [
                    f"[{stream}]split[{s}c][{s}m]",
                    f"[{s}m]alphaextract[{s}a]",
                    f"[{s}c]format=yuv420p[{s}d]",
                    f"[{base}]split[{s}b][{s}o]",
                    f"[{s}b][{s}d]blend=all_mode={mode}[{s}x]",
                    f"[{s}x][{s}a]alphamerge[{s}y]",
                    f"[{s}o][{s}y]overlay=format=auto:eof_action=pass,format=yuv420p[{out}]",
                ]
            base = out
    parts.append(f"[{base}]null[v]")

    tracks = []
    for layer in layers:
        group = [(c, i) for i, c in indexed if c.layer == layer]
        labels = []
        cursor = 0.0
        for cut, i in sorted(group, key=lambda g: g[0].start):
            gap = cut.start - cursor
            if gap > EPS:
                parts.append(_silence(gap, f"g{i}"))
                labels.append(f"[g{i}]")
            parts.append(_sound(cut, i, f"s{i}"))
            labels.append(f"[s{i}]")
            cursor = cut.start + cut.duration
        if total - cursor > EPS:
            parts.append(_silence(total - cursor, f"e{layer}"))
            labels.append(f"[e{layer}]")
        name = f"T{layer}"
        parts.append(f"{''.join(labels)}concat=n={len(labels)}:v=0:a=1[{name}]" if len(labels) > 1 else f"{labels[0]}anull[{name}]")
        tracks.append(f"[{name}]")
    if len(tracks) == 1:
        parts.append(f"{tracks[0]}anull[a]")
    else:
        parts.append(f"{''.join(tracks)}amix=inputs={len(tracks)}:duration=longest:normalize=0,alimiter=limit=0.97[a]")
    return ";".join(parts)


def command(cuts: list[Cut], out: str, w: int, h: int, fps: int = FPS) -> list[str]:
    args = ["ffmpeg", "-y", "-nostdin", "-loglevel", "error"]
    for cut in cuts:
        args += ["-i", cut.source.path]
    args += ["-filter_complex", filter_graph(cuts, w, h, fps), "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]
    return args
