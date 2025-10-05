import json
import time
import sys
from datetime import datetime, timezone
from collections import defaultdict

from nba_api.stats.static import players as static_players
from nba_api.stats.endpoints import commonplayerinfo
from requests.exceptions import RequestException

PLAYER_INFO_PAUSE_SECS = 0.35
RETRIES = 3

def _retry(func, *args, **kwargs):
    last_err = None
    for _ in range(RETRIES):
        try:
            return func(*args, **kwargs)
        except RequestException as e:
            last_err = e
            time.sleep(0.75)
    if last_err:
        raise last_err

def fetch_active_players():
    # Season-agnostic list of currently active NBA players (per NBA.com)
    # Each entry includes id, full_name, first_name, last_name, etc.
    plist = static_players.get_active_players()
    return plist

def fetch_player_country_and_team(player_id: int):
    # Get birth country & team via CommonPlayerInfo
    resp = _retry(commonplayerinfo.CommonPlayerInfo, player_id=player_id)
    data = resp.get_normalized_dict()
    info = (data.get("CommonPlayerInfo", []) or [{}])[0]

    country = (info.get("COUNTRY") or "").strip()
    team_name = (info.get("TEAM_NAME") or "").strip()
    team_city = (info.get("TEAM_CITY") or "").strip()
    team = (team_city + " " + team_name).strip()

    return country, team

def main():
    print("Fetching active players...", file=sys.stderr)
    players = fetch_active_players()
    print(f"Active players fetched: {len(players)}", file=sys.stderr)

    by_country = defaultdict(list)
    skipped_us = 0

    for idx, p in enumerate(players, 1):
        player_id = int(p["id"])
        display_name = p["full_name"]

        time.sleep(PLAYER_INFO_PAUSE_SECS)

        country, team = fetch_player_country_and_team(player_id)

        # Normalize U.S. variants; skip if U.S.
        c = country.lower().strip()
        if c in {"usa", "united states", "u.s.a.", "u.s.", "us"}:
            skipped_us += 1
            continue

        entry = {"player": display_name, "team": team or "Free Agent"}
        by_country[country or "Unknown"].append(entry)

        if idx % 50 == 0:
            print(f"Processed {idx} players...", file=sys.stderr)

    # Sort countries and players
    countries_sorted = {k: sorted(v, key=lambda x: x["player"]) 
                        for k, v in sorted(by_country.items(), key=lambda kv: kv[0].lower())}

    out = {
        "last_generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "definition": "Non-US NBA players (born outside the United States) grouped by birth country with current NBA team.",
        "source": "NBA official stats service via nba_api (static.get_active_players + CommonPlayerInfo)",
        "total_countries": len(countries_sorted),
        "total_players": sum(len(v) for v in countries_sorted.values()),
        "note": f"Excluded {skipped_us} US-born players using country field from CommonPlayerInfo.",
        "countries": countries_sorted
    }

    out_path = "non_us_nba_players_by_country_current.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Wrote {out_path} with {out['total_players']} players across {out['total_countries']} countries.")

if __name__ == "__main__":
    main()
