from fastapi import HTTPException

from app.i18n import t


def check_choice(value, allowed: list, label_key: str) -> None:
    if value is None:
        return
    label = t(label_key)
    if not allowed:
        raise HTTPException(400, t("opt.unsupported", label=label.lower()))
    if value not in allowed:
        raise HTTPException(400, t("opt.bad_value", label=label, value=value,
                                   allowed=", ".join(map(str, allowed))))


def check_reference_count(caps: dict, count: int) -> None:
    limit = caps["reference_images"]
    if count > limit:
        raise HTTPException(400, t("ref.none") if not limit else t("ref.max", limit=limit))


def check_image_request(caps: dict, *, aspect_ratio, image_size, refs: int, negative: bool = False,
                        quality=None, background=None, output_format=None) -> None:
    check_choice(aspect_ratio, caps["aspect_ratios"], "opt.aspect_ratio")
    check_choice(image_size, caps["image_sizes"], "opt.image_size")
    check_choice(quality, caps["qualities"], "opt.quality")
    check_choice(background, caps["backgrounds"], "opt.background")
    check_choice(output_format, caps["output_formats"], "opt.output_format")
    if background == "transparent" and output_format == "jpeg":
        raise HTTPException(400, t("image.transparent_format"))
    check_reference_count(caps, refs)
    if negative and not caps.get("negative_prompt_key"):
        raise HTTPException(400, t("image.negative_unsupported"))


def check_video_request(caps: dict, *, duration, resolution, aspect_ratio, first: bool, last: bool,
                        refs: int, motion: bool, audio, seed, negative: bool = False) -> None:
    check_choice(duration, caps["durations"], "opt.duration")
    check_choice(resolution, caps["resolutions"], "opt.resolution")
    check_choice(aspect_ratio, caps["aspect_ratios"], "opt.aspect_ratio")
    if first and "first_frame" not in caps["frame_images"]:
        raise HTTPException(400, t("frame.first_unsupported"))
    if last and "last_frame" not in caps["frame_images"]:
        raise HTTPException(400, t("frame.last_unsupported"))
    check_reference_count(caps, refs)
    if refs and (first or last):
        raise HTTPException(400, t("video.frames_xor"))
    if motion and not caps["motion_control"]:
        raise HTTPException(400, t("video.motion_unsupported"))
    if motion and not first:
        raise HTTPException(400, t("video.motion_needs_image"))
    if audio and not caps["audio"]:
        raise HTTPException(400, t("video.audio_unsupported"))
    if seed is not None and not caps["seed"]:
        raise HTTPException(400, t("video.seed_unsupported"))
    if negative and not caps.get("negative_prompt_key"):
        raise HTTPException(400, t("video.negative_unsupported"))
