from app.adapters.drivers.anthropic import AnthropicDriver
from app.adapters.drivers.base import IMAGE_FEATURES, RENDER_FEATURES, Conn, Driver
from app.adapters.drivers.mock import MockDriver
from app.adapters.drivers.openai_compat import OpenAICompatDriver
from app.adapters.drivers.openrouter import OpenRouterDriver

DRIVERS: dict[str, type[Driver]] = {
    "openai_compat": OpenAICompatDriver,
    "openrouter": OpenRouterDriver,
    "anthropic": AnthropicDriver,
}



__all__ = ["DRIVERS", "IMAGE_FEATURES", "RENDER_FEATURES", "Conn", "Driver", "MockDriver"]
