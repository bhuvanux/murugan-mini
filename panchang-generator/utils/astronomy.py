from __future__ import annotations
 
from datetime import date as Date
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
 
import pytz
from skyfield import almanac
from skyfield.api import Loader, wgs84
 
# ==============================
# CONFIG
# ==============================
LAT = 13.0827
LON = 80.2707
TIMEZONE = "Asia/Kolkata"
 
_TZ = pytz.timezone(TIMEZONE)
_ROOT = Path(__file__).resolve().parent.parent
_load = Loader(str(_ROOT))
_eph = _load("de421.bsp")
_ts = _load.timescale()
_earth = _eph["earth"]
_sun = _eph["sun"]
_moon = _eph["moon"]
_observer = wgs84.latlon(LAT, LON)
 
 
def _clamp_int(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, int(v)))
 
 
def _fmt_time(dt_local: datetime) -> str:
    return dt_local.strftime("%I:%M %p")
 
 
def _safe_default_sun_times() -> tuple[str, str]:
    return "06:00 AM", "06:00 PM"


def _get_sun_times_dt(date_obj: Date) -> tuple[datetime | None, datetime | None]:
    try:
        local_start = _TZ.localize(datetime.combine(date_obj, time(0, 0)))
        local_end = local_start + timedelta(days=1)

        t0 = _ts.from_datetime(local_start.astimezone(timezone.utc))
        t1 = _ts.from_datetime(local_end.astimezone(timezone.utc))

        f = almanac.sunrise_sunset(_eph, _observer)
        times, states = almanac.find_discrete(t0, t1, f)

        sunrise_dt = None
        sunset_dt = None

        for t, state in zip(times, states):
            dt_local = t.utc_datetime().replace(tzinfo=timezone.utc).astimezone(_TZ)
            if bool(state):
                sunrise_dt = dt_local
            else:
                sunset_dt = dt_local

        return sunrise_dt, sunset_dt
    except Exception:
        return None, None
 
 
# ==============================
# Sunrise / Sunset (Skyfield)
# ==============================
def get_sun_times(date_obj: Date) -> tuple[str, str]:
    """Returns sunrise & sunset ALWAYS as 2 strings."""
    try:
        sunrise_dt, sunset_dt = _get_sun_times_dt(date_obj)
        if sunrise_dt is None or sunset_dt is None:
            return _safe_default_sun_times()

        return _fmt_time(sunrise_dt), _fmt_time(sunset_dt)
    except Exception:
        return _safe_default_sun_times()
 
 
# ==============================
# Tithi + Nakshatra
# ==============================
def get_tithi_and_nakshatra(date_obj: Date) -> tuple[int, str, int]:
    """
    Returns:
    - tithi (1–30)
    - paksha
    - nakshatra index (1–27)
    """
    try:
        sunrise_dt, _sunset_dt = _get_sun_times_dt(date_obj)
        if sunrise_dt is not None:
            dt_local = sunrise_dt
        else:
            dt_local = _TZ.localize(datetime.combine(date_obj, time(6, 0)))
        t = _ts.from_datetime(dt_local.astimezone(timezone.utc))
 
        sun_vec = _earth.at(t).observe(_sun)
        moon_vec = _earth.at(t).observe(_moon)
 
        _sun_lat, sun_lon, _sun_dist = sun_vec.ecliptic_latlon()
        _moon_lat, moon_lon, _moon_dist = moon_vec.ecliptic_latlon()
 
        sun_pos = float(sun_lon.degrees) % 360.0
        moon_pos = float(moon_lon.degrees) % 360.0
 
        diff = (moon_pos - sun_pos) % 360.0
        tithi_number = int(diff // 12.0) + 1
        tithi_number = _clamp_int(tithi_number, 1, 30)
 
        paksha = "Shukla" if tithi_number <= 15 else "Krishna"
 
        nakshatra_number = int(moon_pos // (360.0 / 27.0)) + 1
        nakshatra_number = _clamp_int(nakshatra_number, 1, 27)
 
        return tithi_number, paksha, nakshatra_number
    except Exception:
        return 1, "Shukla", 1
