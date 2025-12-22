from __future__ import annotations

from datetime import date as Date

from constants.tamil_months import TAMIL_MONTHS, TAMIL_MONTH_BOUNDARIES, TAMIL_WEEKDAYS_PY


def _candidate_start_dates(year: int):
    starts = []
    for month_name, m, d in TAMIL_MONTH_BOUNDARIES:
        starts.append((month_name, Date(year, m, d)))
    return starts


def _find_month_start(gregorian_date: Date) -> tuple[str, Date]:
    candidates = []
    candidates.extend(_candidate_start_dates(gregorian_date.year - 1))
    candidates.extend(_candidate_start_dates(gregorian_date.year))

    candidates = [(name, dt) for name, dt in candidates if dt <= gregorian_date]
    if not candidates:
        return TAMIL_MONTHS[0], Date(gregorian_date.year, 4, 14)

    candidates.sort(key=lambda x: x[1])
    return candidates[-1]


def get_tamil_date(gregorian_date: Date) -> tuple[int, str, str]:
    """Return tamil_day, tamil_month_name, weekday_ta."""
    try:
        month_name, start_date = _find_month_start(gregorian_date)
        tamil_day = (gregorian_date - start_date).days + 1
        if tamil_day < 1:
            tamil_day = 1

        weekday_ta = TAMIL_WEEKDAYS_PY[gregorian_date.weekday()]
        return int(tamil_day), month_name, weekday_ta
    except Exception:
        return 1, TAMIL_MONTHS[0], TAMIL_WEEKDAYS_PY[gregorian_date.weekday()]
