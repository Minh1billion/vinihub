from app.i18n import DEFAULT, current

PLAN_TEXT: dict[str, dict[str, dict]] = {
    "vi": {
        "free": {"name": "Miễn phí", "features": ["100 credit mỗi tháng", "1 workspace", "Chat và tạo ảnh"]},
        "pro": {"name": "Pro", "features": ["2.000 credit mỗi tháng", "Không giới hạn workspace", "Tạo video và motion control"]},
        "studio": {"name": "Studio", "features": ["8.000 credit mỗi tháng", "Ưu tiên hàng đợi video", "Hỗ trợ trực tiếp"]},
    },
    "en": {
        "free": {"name": "Free", "features": ["100 credits per month", "1 workspace", "Chat and image generation"]},
        "pro": {"name": "Pro", "features": ["2,000 credits per month", "Unlimited workspaces", "Video generation and motion control"]},
        "studio": {"name": "Studio", "features": ["8,000 credits per month", "Priority video queue", "Direct support"]},
    },
}


def plan_seed(plan_id: str) -> dict:
    seed = PLAN_TEXT[DEFAULT][plan_id]
    return {"name": seed["name"], "features": list(seed["features"])}


def localize_plan(plan_id: str, name: str, features: list[str]) -> tuple[str, list[str]]:
    lang, seed = current(), PLAN_TEXT[DEFAULT].get(plan_id)
    if lang == DEFAULT or seed is None:
        return name, features
    tr = PLAN_TEXT[lang][plan_id]
    return (
        tr["name"] if name == seed["name"] else name,
        list(tr["features"]) if list(features) == seed["features"] else features,
    )
