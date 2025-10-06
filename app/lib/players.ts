// Lightweight player trait mapping used by the Player Explorer
// Keep names simple strings; UI/components consume as `{ player, team? }`.

export type TraitPlayer = { player: string; team?: string };

// Minimal current-team mapping (2025–26). Updated via web sources on Oct 5, 2025.
const PLAYER_TO_TEAM: Record<string, string> = {
  'Stephen Curry': 'Golden State Warriors',
  'Klay Thompson': 'Dallas Mavericks',
  'Draymond Green': 'Golden State Warriors',
  'Andrew Wiggins': 'Golden State Warriors',
  'Luka Dončić': 'Dallas Mavericks',
  'Kyrie Irving': 'Dallas Mavericks',

  'Damian Lillard': 'Milwaukee Bucks',
  'Giannis Antetokounmpo': 'Milwaukee Bucks',
  'Brook Lopez': 'Milwaukee Bucks',
  'Khris Middleton': 'Milwaukee Bucks',

  'Kevin Durant': 'Phoenix Suns',
  'Devin Booker': 'Phoenix Suns',
  'Grayson Allen': 'Phoenix Suns',

  'Nikola Jokić': 'Denver Nuggets',
  'Jamal Murray': 'Denver Nuggets',
  'Michael Porter Jr.': 'Denver Nuggets',
  'Aaron Gordon': 'Denver Nuggets',

  'LeBron James': 'Los Angeles Lakers',
  'Anthony Davis': 'Los Angeles Lakers',
  'Austin Reaves': 'Los Angeles Lakers',

  'Jayson Tatum': 'Boston Celtics',
  'Jaylen Brown': 'Boston Celtics',
  'Jrue Holiday': 'Boston Celtics',
  'Derrick White': 'Boston Celtics',
  'Kristaps Porziņģis': 'Boston Celtics',

  'Shai Gilgeous-Alexander': 'Oklahoma City Thunder',
  'Chet Holmgren': 'Oklahoma City Thunder',
  'Jalen Williams': 'Oklahoma City Thunder',
  'Alex Caruso': 'Oklahoma City Thunder',

  'Victor Wembanyama': 'San Antonio Spurs',
  'Chris Paul': 'San Antonio Spurs',
  'Devin Vassell': 'San Antonio Spurs',

  'Joel Embiid': 'Philadelphia 76ers',
  'Tyrese Maxey': 'Philadelphia 76ers',
  'Paul George': 'Philadelphia 76ers',

  'Jalen Brunson': 'New York Knicks',
  'OG Anunoby': 'New York Knicks',
  'Mikal Bridges': 'New York Knicks',
  'Julius Randle': 'New York Knicks',
  'Mitchell Robinson': 'New York Knicks',
  'Jordan Clarkson': 'New York Knicks', // UPDATED

  'Donovan Mitchell': 'Cleveland Cavaliers',
  'Evan Mobley': 'Cleveland Cavaliers',
  'Darius Garland': 'Cleveland Cavaliers',
  'Jarrett Allen': 'Cleveland Cavaliers',

  'Jimmy Butler': 'Miami Heat',
  'Bam Adebayo': 'Miami Heat',
  'Tyler Herro': 'Miami Heat',

  'Anthony Edwards': 'Minnesota Timberwolves',
  'Rudy Gobert': 'Minnesota Timberwolves',
  'Karl-Anthony Towns': 'Minnesota Timberwolves',
  'Mike Conley': 'Minnesota Timberwolves',
  'Jaden McDaniels': 'Minnesota Timberwolves',

  'Ja Morant': 'Memphis Grizzlies',
  'Desmond Bane': 'Memphis Grizzlies',
  'Jaren Jackson Jr.': 'Memphis Grizzlies',
  'Zach Edey': 'Memphis Grizzlies',

  'Steven Adams': 'Houston Rockets',

  'Domantas Sabonis': 'Sacramento Kings',
  'De’Aaron Fox': 'Sacramento Kings',
  'Keegan Murray': 'Sacramento Kings',
  'DeMar DeRozan': 'Sacramento Kings', // UPDATED

  'Zion Williamson': 'New Orleans Pelicans',
  'Brandon Ingram': 'Toronto Raptors', // UPDATED (trade to TOR Feb 2025)
  'CJ McCollum': 'New Orleans Pelicans',
  'Herb Jones': 'New Orleans Pelicans',
  'Jose Alvarado': 'New Orleans Pelicans',

  'Scottie Barnes': 'Toronto Raptors',
  'RJ Barrett': 'Toronto Raptors',

  'Tyrese Haliburton': 'Indiana Pacers',
  'Myles Turner': 'Indiana Pacers',
  'Bennedict Mathurin': 'Indiana Pacers',
  'Pascal Siakam': 'Indiana Pacers',

  'LaMelo Ball': 'Charlotte Hornets',
  'Miles Bridges': 'Charlotte Hornets',
  'Mark Williams': 'Charlotte Hornets',

  'Kawhi Leonard': 'LA Clippers',
  'James Harden': 'LA Clippers',
  'Derrick Jones Jr.': 'LA Clippers', // UPDATED

  'Jalen Johnson': 'Atlanta Hawks',
  'Trae Young': 'Atlanta Hawks',
  'Dejounte Murray': 'Atlanta Hawks',

  'Franz Wagner': 'Orlando Magic',
  'Paolo Banchero': 'Orlando Magic',
  'Jalen Suggs': 'Orlando Magic',

  'Lauri Markkanen': 'Utah Jazz',
  

  'Nic Claxton': 'Brooklyn Nets',
  'Cam Johnson': 'Brooklyn Nets',

  'Buddy Hield': 'Golden State Warriors', // UPDATED
  'Tim Hardaway Jr.': 'Detroit Pistons',  // UPDATED
  'Bruce Brown': 'Denver Nuggets',        // UPDATED
  'Jonas Valančiūnas': 'Denver Nuggets',  // UPDATED

 
  'Deandre Ayton': 'Portland Trail Blazers',
  'Jalen Green': 'Houston Rockets',
  'Jonathan Kuminga': 'Golden State Warriors',
  'Marcus Smart': 'Memphis Grizzlies',
  'Josh Hart': 'New York Knicks',
  
};

