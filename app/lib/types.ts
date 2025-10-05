export type TeamRecord = {
  conference?: string;
  division?: string;
  timezone?: string;
  status?: string;
  market?: string;
  style?: string;
  narrative?: string;
  viewingTime?: string;
  headline?: string;
  stars?: string[] | string;
  watchability?: number | string;
  bandwagon?: string;
  dysfunction?: string;
  injuries?: string;
  culture?: string;
};

export type TeamsMap = Record<string, TeamRecord>;

export type FootballClubRecord = {
  primary?: string[]; // legacy inline mapping
  primaryTeam?: string; // shorthand mapping from JSON data
  identity?: string | string[]; // optional; some leagues provide identityTags instead
  identityTags?: string[];
  playingStyleTags?: string[];
  city?: string;
  league?: string;
  conference?: string;
  division?: string;
  timezone?: string;
  status?: string;
  statusEnum?: string;
  watchabilityScore?: number;
  [key: string]: any; // allow extra fields from league JSONs
};

export type FootballClubsMap = Record<string, FootballClubRecord>;

export type Answers = Record<string, any>;

// Quiz V2 explicit types (non-breaking; existing code may keep using Answers)
export type QuizAnswersV2 = {
  location?: string; // user-selected region/country label
  timezonePref?: 'ET' | 'CT' | 'MT' | 'PT' | 'ANY';
  hasFandom?: 'yes' | 'no';
  fandomClub?: string; // football club name
  nationality?: string; // country name or 'No preference'
  nationalityImportance?: 'low' | 'medium' | 'high';
  tierPref?: 'Title contender' | 'Playoff team' | 'Rebuilding with young stars' | 'Defense-first team' | 'Bottom tier';
  style?:
    | 'fast_paced'
    | 'three_point'
    | 'defensive'
    | 'star_dominance'
    | 'team_first';
  philosophy?: 'contender' | 'young_team' | 'historic' | 'underdog';
  watchMode?: 'live_games' | 'highlights_only';
};

export type TeamMatchResult = {
  name: string;
  matchPercent: number; // 0-100
  reasons: string[];
  stars?: string | string[];
  viewingTimes?: string;
  viewingLocalTip?: string;
  viewingSentence?: string;
  userLocation?: string;
  userFlag?: string;
  userNationality?: string;
  userStyle?: QuizAnswersV2['style'];
  userPhilosophy?: QuizAnswersV2['philosophy'];
  userWatchMode?: QuizAnswersV2['watchMode'];
  tierLabel?: string;
  status?: string;
  style?: string;
  headline?: string;
};

