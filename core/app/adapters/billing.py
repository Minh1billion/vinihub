class PlaceholderBilling:
    async def create_checkout(self, user_id: str, plan_id: str) -> dict:
        return {"checkout_url": None, "activated": True, "provider": "placeholder"}

    async def cancel(self, user_id: str) -> None:
        return None
