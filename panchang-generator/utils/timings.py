RAHU_TABLE = {
    0: "07:30–09:00",
    1: "15:00–16:30",
    2: "12:00–13:30",
    3: "13:30–15:00",
    4: "10:30–12:00",
    5: "09:00–10:30",
    6: "16:30–18:00",
}

YAMA_TABLE = {
    0: "06:00–07:30",
    1: "10:30–12:00",
    2: "09:00–10:30",
    3: "06:00–07:30",
    4: "15:00–16:30",
    5: "12:00–13:30",
    6: "13:30–15:00",
}

KULIGAI_TABLE = {
    0: "15:00–16:30",
    1: "12:00–13:30",
    2: "07:30–09:00",
    3: "10:30–12:00",
    4: "09:00–10:30",
    5: "06:00–07:30",
    6: "07:30–09:00",
}

def get_daily_special_timings(date):
    weekday = date.weekday()
    return {
        "rahu_kalam": RAHU_TABLE[weekday],
        "yama_gandam": YAMA_TABLE[weekday],
        "kuligai": KULIGAI_TABLE[weekday],
        "nalla_neram": {
            "morning": "07:15–08:15",
            "evening": "16:45–17:45"
        }
    }
