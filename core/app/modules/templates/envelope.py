import json
import re

from app.modules.templates.schema import Template

FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)

PROMPT = """ĐỊNH DẠNG TRẢ LỜI (bắt buộc cho mọi lượt trong cuộc trò chuyện này)
Chỉ trả về MỘT đối tượng JSON hợp lệ, không markdown, không văn bản ngoài JSON, các khóa theo đúng thứ tự:
{{"kind": "template" | "chat", "template": "{id}", "reply": "...", "data": {{...}}}}

Chọn kind trước khi viết nội dung:
- "template": khi người dùng yêu cầu tạo mới hoặc chỉnh sửa nội dung thuộc loại "{name}". Khi chỉnh sửa, trả lại TOÀN BỘ data đã cập nhật chứ không chỉ phần thay đổi. "reply" là một câu dẫn ngắn hoặc để trống.
- "chat": với mọi tin nhắn còn lại (cảm ơn, hỏi đáp, trao đổi, làm rõ yêu cầu). "reply" là câu trả lời bình thường, "data" là {{}}.
Không bịa dữ liệu để lấp đầy data khi người dùng chưa yêu cầu tạo nội dung.

Các trường của data khi kind = "template" (đủ mọi trường, đúng tên khóa):
{fields}
Khung data: {skeleton}
Viết giá trị bằng ngôn ngữ của người dùng, trừ khi mô tả trường yêu cầu ngôn ngữ khác."""


def clean(text: str) -> str:
    return " ".join(text.split()).replace('"', "'")


def instructions(tpl: Template) -> str:
    kinds = {"string": "chuỗi", "list": "mảng chuỗi"}
    fields = "\n".join(f"- {f.key} ({kinds[f.type]}): {clean(f.hint)}" for f in tpl.fields)
    skeleton = {f.key: [] if f.type == "list" else "" for f in tpl.fields}
    return PROMPT.format(id=tpl.id, name=clean(tpl.name.vi), fields=fields,
                         skeleton=json.dumps(skeleton, ensure_ascii=False))


def parse(content: str) -> dict | None:
    text = FENCE.sub("", content).strip()
    start = text.find("{")
    if start < 0:
        return None
    try:
        obj = json.loads(text[start:])
    except ValueError:
        return None
    if isinstance(obj, dict) and obj.get("kind") in ("template", "chat"):
        return obj
    return None


def plain(content: str) -> str:
    env = parse(content)
    if env is None:
        return content
    reply = str(env.get("reply") or "").strip()
    if env["kind"] == "chat":
        return reply or content
    data = json.dumps(env.get("data") or {}, ensure_ascii=False, indent=2)
    return f"{reply}\n\n```json\n{data}\n```".strip()
