from lib.helpers import compute


def process_data():
    result = compute()
    formatted = format_date("2024-01-01")
    return f"{result} - {formatted}"