const mapTeams = (list: TraitPlayer[]): TraitPlayer[] => list.map((p) => ({
  player: p.player,
  team: PLAYER_TO_TEAM[p.player] || p.team,
}));

export const PLAYERS_BY_TRAIT: Record<string, TraitPlayer[]> = {
  // Offensive skills
  off_three_point: mapTeams([
    { player: 'Stephen Curry', team: 'Golden State Warriors' },
    { player: 'Klay Thompson', team: 'Golden State Warriors' },
    { player: 'Damian Lillard', team: 'Milwaukee Bucks' },
    { player: 'Luka Dončić', team: 'Dallas Mavericks' },
    { player: 'Trae Young', team: 'Atlanta Hawks' },
    { player: 'Desmond Bane', team: 'Memphis Grizzlies' },
    { player: 'Buddy Hield', team: 'Golden State Warriors' }, // ensure override
    { player: 'Keegan Murray', team: 'Sacramento Kings' },
    { player: 'Donovan Mitchell', team: 'Cleveland Cavaliers' },
    { player: 'Grayson Allen', team: 'Phoenix Suns' },
  ]),
  off_dunking: mapTeams([
    { player: 'Anthony Edwards', team: 'Minnesota Timberwolves' },
    { player: 'Zion Williamson', team: 'New Orleans Pelicans' },
    { player: 'Ja Morant', team: 'Memphis Grizzlies' },
    { player: 'Jalen Green', team: 'Houston Rockets' },
    { player: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder' },
    { player: 'Jaylen Brown', team: 'Boston Celtics' },
    { player: 'Miles Bridges', team: 'Charlotte Hornets' },
    { player: 'Aaron Gordon', team: 'Denver Nuggets' },
    { player: 'Derrick Jones Jr.' }, // maps to Clippers
    { player: 'Shaedon Sharpe', team: 'Portland Trail Blazers' }, // fixed spelling
  ]),
  off_midrange: mapTeams([
    { player: 'Kevin Durant', team: 'Phoenix Suns' },
    { player: 'DeMar DeRozan', team: 'Sacramento Kings' }, // UPDATED
    { player: 'Kawhi Leonard', team: 'LA Clippers' },
    { player: 'Jayson Tatum', team: 'Boston Celtics' },
    { player: 'Brandon Ingram', team: 'Toronto Raptors' }, // UPDATED
    { player: 'Khris Middleton', team: 'Milwaukee Bucks' },
    { player: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder' },
    { player: 'Devin Booker', team: 'Phoenix Suns' },
  ]),
  off_iso_handles: mapTeams([
    { player: 'Kyrie Irving', team: 'Dallas Mavericks' },
    { player: 'James Harden', team: 'LA Clippers' },
    { player: 'Luka Dončić', team: 'Dallas Mavericks' },
    { player: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder' },
    { player: 'Donovan Mitchell', team: 'Cleveland Cavaliers' },
    { player: 'Jamal Murray', team: 'Denver Nuggets' },
    { player: 'Jayson Tatum', team: 'Boston Celtics' },
    { player: 'Anthony Edwards', team: 'Minnesota Timberwolves' },
    { player: 'Paul George', team: 'Philadelphia 76ers' },
  ]),
  off_playmaking: mapTeams([
    { player: 'Nikola Jokić', team: 'Denver Nuggets' },
    { player: 'LeBron James', team: 'Los Angeles Lakers' },
    { player: 'Tyrese Haliburton', team: 'Indiana Pacers' },
    { player: 'LaMelo Ball', team: 'Charlotte Hornets' },
    { player: 'Chris Paul', team: 'San Antonio Spurs' },
    { player: 'Scottie Barnes', team: 'Toronto Raptors' },
    { player: 'Jalen Brunson', team: 'New York Knicks' },
    { player: 'Jrue Holiday', team: 'Boston Celtics' },
    { player: 'De’Aaron Fox', team: 'Sacramento Kings' },
  ]),
  off_offball: mapTeams([
    { player: 'Klay Thompson', team: 'Golden State Warriors' },
    { player: 'Desmond Bane', team: 'Memphis Grizzlies' },
    { player: 'Buddy Hield', team: 'Golden State Warriors' },
    { player: 'Keegan Murray', team: 'Sacramento Kings' },
    { player: 'Grayson Allen', team: 'Phoenix Suns' },
    { player: 'Tyler Herro', team: 'Miami Heat' },
    { player: 'Khris Middleton', team: 'Milwaukee Bucks' },
    { player: 'Jordan Clarkson', team: 'Utah Jazz' }, // will map to Knicks
    { player: 'Tim Hardaway Jr.', team: 'Dallas Mavericks' }, // will map to Pistons
    { player: 'Cam Johnson', team: 'Brooklyn Nets' },
  ]),

  // Defensive traits
  def_perimeter: mapTeams([
    { player: 'Jrue Holiday', team: 'Boston Celtics' },
    { player: 'OG Anunoby', team: 'New York Knicks' },
    { player: 'Mikal Bridges', team: 'New York Knicks' },
    { player: 'Alex Caruso', team: 'Oklahoma City Thunder' },
    { player: 'Derrick White', team: 'Boston Celtics' },
    { player: 'Herb Jones', team: 'New Orleans Pelicans' },
    { player: 'Jaden McDaniels', team: 'Minnesota Timberwolves' },
    { player: 'Luguentz Dort', team: 'Oklahoma City Thunder' },
    { player: 'Marcus Smart', team: 'Memphis Grizzlies' },
    { player: 'Donte DiVincenzo', team: 'New York Knicks' },
  ]),
  def_rim: mapTeams([
    { player: 'Victor Wembanyama', team: 'San Antonio Spurs' },
    { player: 'Rudy Gobert', team: 'Minnesota Timberwolves' },
    { player: 'Jaren Jackson Jr.', team: 'Memphis Grizzlies' },
    { player: 'Brook Lopez', team: 'Milwaukee Bucks' },
    { player: 'Chet Holmgren', team: 'Oklahoma City Thunder' },
    { player: 'Myles Turner', team: 'Indiana Pacers' },
    { player: 'Anthony Davis', team: 'Los Angeles Lakers' },
    { player: 'Bam Adebayo', team: 'Miami Heat' },
    { player: 'Nic Claxton', team: 'Brooklyn Nets' },
    { player: 'Mitchell Robinson', team: 'New York Knicks' },
  ]),
  def_rebounding: mapTeams([
    { player: 'Domantas Sabonis', team: 'Sacramento Kings' },
    { player: 'Nikola Jokić', team: 'Denver Nuggets' },
    { player: 'Giannis Antetokounmpo', team: 'Milwaukee Bucks' },
    { player: 'Steven Adams', team: 'Houston Rockets' },
    { player: 'Bam Adebayo', team: 'Miami Heat' },
    { player: 'Jarrett Allen', team: 'Cleveland Cavaliers' },
    { player: 'Rudy Gobert', team: 'Minnesota Timberwolves' },
    { player: 'Anthony Davis', team: 'Los Angeles Lakers' },
    { player: 'Deandre Ayton', team: 'Portland Trail Blazers' },
    { player: 'Jonas Valančiūnas', team: 'New Orleans Pelicans' }, // will map to Nuggets
  ]),
  def_versatility: mapTeams([
    { player: 'Bam Adebayo', team: 'Miami Heat' },
    { player: 'Draymond Green', team: 'Golden State Warriors' },
    { player: 'Jaden McDaniels', team: 'Minnesota Timberwolves' },
    { player: 'Evan Mobley', team: 'Cleveland Cavaliers' },
    { player: 'Jayson Tatum', team: 'Boston Celtics' },
    { player: 'Kawhi Leonard', team: 'LA Clippers' },
    { player: 'Giannis Antetokounmpo', team: 'Milwaukee Bucks' },
    { player: 'Mikal Bridges', team: 'New York Knicks' },
    { player: 'OG Anunoby', team: 'New York Knicks' },
    { player: 'Herb Jones', team: 'New Orleans Pelicans' },
  ]),

  // Physical style
  phys_athletic: mapTeams([
    { player: 'Anthony Edwards', team: 'Minnesota Timberwolves' },
    { player: 'Ja Morant', team: 'Memphis Grizzlies' },
    { player: 'Zion Williamson', team: 'New Orleans Pelicans' },
    { player: 'Jalen Johnson', team: 'Atlanta Hawks' },
    { player: 'Jonathan Kuminga', team: 'Golden State Warriors' },
    { player: 'Aaron Gordon', team: 'Denver Nuggets' },
    { player: 'Jaylen Brown', team: 'Boston Celtics' },
    { player: 'Derrick Jones Jr.' }, // maps to Clippers
    { player: 'Miles Bridges', team: 'Charlotte Hornets' },
    { player: 'Shaedon Sharpe', team: 'Portland Trail Blazers' },
  ]),
  phys_physicality: mapTeams([
    { player: 'Giannis Antetokounmpo', team: 'Milwaukee Bucks' },
    { player: 'Joel Embiid', team: 'Philadelphia 76ers' },
    { player: 'Julius Randle', team: 'New York Knicks' },
    { player: 'Pascal Siakam', team: 'Indiana Pacers' },
    { player: 'Zach Edey', team: 'Memphis Grizzlies' },
    { player: 'Bam Adebayo', team: 'Miami Heat' },
    { player: 'Steven Adams', team: 'Houston Rockets' },
    { player: 'Brook Lopez', team: 'Milwaukee Bucks' },
  ]),
  phys_finesse: mapTeams([
    { player: 'Luka Dončić', team: 'Dallas Mavericks' },
    { player: 'Nikola Jokić', team: 'Denver Nuggets' },
    { player: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder' },
    { player: 'Devin Booker', team: 'Phoenix Suns' },
    { player: 'Tyrese Maxey', team: 'Philadelphia 76ers' },
    { player: 'Jayson Tatum', team: 'Boston Celtics' },
    { player: 'Kawhi Leonard', team: 'LA Clippers' },
    { player: 'Paul George', team: 'Philadelphia 76ers' },
    { player: 'Jamal Murray', team: 'Denver Nuggets' },
    { player: 'Kyrie Irving', team: 'Dallas Mavericks' },
  ]),

  // Tempo and energy
  tempo_fast: mapTeams([
    { player: 'De’Aaron Fox', team: 'Sacramento Kings' },
    { player: 'Tyrese Maxey', team: 'Philadelphia 76ers' },
    { player: 'Ja Morant', team: 'Memphis Grizzlies' },
    { player: 'Jalen Brunson', team: 'New York Knicks' },
    { player: 'Scoot Henderson', team: 'Portland Trail Blazers' },
    { player: 'Anthony Edwards', team: 'Minnesota Timberwolves' },
    { player: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder' },
    { player: 'Tyrese Haliburton', team: 'Indiana Pacers' },
    { player: 'LaMelo Ball', team: 'Charlotte Hornets' },
  ]),
  tempo_halfcourt: mapTeams([
    { player: 'Jayson Tatum', team: 'Boston Celtics' },
    { player: 'Kawhi Leonard', team: 'LA Clippers' },
    { player: 'Joel Embiid', team: 'Philadelphia 76ers' },
    { player: 'Lauri Markkanen', team: 'Utah Jazz' },
    { player: 'Nikola Jokić', team: 'Denver Nuggets' },
    { player: 'Luka Dončić', team: 'Dallas Mavericks' },
    { player: 'Jalen Brunson', team: 'New York Knicks' },
  ]),
  energy_high: mapTeams([
    { player: 'Josh Hart', team: 'New York Knicks' },
    { player: 'Alex Caruso', team: 'Oklahoma City Thunder' },
    { player: 'Herb Jones', team: 'New Orleans Pelicans' },
    { player: 'Jalen Williams', team: 'Oklahoma City Thunder' },
    { player: 'Derrick White', team: 'Boston Celtics' },
    { player: 'Austin Reaves', team: 'Los Angeles Lakers' },
    { player: 'Jose Alvarado', team: 'New Orleans Pelicans' },
    { player: 'Bruce Brown', team: 'Indiana Pacers' }, // will map to Nuggets
  ]),
  energy_efficient: mapTeams([
    { player: 'Kawhi Leonard', team: 'LA Clippers' },
    { player: 'Kevin Durant', team: 'Phoenix Suns' },
    { player: 'Paul George', team: 'Philadelphia 76ers' },
    { player: 'Khris Middleton', team: 'Milwaukee Bucks' },
    { player: 'Klay Thompson', team: 'Dallas Mavericks' },
    { player: 'Jalen Brunson', team: 'New York Knicks' },
    { player: 'Jrue Holiday', team: 'Boston Celtics' },
    { player: 'Mike Conley', team: 'Minnesota Timberwolves' },
    { player: 'Desmond Bane', team: 'Memphis Grizzlies' },
  ]),
};
