// Minimal nationality mapping for MVP
// Keys should match keys in data/teams.json (e.g., "Lakers", "Celtics", ...)
export const teamNationalities: Record<string, string[]> = {
  Celtics: ['USA'],
  Lakers: ['USA'],
  Warriors: ['USA'],
  Bucks: ['Greece', 'USA'],
  Mavericks: ['Slovenia', 'Spain', 'Germany', 'USA'],
  Nuggets: ['Serbia', 'USA'],
  Thunder: ['Canada', 'Australia', 'USA'],
  Spurs: ['France', 'USA'],
  '76ers': ['Cameroon', 'USA'],
  Pacers: ['USA'],
  Magic: ['Germany', 'USA', 'Italy'],
  Knicks: ['USA'],
  Suns: ['USA'],
  Clippers: ['USA'],
  Cavaliers: ['USA'],
  Grizzlies: ['USA'],
  Kings: ['USA'],
  Hawks: ['USA'],
  Timberwolves: ['USA', 'France'],
  Pelicans: ['USA'],
  Nets: ['USA'],
  Bulls: ['USA'],
  Rockets: ['Turkey', 'USA'],
  Hornets: ['USA'],
  Jazz: ['Finland', 'USA'],
  Wizards: ['USA'],
  Raptors: ['Canada', 'USA'],
  Pistons: ['USA'],
  'Trail Blazers': ['USA']
};

// Build nationality choices from global-players.json plus USA and 'No preference'
let derived: string[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const gp = require('../../data/global-players.json');
  const countries = (gp && gp.countries) ? Object.keys(gp.countries) : [];
  derived = countries.sort((a: string, b: string) => a.localeCompare(b));
} catch {}

export const topNationalities: string[] = Array.from(
  new Set([
    'USA',
    ...derived,
    'No preference'
  ])
);


