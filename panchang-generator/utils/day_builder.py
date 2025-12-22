from __future__ import annotations
 
from datetime import date as Date
 
from utils.astronomy import get_sun_times, get_tithi_and_nakshatra
from utils.festivals import get_festivals
from utils.tamil_calendar import get_tamil_date
 
 
def _clamp_int(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, int(v)))
 
 
def build_day(day: Date) -> dict:
    """Build a single Panchang entry. Never raises."""
    try:
        sunrise, sunset = get_sun_times(day)
    except Exception:
        sunrise, sunset = "06:00 AM", "06:00 PM"
 
    try:
        tithi, paksha, nakshatra = get_tithi_and_nakshatra(day)
    except Exception:
        tithi, paksha, nakshatra = 1, "Shukla", 1
 
    tithi = _clamp_int(tithi, 1, 30)
    nakshatra = _clamp_int(nakshatra, 1, 27)
 
    try:
        tamil_day, tamil_month_name, weekday_ta = get_tamil_date(day)
    except Exception:
        tamil_day, tamil_month_name, weekday_ta = 1, "சித்திரை", ""
 
    try:
        festivals = get_festivals(
            day=day,
            tithi=tithi,
            nakshatra=nakshatra,
            paksha=paksha,
            tamil_month=tamil_month_name,
        )
    except Exception:
        festivals = []
 
    return {
        "date": day.strftime("%Y-%m-%d"),
        "tithi": int(tithi),
        "paksha": paksha,
        "nakshatra": int(nakshatra),
        "sunrise": sunrise or "06:00 AM",
        "sunset": sunset or "06:00 PM",
        "tamil": {
            "day": int(tamil_day) if isinstance(tamil_day, int) else 1,
            "month": tamil_month_name or "சித்திரை",
            "weekday": weekday_ta or "",
        },
        "festivals": festivals if isinstance(festivals, list) else [],
    }
