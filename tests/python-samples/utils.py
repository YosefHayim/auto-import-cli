MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30


def calculate_total(items, tax_rate):
    subtotal = sum(item.price for item in items)
    return subtotal * (1 + tax_rate)


def format_currency(amount):
    return f"${amount:.2f}"


class PriceCalculator:
    def __init__(self, tax_rate):
        self.tax_rate = tax_rate

    def calculate(self, items):
        return calculate_total(items, self.tax_rate)


def _private_helper():
    pass
