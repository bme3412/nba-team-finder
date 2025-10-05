import { Answers, FootballClubsMap, TeamsMap, QuizAnswersV2, TeamMatchResult } from './types';
import { teamNationalities } from './nationalities';
// Load narrative configs (best-effort; fallback to defaults if not found)
// Using require to avoid ESM complications in Next runtime for JSON
let NARR_TEMPLATES: any = null;
let WEIGHTS_CFG: any = null;
let TAG_MAP: any = null;
try { NARR_TEMPLATES = require('../../data/reasons.json'); } catch { NARR_TEMPLATES = {}; }
try { WEIGHTS_CFG = require('../../data/weights.json'); } catch { WEIGHTS_CFG = {}; }
try { TAG_MAP = require('../../data/tagMap.json'); } catch { TAG_MAP = {}; }

export function calculateQuizMatch(answers: Answers, teams: TeamsMap) {
  const teamScores: any = {};
  Object.keys(teams).forEach(team => {
    teamScores[team] = { ...teams[team], score: 0 };
  });

  if (answers.location === 'uk' || answers.location === 'west-eu' || answers.location === 'central-eu') {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].conference === 'East') teamScores[team].score += 3;
      if (teamScores[team].timezone === 'EST') teamScores[team].score += 1;
    });
  }

  if (answers.viewing === 'late-games' || answers.late_games) {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].timezone === 'PST' || teamScores[team].timezone === 'MST') {
        teamScores[team].score -= 5;
      }
    });
  }

  if (answers.timeline === 'now') {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].status === 'Champion' || teamScores[team].status === 'Competing') {
        teamScores[team].score += 4;
      }
    });
  } else if (answers.timeline === 'rising') {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].status === 'Rising') teamScores[team].score += 5;
    });
  } else if (answers.timeline === 'underdog') {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].status === 'Rebuilding') teamScores[team].score += 3;
    });
  }

  if (answers.narrative === 'historic') {
    ['Boston Celtics', 'Los Angeles Lakers', 'New York Knicks', 'Chicago Bulls'].forEach(team => {
      if (teamScores[team]) teamScores[team].score += 4;
    });
  } else if (answers.narrative === 'young') {
    ['Oklahoma City Thunder', 'Orlando Magic', 'San Antonio Spurs', 'Houston Rockets'].forEach(team => {
      if (teamScores[team]) teamScores[team].score += 4;
    });
  } else if (answers.narrative === 'superstar') {
    ['Dallas Mavericks', 'Milwaukee Bucks', 'Denver Nuggets', 'Los Angeles Lakers'].forEach(team => {
      if (teamScores[team]) teamScores[team].score += 4;
    });
  } else if (answers.narrative === 'culture') {
    ['Miami Heat', 'San Antonio Spurs', 'Indiana Pacers', 'Golden State Warriors'].forEach(team => {
      if (teamScores[team]) teamScores[team].score += 4;
    });
  } else if (answers.narrative === 'underdog') {
    ['Cleveland Cavaliers', 'Sacramento Kings', 'Memphis Grizzlies', 'Orlando Magic'].forEach(team => {
      if (teamScores[team]) teamScores[team].score += 4;
    });
  }

  const dealbreakers = answers.dealbreakers || [];
  if (dealbreakers.includes('losing')) {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].status === 'Rebuilding') teamScores[team].score -= 10;
    });
  }
  if (dealbreakers.includes('bandwagon')) {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].bandwagon === 'Very High' || teamScores[team].bandwagon === 'High') {
        teamScores[team].score -= 8;
      }
    });
  }
  if (dealbreakers.includes('injuries')) {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].injuries === 'Very High' || teamScores[team].injuries === 'High') {
        teamScores[team].score -= 6;
      }
    });
  }
  if (dealbreakers.includes('dysfunction')) {
    Object.keys(teamScores).forEach(team => {
      if (teamScores[team].dysfunction === 'High') teamScores[team].score -= 8;
      if (teamScores[team].dysfunction === 'Medium') teamScores[team].score -= 3;
    });
  }

  Object.keys(teamScores).forEach(team => {
    teamScores[team].score += (teamScores[team].watchability || 5) * 0.5;
  });

  return Object.entries(teamScores)
    .sort(([, a]: any, [, b]: any) => (b as any).score - (a as any).score)
    .slice(0, 3)
    .map(([name, data]: any, index) => ({
      name,
      ...(data as any),
      matchScore: Math.min(99, 75 + (3 - index) * 8 + Math.floor(Math.random() * 5))
    }));
}

