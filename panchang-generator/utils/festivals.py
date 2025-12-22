from __future__ import annotations

from datetime import date as Date

from constants.festivals_rules import FESTIVAL_RULES


FESTIVAL_DATE_OVERRIDES: dict[int, dict[str, Date]] = {
    2026: {
        "தைப்பூசம்": Date(2026, 2, 1),
        "பங்குனி உத்திரம்": Date(2026, 3, 31),
        "வைகாசி விசாகம்": Date(2026, 5, 31),
    },
}


def get_festivals(
    day: Date,
    tithi: int,
    nakshatra: int,
    paksha: str,
    tamil_month: str | None = None,
) -> list[str]:
    ctx = {
        "date": day,
        "tithi": int(tithi),
        "nakshatra": int(nakshatra),
        "paksha": paksha,
        "weekday": day.weekday(),
        "tamil_month": tamil_month,
    }

    found: list[str] = []
    for rule in FESTIVAL_RULES:
        try:
            if rule.get("match") and bool(rule["match"](ctx)):
                name = rule.get("name")
                if name and name not in found:
                    found.append(name)
        except Exception:
            continue

    overrides = FESTIVAL_DATE_OVERRIDES.get(day.year)
    if overrides:
        for name, exact_day in overrides.items():
            if day == exact_day:
                if name not in found:
                    found.append(name)
            else:
                if name in found:
                    found.remove(name)

    return found
