#!/usr/bin/env python3
# File: panchang-generator/generate_mobile_and_monthly.py
# Purpose: Build lightweight mobile & monthly JSON from existing full panchang JSON.

import json
import argparse
from pathlib import Path
from utils.month_builder import build_month_views

ROOT = Path(__file__).resolve().parent


def build_mobile_entry(d: dict) -> dict:
    tamil = d.get("tamil") or {}
    return {
        "date": d.get("date", ""),
        "tithi": d.get("tithi", 1),
        "paksha": d.get("paksha", "Shukla"),
        "nakshatra": d.get("nakshatra", 1),
        "sunrise": d.get("sunrise", "06:00 AM"),
        "sunset": d.get("sunset", "06:00 PM"),
        "tamil_day": tamil.get("day", 1),
        "tamil_month": tamil.get("month", ""),
        "weekday_ta": tamil.get("weekday", ""),
        "festivals": d.get("festivals", []),
    }


def main(year: int) -> None:
    input_path = ROOT / f"panchang_{year}.json"
    out_mobile = ROOT / f"panchang_mobile_{year}.json"
    out_monthly = ROOT / f"panchang_monthly_{year}.json"

    if not input_path.exists():
        print(f"Missing: {input_path.name}")
        return

    raw = json.loads(input_path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        print("Input is not a list; aborting")
        return

    mobile = [build_mobile_entry(d) for d in raw]
    out_mobile.write_text(json.dumps(mobile, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved: {out_mobile.name} (days: {len(mobile)})")

    monthly = build_month_views(raw)
    out_monthly.write_text(json.dumps(monthly, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved: {out_monthly.name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    args = parser.parse_args()
    main(int(args.year))