export function calculateFootballMatch(
  selectedClub: string,
  refinement: string | undefined,
  clubs: FootballClubsMap,
  teams: TeamsMap
) {
  const alias: any = {
    'Newcastle United': 'Newcastle',
    'Leicester City': 'Leicester',
    'AS Roma': 'Roma'
  };
  const key = alias[selectedClub] || selectedClub;
  const clubData = clubs[key];
  if (!clubData) return [];

  const shorthandToFull: any = {
    Lakers: 'Los Angeles Lakers',
    Celtics: 'Boston Celtics',
    Thunder: 'Oklahoma City Thunder',
    '76ers': 'Philadelphia 76ers',
    Warriors: 'Golden State Warriors',
    Clippers: 'Los Angeles Clippers',
    Knicks: 'New York Knicks',
    Magic: 'Orlando Magic',
    Nuggets: 'Denver Nuggets',
    Pistons: 'Detroit Pistons',
    Pacers: 'Indiana Pacers',
    Hornets: 'Charlotte Hornets',
    Heat: 'Miami Heat',
    Spurs: 'San Antonio Spurs',
    Wizards: 'Washington Wizards',
    Bucks: 'Milwaukee Bucks',
    Timberwolves: 'Minnesota Timberwolves',
    Cavaliers: 'Cleveland Cavaliers',
    Suns: 'Phoenix Suns',
    Grizzlies: 'Memphis Grizzlies',
    Kings: 'Sacramento Kings',
    Mavericks: 'Dallas Mavericks',
    'Trail Blazers': 'Portland Trail Blazers',
    Pelicans: 'New Orleans Pelicans',
    Raptors: 'Toronto Raptors',
    Hawks: 'Atlanta Hawks',
    Bulls: 'Chicago Bulls',
    Rockets: 'Houston Rockets',
    Jazz: 'Utah Jazz',
    Nets: 'Brooklyn Nets'
  };

  let recommended: string[] = [];
  const primarySet = new Set<string>();
  if (Array.isArray((clubData as any).primary)) {
    recommended = (clubData as any).primary as string[];
    recommended.forEach((n) => primarySet.add(shorthandToFull[n] || n));
  } else if ((clubData as any).primaryTeam) {
    const mapped = shorthandToFull[(clubData as any).primaryTeam];
    if (mapped) {
      recommended = [mapped];
      primarySet.add(mapped);
    }
  }

  if (refinement === 'history') {
    recommended = ['Boston Celtics', 'Los Angeles Lakers', 'New York Knicks'];
  } else if (refinement === 'rise') {
    recommended = ['Oklahoma City Thunder', 'Orlando Magic', 'Cleveland Cavaliers'];
  } else if (refinement === 'style') {
    recommended = ['Golden State Warriors', 'Indiana Pacers', 'San Antonio Spurs'];
  } else if (refinement === 'underdogs') {
    recommended = ['Sacramento Kings', 'Memphis Grizzlies', 'Cleveland Cavaliers'];
  }

  // Fallbacks to ensure we always show at least 3 teams
  const ensureThree = (list: string[]): string[] => {
    if ((list || []).length >= 3) return list.slice(0, 3);
    // Compute simple watchability-based fallbacks
    const entries = Object.entries(teams).map(([name, data]: any) => {
      const w: string = (data.watchability || '').toString().toLowerCase();
      let score = 40;
      if (w.includes('very high')) score = 90;
      else if (w.includes('high')) score = 75;
      else if (w.includes('medium')) score = 55;
      const status = (data.status || '').toString().toLowerCase();
      if (status.includes('defending') || status.includes('contender') || status.includes('competing')) score += 10;
      return { name, score };
    });
    const exclude = new Set(list);
    const fallbacks = entries
      .filter((e) => !exclude.has(e.name))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, 3 - list.length))
      .map((e) => e.name);
    return [...list, ...fallbacks].slice(0, 3);
  };

  const finalList = ensureThree(recommended || []);

  return finalList.map((teamName: string, index: number) => ({
    name: teamName,
    ...teams[teamName],
    matchScore: 95 - index * 3,
    matchReason: primarySet.has(teamName)
      ? `Direct franchise/city link to ${selectedClub}. ${clubData.identity ? `Identity: ${clubData.identity}` : ''}`.trim()
      : `Similar identity to ${selectedClub}: ${clubData.identity}`,
    primaryHit: primarySet.has(teamName)
  }));
}

export function calculatePlayerMatch(selectedPlayers: string[], teams: TeamsMap, players: any[]) {
  if (selectedPlayers.length === 0) return [];

  const teamCounts: any = {};
  const archetypeCounts: any = { flashy: 0, power: 0, finesse: 0 };

  selectedPlayers.forEach(playerName => {
    const player = players.find(p => p.name === playerName);
    if (player) {
      teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
      archetypeCounts[player.archetype]++;
    }
  });

  const sortedTeams = Object.entries(teamCounts).sort(([, a]: any, [, b]: any) => (b as any) - (a as any));

  let recommendedTeams: string[] = [];
  if (sortedTeams.length > 0 && (sortedTeams[0][1] as number) >= 2) {
    recommendedTeams = [sortedTeams[0][0] as string];
  }

  const dominantArchetype = Object.entries(archetypeCounts)
    .sort(([, a]: any, [, b]: any) => (b as any) - (a as any))[0][0];

  if (dominantArchetype === 'flashy') {
    recommendedTeams.push('Atlanta Hawks', 'Indiana Pacers', 'Minnesota Timberwolves');
  } else if (dominantArchetype === 'power') {
    recommendedTeams.push('Milwaukee Bucks', 'Cleveland Cavaliers', 'New York Knicks');
  } else if (dominantArchetype === 'finesse') {
    recommendedTeams.push('Denver Nuggets', 'Dallas Mavericks', 'Boston Celtics');
  }

  const uniqueTeams = Array.from(new Set(recommendedTeams)).slice(0, 3);
  return uniqueTeams.map((teamName: string, index: number) => ({
    name: teamName,
    ...teams[teamName],
    matchScore: 92 - index * 4
  }));
}

// Lightweight helpers for V2 scoring
const aliasToClubKey: Record<string, string> = {
  'Newcastle United': 'Newcastle',
  'Leicester City': 'Leicester',
  'AS Roma': 'Roma'
};

const primaryShortToFull: Record<string, string> = {
  Lakers: 'Los Angeles Lakers',
  Celtics: 'Boston Celtics',
  Thunder: 'Oklahoma City Thunder',
  '76ers': 'Philadelphia 76ers',
  Warriors: 'Golden State Warriors',
  Clippers: 'Los Angeles Clippers',
  Knicks: 'New York Knicks',
  Magic: 'Orlando Magic',
  Nuggets: 'Denver Nuggets',
  Pistons: 'Detroit Pistons',
  Pacers: 'Indiana Pacers',
  Hornets: 'Charlotte Hornets',
  Heat: 'Miami Heat',
  Spurs: 'San Antonio Spurs',
  Wizards: 'Washington Wizards',
  Bucks: 'Milwaukee Bucks',
  Timberwolves: 'Minnesota Timberwolves',
  Cavaliers: 'Cleveland Cavaliers',
  Suns: 'Phoenix Suns',
  Grizzlies: 'Memphis Grizzlies',
  Kings: 'Sacramento Kings',
  Mavericks: 'Dallas Mavericks',
  'Trail Blazers': 'Portland Trail Blazers',
  Raptors: 'Toronto Raptors',
  Hawks: 'Atlanta Hawks',
  Bulls: 'Chicago Bulls',
  Rockets: 'Houston Rockets',
  Jazz: 'Utah Jazz',
  Nets: 'Brooklyn Nets',
  Pelicans: 'New Orleans Pelicans'
};

