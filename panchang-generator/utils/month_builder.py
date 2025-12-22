from __future__ import annotations
 
from collections import defaultdict
from datetime import datetime
 
 
def _english_month_key(date_str: str) -> str:
    return (date_str or "")[:7] if date_str and len(date_str) >= 7 else "unknown"


def _sort_key_english_month(s: str) -> datetime:
    if s == "unknown":
        return datetime(1900, 1, 1)
    try:
        return datetime.strptime(s + "-01", "%Y-%m-%d")
    except Exception:
        return datetime(1900, 1, 1)


def _tamil_month_key(entry: dict) -> str:
    tamil = entry.get("tamil") or {}
    month = tamil.get("month") or "unknown"
    return month
 
 
def build_month_views(daily_list: list[dict]) -> dict:
    """Return dict grouped by English (YYYY-MM) and Tamil month."""
    english = defaultdict(list)
    tamil = defaultdict(list)
 
    for entry in daily_list:
        try:
            ek = _english_month_key(entry.get("date"))
            english[ek].append(entry)
 
            tk = _tamil_month_key(entry)
            tamil[tk].append(entry)
        except Exception:
            continue
 
    english_sorted = {k: english[k] for k in sorted(english.keys(), key=_sort_key_english_month)}
    tamil_sorted = {k: tamil[k] for k in tamil.keys()}
 
    return {
        "english_months": english_sorted,
        "tamil_months": tamil_sorted,
    }
