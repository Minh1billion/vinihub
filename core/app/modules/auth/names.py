import random

POOLS = {
    "vi": {
        "animals": ["Mèo", "Cú", "Cáo", "Sóc", "Gấu Trúc", "Vịt", "Ếch", "Hải Cẩu", "Thỏ", "Cá Heo", "Chim Cánh Cụt",
                    "Rồng", "Kỳ Lân", "Bạch Tuộc", "Hươu Cao Cổ", "Lười"],
        "traits": ["Lém Lỉnh", "Lười Biếng", "Màu Cam", "Pixel", "Sáng Tạo", "Mơ Mộng", "Tăng Động", "Bí Ẩn", "Ham Ăn",
                   "Hay Quên", "Dễ Thương", "Cà Phê", "Nhiệt Huyết", "Vui Tính", "Mê Filter", "Thức Khuya"],
    },
    "en": {
        "animals": ["Otter", "Fox", "Owl", "Squirrel", "Panda", "Duck", "Frog", "Seal", "Bunny", "Dolphin", "Penguin",
                    "Dragon", "Unicorn", "Octopus", "Giraffe", "Sloth"],
        "traits": ["Sleepy", "Pixel", "Orange", "Curious", "Dreamy", "Zippy", "Mystic", "Hungry", "Forgetful", "Cozy",
                   "Caffeinated", "Sparkly", "Cheerful", "Nocturnal", "Filtered", "Witty"],
    },
}


def random_name(lang: str) -> str:
    pool = POOLS.get(lang) or POOLS["en"]
    animal = random.choice(pool["animals"])
    trait = random.choice(pool["traits"])
    return f"{animal} {trait}" if lang == "vi" else f"{trait} {animal}"