function getClubPrimaryTeams(clubName: string, clubs: FootballClubsMap): string[] {
  const key = aliasToClubKey[clubName] || clubName;
  const data: any = clubs[key];
  if (!data) return [];
  const primary = data.primaryTeam as string | undefined;
  if (primary && primaryShortToFull[primary]) return [primaryShortToFull[primary]];
  if (Array.isArray((data as any).primary)) {
    return ((data as any).primary as string[])
      .map((t) => primaryShortToFull[t] || t)
      .filter(Boolean);
  }
  return [];
}

function normalizeString(value: unknown): string {
  if (!value) return '';
  return String(value).toLowerCase();
}

function styleMatchesPreference(teamStyle: string | undefined, pref: QuizAnswersV2['style']): boolean {
  const s = normalizeString(teamStyle);
  switch (pref) {
    case 'fast_paced':
      return s.includes('fast') || s.includes('pace') || s.includes('transition');
    case 'three_point':
      return s.includes('3-point') || s.includes('three') || s.includes('spacing') || s.includes('shoot');
    case 'defensive':
      return s.includes('defense') || s.includes('defensive') || s.includes('grit');
    case 'star_dominance':
      return s.includes('star') || s.includes('superstar') || s.includes('lebron') || s.includes('luka') || s.includes('giannis') || s.includes('jokic');
    case 'team_first':
      return s.includes('team') || s.includes('ball movement') || s.includes('movement');
    default:
      return false;
  }
}

function philosophyMatches(team: any, pref: QuizAnswersV2['philosophy']): boolean {
  const status = normalizeString(team.status);
  const narrative = normalizeString(team.narrative);
  switch (pref) {
    case 'contender':
      return status.includes('defending') || status.includes('win-now') || status.includes('contender') || narrative.includes('champion');
    case 'young_team':
      return status.includes('young') || status.includes('rising') || narrative.includes('young') || narrative.includes('rebuild');
    case 'historic':
      return narrative.includes('historic') || ['Celtics', 'Lakers', 'Knicks', 'Bulls'].includes(team.__key);
    case 'underdog':
      return narrative.includes('underdog') || status.includes('rebuild') || narrative.includes('loyal') || narrative.includes('small');
    default:
      return false;
  }
}

function timezoneMatches(teamTz: string | undefined, pref: QuizAnswersV2['timezonePref']): boolean {
  if (!pref || pref === 'ANY') return true;
  if (!teamTz) return false;
  // Normalize variations (ET/CT/MT/PT)
  const norm = teamTz.replace('EST', 'ET').replace('CST', 'CT').replace('MST', 'MT').replace('PST', 'PT');
  return norm === pref;
}

