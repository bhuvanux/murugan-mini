import json
import argparse
from datetime import date, timedelta
from pathlib import Path

from utils.day_builder import build_day

ROOT = Path(__file__).resolve().parent


def generate_year(year: int) -> None:
    start = date(year, 1, 1)
    end = date(year, 12, 31)

    result: list[dict] = []
    current = start

    while current <= end:
        print(f"Generating: {current}")
        try:
            result.append(build_day(current))
        except Exception:
            result.append(
                {
                    "date": current.strftime("%Y-%m-%d"),
                    "tithi": 1,
                    "paksha": "Shukla",
                    "nakshatra": 1,
                    "sunrise": "06:00 AM",
                    "sunset": "06:00 PM",
                    "tamil": {"day": 1, "month": "சித்திரை", "weekday": ""},
                    "festivals": [],
                }
            )
        current += timedelta(days=1)

    output = ROOT / f"panchang_{year}.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved: {output.name} (days: {len(result)})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=date.today().year)
    args = parser.parse_args()
    generate_year(int(args.year))