export function calculateQuizMatchV2(
  answers: QuizAnswersV2,
  teams: TeamsMap,
  clubs: FootballClubsMap
): TeamMatchResult[] {
  // Re-balanced weights to emphasize style/identity; nationality scales with user importance
  const WEIGHTS = {
    location: 0.20,
    nationality: 0.15,
    fandom: 0.20,
    style: 0.25,
    philosophy: 0.20
  } as const;

  const scores: Record<string, { raw: number; reasons: string[] } > = {};

  const fandomTeams = answers.hasFandom === 'yes' && answers.fandomClub
    ? getClubPrimaryTeams(answers.fandomClub, clubs)
    : [];

  const tzIndex: Record<string, number> = { ET: 0, CT: 1, MT: 2, PT: 3 };
  const preferredTz = answers.timezonePref || 'ANY';
  const watchMode = answers.watchMode || 'highlights_only';

  // Heuristic local offset from ET based on location text (for display hints only)
  function localOffsetFromET(location?: string): number {
    const v = (location || '').toLowerCase();
    const hit = (...xs: string[]) => xs.some((x) => v.includes(x));
    if (!v) return 0;
    // Western Europe (UTC / WET)
    if (hit('uk','united kingdom','england','scotland','wales','ireland','dublin','london','portugal','lisbon')) return 5;
    // Central Europe (CET) — typical ET+6
    if (hit(
      'france','paris','spain','madrid','germany','berlin','rome','italy','switzerland','zurich','geneva',
      'netherlands','amsterdam','belgium','brussels','austria','vienna','czech','prague','poland','warsaw',
      'hungary','budapest','slovakia','bratislava','slovenia','ljubljana','croatia','zagreb','denmark','copenhagen',
      'norway','oslo','sweden','stockholm','europe'
    )) return 6;
    // Eastern Europe / East Med (EET) — typical ET+7
    if (hit('greece','athens','turkey','istanbul','israel','tel aviv','bucharest','romania','bulgaria','finland','helsinki','latvia','lithuania','estonia','ukraine','kyiv')) return 7;
    if (hit('uae','dubai','saudi','riyadh','qatar','doha')) return 8;
    // India — approximate to +10 versus ET (ignoring half-hour for simplicity)
    if (hit('india','mumbai','delhi','bangalore')) return 10;
    if (hit('australia','sydney','melbourne')) return 14;
    if (hit('new zealand','auckland','wellington')) return 16;
    if (hit('mexico','mexico city')) return -1;
    if (hit('brazil','rio','sao paulo')) return 1;
    if (hit('winnipeg')) return -1;
    if (hit('calgary','edmonton')) return -2;
    if (hit('vancouver')) return -3;
    if (hit('chicago','dallas','houston','nashville','milwaukee','minneapolis')) return -1;
    if (hit('denver','phoenix','salt lake','utah','arizona','albuquerque')) return -2;
    if (hit('los angeles','san francisco','seattle','portland','las vegas','san diego')) return -3;
    return 0;
  }
  const localOffset = localOffsetFromET(answers.location);
  const to12 = (h: number) => {
    const hh = ((h % 24) + 24) % 24;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const hour = hh % 12 === 0 ? 12 : hh % 12;
    return `${hour} ${ampm}`;
  };
  const to24 = (h: number) => {
    const hh = ((h % 24) + 24) % 24;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hh)}:00`;
  };

  function cityFromTeam(shortKey: string, teamAny: any): string {
    const direct = (teamAny && (teamAny as any).city)
      ? String((teamAny as any).city)
      : '';
    if (direct) return direct;
    const full = primaryShortToFull[shortKey] || shortKey;
    // If full ends with the short key, slice prefix as city (e.g., "Los Angeles Lakers")
    const idx = full.lastIndexOf(' ' + shortKey);
    if (idx > -1) return full.slice(0, idx).trim();
    return full;
  }

  function countryFlagEmoji(location?: string): string | undefined {
    const v = (location || '').toLowerCase();
    if (!v) return undefined;
    const pick = (iso2: string) => {
      const up = (iso2 || '').toUpperCase();
      if (up.length !== 2) return undefined;
      const base = 127462; // '🇦'
      const a = up.charCodeAt(0) - 65; // 'A' -> 0
      const b = up.charCodeAt(1) - 65;
      if (a < 0 || a > 25 || b < 0 || b > 25) return undefined;
      return String.fromCodePoint(base + a) + String.fromCodePoint(base + b);
    };
    if (/(united kingdom|uk|england|scotland|wales|northern ireland|london)/.test(v)) return pick('gb');
    if (/(ireland|dublin)/.test(v)) return pick('ie');
    if (/(france|paris)/.test(v)) return pick('fr');
    if (/(spain|madrid|barcelona)/.test(v)) return pick('es');
    if (/(germany|berlin|munich)/.test(v)) return pick('de');
    if (/(italy|rome|milan|naples)/.test(v)) return pick('it');
    if (/(portugal|lisbon|porto)/.test(v)) return pick('pt');
    if (/(greece|athens)/.test(v)) return pick('gr');
    if (/(turkey|istanbul)/.test(v)) return pick('tr');
    if (/(israel|tel aviv|jerusalem)/.test(v)) return pick('il');
    if (/(uae|united arab emirates|dubai|abu dhabi)/.test(v)) return pick('ae');
    if (/(india|mumbai|delhi|bangalore)/.test(v)) return pick('in');
    if (/(australia|sydney|melbourne)/.test(v)) return pick('au');
    if (/(new zealand|auckland|wellington)/.test(v)) return pick('nz');
    if (/(mexico|mexico city)/.test(v)) return pick('mx');
    if (/(brazil|rio|sao paulo)/.test(v)) return pick('br');
    if (/(canada|toronto|montreal|vancouver|calgary|edmonton|winnipeg)/.test(v)) return pick('ca');
    if (/(united states|usa|new york|boston|miami|chicago|los angeles|san francisco|seattle|dallas|houston|phoenix|denver)/.test(v)) return pick('us');
    if (/(japan|tokyo|osaka|kyoto)/.test(v)) return pick('jp');
    if (/(china|shanghai|beijing|shenzhen|hong kong)/.test(v)) return pick('cn');
    if (/(south korea|seoul)/.test(v)) return pick('kr');
    if (/(singapore)/.test(v)) return pick('sg');
    if (/(south africa|cape town|johannesburg)/.test(v)) return pick('za');
    if (/(nigeria|lagos)/.test(v)) return pick('ng');
    if (/(kenya|nairobi)/.test(v)) return pick('ke');
    if (/(egypt|cairo)/.test(v)) return pick('eg');
    if (/(morocco|casablanca|rabat)/.test(v)) return pick('ma');
    return undefined;
  }

  Object.entries(teams).forEach(([key, team]) => {
    const reasons: string[] = [];
    let raw = 0;
    let styleHit = false;
    let philosophyHit = false;

    // Attach key for helper checks
    (team as any).__key = key;

    // Location / timezone with distance logic and watch mode handling
    const teamTz: string = ((team as any).timezone || '').replace('EST','ET').replace('CST','CT').replace('MST','MT').replace('PST','PT');
    if (preferredTz === 'ANY' || !teamTz) {
      raw += 50 * WEIGHTS.location; // mild credit if user is flexible or missing
    } else {
      const a = tzIndex[preferredTz] ?? 0;
      const b = tzIndex[teamTz as keyof typeof tzIndex] ?? 0;
      const distance = Math.abs(a - b); // 0..3
      // For live games: heavily favor closer timezones; for highlights: softer penalty
      const liveBias = watchMode === 'live_games' ? [100, 65, 30, 5] : [85, 70, 55, 40];
      raw += (liveBias[distance] || 0) * WEIGHTS.location;
      if (distance === 0) reasons.push('Matches your timezone for easier live viewing');
      else if (distance === 1) reasons.push('Reasonable viewing times most nights');
      else if (watchMode === 'highlights_only') reasons.push('Good fit if you mainly watch replays/highlights');
    }

    // Nationality connection (scale by importance)
    const natScale = answers.nationalityImportance === 'high' ? 1.6 : answers.nationalityImportance === 'medium' ? 1.2 : 1.0;
    if (answers.nationality && answers.nationality !== 'No preference') {
      const nationals = teamNationalities[key] || [];
      if (nationals.includes(answers.nationality)) {
        raw += 100 * WEIGHTS.nationality * natScale;
        reasons.push(`Players from ${answers.nationality}`);
      }
    } else {
      // neutral small credit so nationality doesn't zero-out
      raw += 30 * WEIGHTS.nationality;
    }

    // Fandom style boost via mapped primary teams
    if (fandomTeams.includes(key)) {
      raw += 100 * WEIGHTS.fandom;
      reasons.push('Aligns with your existing club identity');
    }

    // Playing style
    if (answers.style && styleMatchesPreference((team as any).style, answers.style)) {
      raw += 100 * WEIGHTS.style;
      styleHit = true;
      reasons.push('Fits your preferred playing style');
    }

    // Philosophy
    if (answers.philosophy && philosophyMatches((team as any), answers.philosophy)) {
      raw += 100 * WEIGHTS.philosophy;
      philosophyHit = true;
      reasons.push('Matches your team philosophy');
    }

    // Synergy bonuses for strong alignment
    if (styleHit && philosophyHit) {
      raw += 8; // combined identity synergy
    }

    // Historic brand synergy when user prefers historic identity
    if (answers.philosophy === 'historic') {
      const HISTORIC = new Set<string>(['Boston Celtics','Los Angeles Lakers','New York Knicks','Chicago Bulls']);
      if (HISTORIC.has(key)) {
        raw += 6;
        reasons.push('Historic brand appeal');
      }
    }

    // Star-dominance synergy when roster features marquee superstars
    if (answers.style === 'star_dominance') {
      const stars: string[] = Array.isArray((team as any).stars)
        ? ((team as any).stars as string[])
        : String((team as any).stars || '').split(/,\s*/).filter(Boolean);
      const MARQUEE = ['LeBron','LeBron James','Anthony Davis','Stephen Curry','Kevin Durant','Luka','Luka Dončić','Giannis','Giannis Antetokounmpo','Nikola Jokić','Joel Embiid','Kawhi Leonard','Jayson Tatum','Damian Lillard','Devin Booker'];
      if (stars.some((s) => MARQUEE.some((m) => new RegExp(m, 'i').test(s)))) {
        raw += 6;
        reasons.push('Superstar-led roster matches star-dominance preference');
      }
    }

    // Tier preference alignment
    const teamAny: any = team as any;
    const statusEnum = String(teamAny.statusEnum || '').toLowerCase();
    const watch = typeof teamAny.watchabilityScore === 'number' ? teamAny.watchabilityScore : 0;
    const stylesArr: string[] = Array.isArray(teamAny.playingStyles) ? teamAny.playingStyles.map((x: any) => String(x).toLowerCase()) : [];
    let tierLabel = 'Playoff team';
    if (/contender|champion|defending/.test(statusEnum) || watch >= 88) tierLabel = 'Title contender';
    else if (/rebuilding|young|rising/.test(statusEnum)) tierLabel = 'Rebuilding with young stars';
    else if (stylesArr.some((s) => /defense|defensive|grit|rim/.test(s))) tierLabel = 'Defense-first team';
    else if (/bottom|lottery|cellar/.test(String(teamAny.status || '').toLowerCase())) tierLabel = 'Bottom tier';
    // Apply preference boost
    if (answers.tierPref && answers.tierPref === tierLabel) {
      raw += 12; // meaningful bump when tier matches user's stated preference
      reasons.push(`Matches your tier preference: ${tierLabel}`);
    }

    scores[key] = { raw, reasons };
  });

  const ranked = Object.entries(scores)
    .sort(([, a], [, b]) => b.raw - a.raw)
    .slice(0, 3)
    .map(([name, s], idx) => {
      const teamAny: any = (teams as any)[name] || {};
      const percent = Math.max(55, Math.min(98, Math.round(s.raw)));
      // Compute local tip-off hint for display: assume 7 PM in team's home timezone
      const teamTz: string = (teamAny.timezone || '').replace('EST','ET').replace('CST','CT').replace('MST','MT').replace('PST','PT');
      const teamIdx = tzIndex[teamTz as keyof typeof tzIndex] ?? 0;
      const etHour = 19 + teamIdx; // convert team local 7 PM to ET clock
      const localHour = etHour + localOffset;
      const localTip12 = to12(localHour);
      const localTip24 = to24(localHour);
      const userCountry = answers.location || '';
      const teamCity = cityFromTeam(name, teamAny);
      const sentence = userCountry
        ? `Most live home games in ${teamCity || name} will air around ${localTip12} (${localTip24}) in ${userCountry}. If that's late for you, replays/highlights may fit better.`
        : `Most live home games in ${teamCity || name} will air around ${localTip12} (${localTip24}).`;
      const flag = countryFlagEmoji(userCountry);
      // Tier label
      const statusEnum = String(teamAny.statusEnum || '').toLowerCase();
      const watch = typeof teamAny.watchabilityScore === 'number' ? teamAny.watchabilityScore : 0;
      const stylesArr: string[] = Array.isArray(teamAny.playingStyles) ? teamAny.playingStyles.map((x: any) => String(x).toLowerCase()) : [];
      let tierLabel = 'Playoff team';
      if (/contender|champion|defending/.test(statusEnum) || watch >= 88) tierLabel = 'Title contender';
      else if (/rebuilding|young|rising/.test(statusEnum)) tierLabel = 'Rebuilding with young stars';
      else if (stylesArr.some((s) => /defense|defensive|grit|rim/.test(s))) tierLabel = 'Defense-first team';
      else if (/bottom|lottery|cellar/.test(String(teamAny.status || '').toLowerCase())) tierLabel = 'Bottom tier';
      return {
        name,
        matchPercent: percent,
        reasons: s.reasons.slice(0, 4),
        stars: teamAny.stars,
        viewingTimes: teamAny.viewingTimes || teamAny.viewingTime,
        status: teamAny.status,
        style: teamAny.style,
        headline: teamAny.headline,
        viewingLocalTip: `Typical local start for home games: ${localTip12} (${localTip24})`,
        viewingSentence: sentence,
        userLocation: answers.location,
        userFlag: flag,
        userNationality: answers.nationality,
        userStyle: answers.style,
        userPhilosophy: answers.philosophy,
        userWatchMode: watchMode,
        tierLabel,
      } as TeamMatchResult;
    });

  return ranked;
}

// ---------------- Narrative enrichment (existing-team flow) ----------------

type NarrativeFactors = {
  cityLinks?: Array<{ city: string; sourceTeam: string }>
  identityTags?: string[]
  userTimezone?: 'ET' | 'CT' | 'MT' | 'PT' | 'ANY'
  euNationality?: string | null
};

function getWeights(): any {
  const def = { weights: { city_link: 40, identity_match: 25, eu_star: 20, winning_now: 10, timezone_fit: 5, watchability: 5 }, fallbacks: { minResults: 3 } };
  return { ...def, ...WEIGHTS_CFG };
}

function pickStatusSnippet(statusEnum?: string): string | null {
  const map = (NARR_TEMPLATES && NARR_TEMPLATES.statusSnippets) || {};
  if (!statusEnum) return null;
  return map[statusEnum] || null;
}

export function enrichMatchesWithNarrative(
  matches: any[],
  selectedTeams: string[],
  teams: TeamsMap,
  clubs: FootballClubsMap
) {
  const titles = (NARR_TEMPLATES && NARR_TEMPLATES.titles) || { top: 'Top recommendation', second: 'Second choice', third: 'Dark horse' };
  const templates = (NARR_TEMPLATES && NARR_TEMPLATES.templates) || {};
  const catches = (NARR_TEMPLATES && NARR_TEMPLATES.catches) || {};
  const identitySnippets = (NARR_TEMPLATES && NARR_TEMPLATES.identitySnippets) || {};
  const weights = getWeights();

  // Build quick map for source teams to identities/cities if present, de-duped
  const dedupSources = Array.from(new Set(selectedTeams));
  const sourceMeta = dedupSources.map((name) => ({ name, identity: (clubs as any)[name]?.identity || '', city: (clubs as any)[name]?.city || '' }));

  // Heuristic identity tag extractor from free-text identities
  const tagFromText = (txt: string): string[] => {
    const t = (txt || '').toLowerCase();
    const tags: string[] = [];
    if (/(historic|tradition|legacy)/.test(t)) tags.push('historic');
    if (/(cosmopolitan|global brand|glamour|paris|hollywood)/.test(t)) tags.push('cosmopolitan', 'star_power');
    if (/(star|superstar|galactico|mbapp|messi|neymar)/.test(t)) tags.push('star_power');
    if (/(technical|tiki|possession|beautiful|flowing)/.test(t)) tags.push('technical', 'possession');
    if (/(working class|blue collar|loyal fanbase|resilience|underdog|small market)/.test(t)) tags.push('blue_collar', 'underdog');
    if (/(young|youth|develop|academy)/.test(t)) tags.push('young_team');
    if (/(winning|champion|dynasty|treble|title)/.test(t)) tags.push('winning_tradition');
    return Array.from(new Set(tags));
  };

  const withNarratives = matches.map((m, idx) => {
    const reasons: string[] = [];

    // Identity links for each selected source (non-duplicated text)
    const identitySentences: string[] = [];
    sourceMeta.forEach((src) => {
      const tags = Array.isArray(src.identity) ? (src.identity as string[]) : tagFromText(String(src.identity || ''));
      const humanSnippets = (tags as string[])
        .map((tg) => identitySnippets[tg])
        .filter(Boolean)
        .slice(0, 2);
      if (humanSnippets.length > 0) {
        const snippet = humanSnippets.join(', ');
        const tpl = templates.identity_match || 'Similar identity to {sourceTeam}: {identitySnippet}';
        const line = tpl.replace('{sourceTeam}', src.name).replace('{identitySnippet}', snippet);
        if (!reasons.includes(line)) reasons.push(line);
        identitySentences.push(`From ${src.name}: ${snippet}.`);
      }
    });

    // Watchability bump
    const w = (m.watchabilityScore || 0) as number;
    if (w >= (weights.fallbacks.watchabilityThreshold || 75)) {
      const tpl = templates.watchability || 'High watchability — consistently entertaining games';
      reasons.push(tpl);
    }

    // Winning now
    const statusSnippet = pickStatusSnippet((m as any).statusEnum);
    if (statusSnippet) {
      const tpl = templates.winning_now || 'Competitive now ({statusSnippet})';
      reasons.push(tpl.replace('{statusSnippet}', statusSnippet));
    }

    // Compose catch
    let catchLine: string | null = null;
    const dys = (m.dysfunction || '').toString().toLowerCase();
    const inj = (m.injuries || '').toString().toLowerCase();
    const status = ((m.statusEnum || '') as string).toLowerCase();
    if (!catchLine && status.includes('rebuild')) catchLine = (catches.rebuilding || null);
    if (!catchLine && inj.includes('high')) catchLine = (catches.injuries || null);
    if (!catchLine && dys.includes('high')) catchLine = (catches.dysfunction || null);

    const titleLabel = idx === 0 ? titles.top : idx === 1 ? titles.second : titles.third;

    // Intentionally do not prefill a narrative paragraph. We want skeleton until stream arrives.

    return {
      ...m,
      titleLabel,
      reasons: Array.from(new Set([...(m.reasons || []), ...reasons])).slice(0, 4),
      catch: catchLine || undefined,
      narrativeSummary: undefined
    };
  });

  return withNarratives;
}

// ---------------- Tag-based ranker from external source teams ----------------

const BIG_BRANDS = new Set<string>([
  'Los Angeles Lakers',
  'New York Knicks',
  'Golden State Warriors',
  'Boston Celtics',
]);

// Build reverse map: Full team name -> short code (e.g., 'Cleveland Cavaliers' -> 'Cavaliers')
const fullToShort: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  Object.entries(primaryShortToFull).forEach(([shortName, fullName]) => {
    out[fullName] = shortName;
  });
  return out;
})();

function normalizeArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  return [String(value)];
}

function teamMatchesTag(teamKey: string, team: any, tag: string): boolean {
  const conf = (TAG_MAP && TAG_MAP.nba && TAG_MAP.nba[tag]) || null;
  if (!conf) return false;
  const shortToFull = primaryShortToFull;
  // statusEnum match
  if (conf.statusEnum) {
    const s = (team.statusEnum || '').toString();
    if (normalizeArray(conf.statusEnum).some((x) => x === s)) return true;
  }
  // playingStyles match
  if (conf.playingStyles) {
    const styles: string[] = Array.isArray(team.playingStyles) ? team.playingStyles : [];
    if (styles.length > 0 && normalizeArray(conf.playingStyles).some((x) => styles.includes(x))) return true;
  }
  // philosophy match
  if (conf.philosophy) {
    const ph: string[] = Array.isArray(team.philosophy) ? team.philosophy : [];
    if (ph.length > 0 && normalizeArray(conf.philosophy).some((x) => ph.includes(x))) return true;
  }
  // brands explicit list (short names like Lakers)
  if (conf.brands) {
    const brands = normalizeArray(conf.brands);
    if (brands.some((b) => shortToFull[b] === teamKey)) return true;
  }
  // markets list (short names like Cavaliers, Pacers, etc.)
  if ((conf as any).markets) {
    const markets = normalizeArray((conf as any).markets);
    const short = fullToShort[teamKey];
    if (short && markets.includes(short)) return true;
  }
  return false;
}

function hashString(input: string): number {
  // deterministic small hash for tie-breaking based on selected teams
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

export function rankTeamsFromSources(
  selectedTeams: string[],
  sources: FootballClubsMap,
  teams: TeamsMap
): TeamMatchResult[] {
  const unique = Array.from(new Set(selectedTeams));

  // Collect source metadata and tags
  const identityTags: string[] = [];
  const styleTags: string[] = [];
  const philosophyTags: string[] = [];
  const statusEnums: string[] = [];
  const primaryHits = new Set<string>();
  const sourceCities: string[] = [];
  const sourceWatchability: number[] = [];
  const seed = hashString(unique.join('|'));

  unique.forEach((name) => {
    const s: any = (sources as any)[name];
    if (!s) return;
    if (Array.isArray(s.identityTags)) identityTags.push(...s.identityTags);
    if (Array.isArray(s.playingStyleTags)) styleTags.push(...s.playingStyleTags);
    if (Array.isArray(s.philosophy)) philosophyTags.push(...s.philosophy);
    if (s.statusEnum) statusEnums.push(String(s.statusEnum));
    if (typeof s.watchabilityScore === 'number') sourceWatchability.push(s.watchabilityScore);
    const primary = s.primaryTeam as string | undefined;
    if (primary) {
      // Resolve primary to a real teams key, with fallbacks
      const desiredFull = primaryShortToFull[primary] || primary;
      let resolved = '';
      if ((teams as any)[desiredFull]) {
        resolved = desiredFull;
      } else {
        const keys = Object.keys(teams as any);
        // Try contains match on team name
        const byName = keys.find((k) => new RegExp(primary, 'i').test(k) || new RegExp(desiredFull, 'i').test(k));
        if (byName) {
          resolved = byName;
        } else if (s.city) {
          // Try city match
          const sc = String(s.city).toLowerCase();
          const byCity = keys.find((k) => {
            const city = ((teams as any)[k]?.city || '').toString().toLowerCase();
            return city && (city === sc || city.includes(sc) || sc.includes(city));
          });
          if (byCity) resolved = byCity;
        }
      }
      if (resolved) primaryHits.add(resolved);
    }
    if (s.city) sourceCities.push(String(s.city));
  });

  const tagWeights: Record<string, number> = ((TAG_MAP && TAG_MAP.weights) || {}) as Record<string, number>;
  const allTags = Array.from(new Set([...identityTags, ...styleTags]));
  const sourceWatchAvg = sourceWatchability.length
    ? Math.round(sourceWatchability.reduce((a, b) => a + b, 0) / sourceWatchability.length)
    : 75;

  // Map source status buckets to NBA equivalents for alignment scoring
  const statusAffinity: Record<string, string[]> = {
    elite_contender: ['contender', 'champion', 'competing'],
    dynasty_in_transition: ['competing', 'retooling', 'retool', 'uncertain'],
    talented_but_volatile: ['retooling', 'uncertain'],
    cursed_overachievers: ['underdog', 'retooling'],
    fallen_giant_crisis: ['rebuilding', 'retooling', 'underdog'],
    crisis_rebuilding: ['rebuilding', 'underdog'],
    mid_table_europa_chaos: ['competing', 'retooling'],
    established_renaissance: ['competing', 'contender'],
    bundelisga_dominance_restored: ['contender', 'champion'], // defensive fallback for typos
    domestic_dominance: ['contender', 'champion'],
    continental_treble_holders: ['contender', 'champion'],
  };

  function statusMatches(teamStatusEnum?: string): boolean {
    if (!teamStatusEnum) return false;
    const lowered = String(teamStatusEnum).toLowerCase();
    return statusEnums.some((s) => {
      const list = statusAffinity[s] || [];
      return list.some((x) => lowered.includes(x));
    });
  }

  function jaccard(a: string[] = [], b: string[] = []): number {
    const A = new Set(a);
    const B = new Set(b);
    let interCount = 0;
    const union = new Set<string>();
    A.forEach((v) => {
      union.add(v);
      if (B.has(v)) interCount++;
    });
    B.forEach((v) => union.add(v));
    return union.size === 0 ? 0 : interCount / union.size;
  }

  const allScored = Object.entries(teams).map(([teamKey, teamAny]: [string, any]) => {
    let score = 0;
    const matchedTags: string[] = [];

    // Tag alignment (identity + style via tag map)
    allTags.forEach((tag) => {
      if (teamMatchesTag(teamKey, teamAny, tag)) {
        matchedTags.push(tag);
        score += tagWeights[tag] || 6; // slight bump in base weight
      }
    });

    // Style and philosophy direct overlaps (using teams.json rich fields)
    const teamStyles: string[] = Array.isArray(teamAny.playingStyles) ? teamAny.playingStyles : [];
    const teamPhilosophy: string[] = Array.isArray(teamAny.philosophy) ? teamAny.philosophy : [];
    const styleOverlap = jaccard(teamStyles, styleTags);
    const philosophyOverlap = jaccard(teamPhilosophy, philosophyTags);
    score += Math.round(styleOverlap * 18); // up to +18
    score += Math.round(philosophyOverlap * 14); // up to +14

    // Status alignment
    if (statusMatches(teamAny.statusEnum)) score += 10;

    // Watchability alignment to user's source average (closer is better)
    const w = typeof teamAny.watchabilityScore === 'number' ? teamAny.watchabilityScore : 0;
    const delta = Math.abs(w - sourceWatchAvg);
    score += Math.max(0, 12 - Math.round(delta / 5)); // up to +12 if very close

    // Primary mapping boost
    if (primaryHits.has(teamKey)) score += 40;

    // City link boost (e.g., Browns -> Cleveland Cavaliers)
    const teamCity = (teamAny.city || '').toString().toLowerCase();
    if (teamCity && sourceCities.some((c) => {
      const sc = String(c).toLowerCase();
      return sc === teamCity || sc.includes(teamCity) || teamCity.includes(sc);
    })) {
      score += 32;
    }

    // Big brand penalty unless tags explicitly justify
    if (BIG_BRANDS.has(teamKey)) {
      const hasJust = matchedTags.some((t) => t === 'star_power' || t === 'cosmopolitan' || t === 'historic' || t === 'winning_tradition');
      if (!hasJust && !primaryHits.has(teamKey)) score -= 24; // stronger penalty to increase variety
    }

    // If exactly one source team, hard-bias toward its mapped NBA primary
    if (unique.length === 1 && primaryHits.has(teamKey)) {
      score += 500; // ensure #1 placement while still allowing tag diversity below it
    }

    // Soft randomization for tie-breakers (deterministic per selection)
    const jitter = ((seed ^ hashString(teamKey)) % 9) - 4; // -4..+4
    score += jitter;

    const reasons: string[] = [];
    if (primaryHits.has(teamKey)) reasons.push('Direct franchise/city link to your selected team(s)');
    if (matchedTags.length > 0) reasons.push(`Aligns with your teams' identity: ${matchedTags.slice(0, 3).join(', ')}`);
    if (styleOverlap > 0.34) reasons.push('Style fit with your teams (playing style overlap)');
    if (philosophyOverlap > 0.34) reasons.push('Philosophy matches your teams (identity/approach)');
    if (teamCity && sourceCities.some((c) => String(c).toLowerCase() === teamCity)) reasons.push(`City link: complete your ${teamCity.charAt(0).toUpperCase() + teamCity.slice(1)} set`);
    if (w >= 85) reasons.push('High watchability');

    return { teamKey, score, matchedTags, reasons, teamStyles, teamPhilosophy, statusEnum: teamAny.statusEnum, conference: teamAny.conference };
  });

  // If exactly one source and we have a primary, hard-place it at #1 (keep behavior)
  if (unique.length === 1 && primaryHits.size > 0) {
    const [primaryKey] = Array.from(primaryHits);
    const primaryEntry = allScored.find((e) => e.teamKey === primaryKey);
    const others = allScored
      .filter((e) => e.teamKey !== primaryKey)
      .sort((a, b) => b.score - a.score);
    const ordered = [primaryEntry, ...others].filter(Boolean) as typeof allScored;
    const top = ordered.slice(0, 3);
    return top.map((s) => {
      const t: any = (teams as any)[s.teamKey] || {};
      const percent = Math.max(55, Math.min(98, 70 + Math.round(s.score)));
      const teamCity = (t.city || '').toString().toLowerCase();
      const reasons: string[] = [];
      reasons.push('Direct franchise/city link to your selected team(s)');
      if (teamCity && sourceCities.some((c) => {
        const sc = String(c).toLowerCase();
        return sc === teamCity || sc.includes(teamCity) || teamCity.includes(sc);
      })) {
        reasons.push(`City link: complete your ${teamCity.charAt(0).toUpperCase() + teamCity.slice(1)} set`);
      }
      return {
        name: s.teamKey,
        matchPercent: percent,
        reasons,
        stars: t.stars,
        viewingTimes: t.viewingTimes || t.viewingTime,
        status: t.status,
        style: t.style,
        headline: t.headline,
        ...(t || {})
      } as TeamMatchResult;
    });
  }

  // Diversity-aware selection for top-3 (MMR-like greedy)
  const sorted = allScored.sort((a, b) => b.score - a.score);
  const candidates = sorted.slice(0, 12); // consider a wider slate
  const chosen: typeof candidates = [];
  let brandLimit = 1;
  const thresholds = [0.6, 0.8, 1.1]; // similarity relax thresholds
  const isBrand = (k: string) => BIG_BRANDS.has(k);

  function tooSimilar(a: typeof candidates[number], b: typeof candidates[number]): number {
    const simStyles = jaccard(a.teamStyles, b.teamStyles);
    const simPhilosophy = jaccard(a.teamPhilosophy, b.teamPhilosophy);
    const sameStatus = (String(a.statusEnum || '').toLowerCase() && String(a.statusEnum || '').toLowerCase() === String(b.statusEnum || '').toLowerCase()) ? 0.5 : 0;
    return (simStyles * 0.6) + (simPhilosophy * 0.4) + sameStatus; // 0..1.5 approx
  }

  function violatesBrandLimit(nextKey: string): boolean {
    const currentBrands = chosen.filter((c) => isBrand(c.teamKey)).length;
    return isBrand(nextKey) && currentBrands >= brandLimit && !primaryHits.has(nextKey);
  }

  function violatesConferenceDiversity(nextConf?: string): boolean {
    if (!nextConf) return false;
    const counts: Record<string, number> = {};
    chosen.forEach((c) => {
      const conf = String(c.conference || '');
      counts[conf] = (counts[conf] || 0) + 1;
    });
    // avoid 3 from same conference if options exist
    return (counts[nextConf] || 0) >= 2;
  }

  for (const t of thresholds) {
    for (const c of candidates) {
      if (chosen.length >= 3) break;
      if (violatesBrandLimit(c.teamKey)) continue;
      if (violatesConferenceDiversity(String(c.conference || ''))) continue;
      const similarToAny = chosen.some((x) => tooSimilar(x, c) > t);
      if (!similarToAny) chosen.push(c);
    }
    if (chosen.length >= 3) break;
    // relax brand limit for next pass
    brandLimit = 2;
  }

  // Fallback if still not enough picks
  while (chosen.length < 3 && candidates[chosen.length]) {
    chosen.push(candidates[chosen.length]);
  }

  // Ensure at least one primary-mapped team lands in top-3 for multi-select
  if (!chosen.some((e) => primaryHits.has(e.teamKey)) && primaryHits.size > 0) {
    const bestPrimary = candidates.find((e) => primaryHits.has(e.teamKey));
    if (bestPrimary) {
      // Replace the lowest-score brand pick if possible
      let replaceIdx = chosen.findIndex((e) => isBrand(e.teamKey) && !primaryHits.has(e.teamKey));
      if (replaceIdx === -1) replaceIdx = chosen.length - 1;
      if (replaceIdx >= 0) chosen[replaceIdx] = bestPrimary;
    }
  }

  return chosen.slice(0, 3).map((s) => {
    const t: any = (teams as any)[s.teamKey] || {};
    const percent = Math.max(55, Math.min(98, 70 + Math.round(s.score)));
    // Expand reasons slightly with style/philosophy humanization when available
    const extra: string[] = [];
    if (Array.isArray(t.playingStyles) && t.playingStyles.length > 0) extra.push('Style: ' + t.playingStyles.slice(0, 2).join(', '));
    if (Array.isArray(t.philosophy) && t.philosophy.length > 0) extra.push('Philosophy: ' + t.philosophy.slice(0, 2).join(', '));
    const reasons = Array.from(new Set([...(s.reasons || []), ...extra])).slice(0, 4);
    return {
      name: s.teamKey,
      matchPercent: percent,
      reasons,
      stars: t.stars,
      viewingTimes: t.viewingTimes || t.viewingTime,
      status: t.status,
      style: t.style,
      headline: t.headline,
      ...(t || {})
    } as TeamMatchResult;
  });
}


