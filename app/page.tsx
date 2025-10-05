'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { calculateQuizMatch as quizMatch, calculateFootballMatch as footballMatch, calculatePlayerMatch as playerMatch, calculateQuizMatchV2 } from './lib/match';
import type { Answers, TeamsMap, FootballClubsMap, QuizAnswersV2 } from './lib/types';
import { ChevronRight, ChevronLeft, Trophy, Clock, TrendingUp, Users, MapPin, Heart, Star, Zap, Shield, Target, AlertCircle, Sparkles } from 'lucide-react';
import teamsData from '../data/teams.json';
import footballClubsData from '../data/footballClubs.json';
import nflTeams from '../data/nflTeams.json';
import mlbTeams from '../data/mlbTeams.json';
import nhlTeams from '../data/nhlTeams.json';
import f1Teams from '../data/f1Teams.json';
import playersData from '../data/players.json';
import { topNationalities } from './lib/nationalities';
import { generateQuizNarrative, generatePlayerNarrative } from './lib/ai';
import QuizFlow from './components/QuizFlow';

// Short -> Full NBA team names for display
const SHORT_TO_FULL: Record<string, string> = {
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

const NBATeamFinder = () => {
  const [path, setPath] = useState<'select' | 'football' | 'quiz' | 'player' | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [answersV2, setAnswersV2] = useState<QuizAnswersV2>({ timezonePref: 'ANY' });
  const [results, setResults] = useState<any>(null);
  const [quizStreamed, setQuizStreamed] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [suggestedPlayers, setSuggestedPlayers] = useState<TraitPlayer[]>([]);
  const [traitsComputed, setTraitsComputed] = useState(false);
  const [playerNarrativeItems, setPlayerNarrativeItems] = useState<Array<{ name: string; team?: string; blurb: string }>>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [clubSearch, setClubSearch] = useState('');
  

  // Import data from JSON files
  const teams: TeamsMap = teamsData as TeamsMap;
  const footballClubMappings: FootballClubsMap = footballClubsData as FootballClubsMap;
  const mergedTeamsMap: FootballClubsMap = {
    ...footballClubMappings,
    ...(nflTeams as unknown as FootballClubsMap),
    ...(mlbTeams as unknown as FootballClubsMap),
    ...(nhlTeams as unknown as FootballClubsMap),
    ...(f1Teams as unknown as FootballClubsMap)
  };
  const players = playersData as any[];

  // Existing team flow moved to /existing route

  // Quiz V2 steps (5 questions)
  const quizSteps = [
    { id: 'location', title: 'Where are you located?', subtitle: 'City or country helps us infer timezone', icon: MapPin },
    { id: 'fandom', title: 'Do you already support a team?', subtitle: 'Any sport — we can match identity and culture', icon: Users },
    { id: 'nationality', title: 'Player nationality preference', subtitle: 'Optional — creates a connection', icon: Heart },
    { id: 'style', title: 'Preferred playing style', subtitle: 'Pick what you enjoy watching', icon: Zap },
    { id: 'philosophy', title: 'Team philosophy', subtitle: 'What identity resonates most?', icon: Target },
  ] as const;

  // Comprehensive Quiz Matching Logic
  const calculateQuizMatch = () => {
    const sorted = quizMatch(answers, teams);
    setResults(sorted);
  };

  // Football club matching handled in /existing

  // deprecated simple combiner (replaced by aggregate version above)

  // Player-Based Matching
  const calculatePlayerMatch = () => {
    const resultsLocal = playerMatch(selectedPlayers, teams, players);
    setResults(resultsLocal);
  };

  // ---------- Player style explorer (traits -> players) ----------
  type TraitPlayer = { player: string; team?: string };
  const PLAYERS_BY_TRAIT: Record<string, TraitPlayer[]> = {
    // Offensive skills
    'off_three_point': [
      { player: 'Stephen Curry', team: 'Golden State Warriors' },
      { player: 'Klay Thompson', team: 'Golden State Warriors' },
      { player: 'Damian Lillard', team: 'Milwaukee Bucks' },
      { player: 'Luka Dončić', team: 'Dallas Mavericks' },
      { player: 'Trae Young', team: 'Atlanta Hawks' }
    ],
    'off_dunking': [
      { player: 'Anthony Edwards', team: 'Minnesota Timberwolves' },
      { player: 'Zion Williamson', team: 'New Orleans Pelicans' },
      { player: 'Ja Morant', team: 'Memphis Grizzlies' },
      { player: 'Jalen Green', team: 'Houston Rockets' },
      { player: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder' }
    ],
    'off_midrange': [
      { player: 'Kevin Durant', team: 'Phoenix Suns' },
      { player: 'DeMar DeRozan', team: 'Chicago Bulls' },
      { player: 'Kawhi Leonard', team: 'LA Clippers' },
      { player: 'Jayson Tatum', team: 'Boston Celtics' }
    ],
    'off_iso_handles': [
      { player: 'Kyrie Irving', team: 'Dallas Mavericks' },
      { player: 'James Harden', team: 'LA Clippers' },
      { player: 'Luka Dončić', team: 'Dallas Mavericks' },
      { player: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder' }
    ],
    'off_playmaking': [
      { player: 'Nikola Jokić', team: 'Denver Nuggets' },
      { player: 'LeBron James', team: 'Los Angeles Lakers' },
      { player: 'Tyrese Haliburton', team: 'Indiana Pacers' },
      { player: 'LaMelo Ball', team: 'Charlotte Hornets' }
    ],
    'off_offball': [
      { player: 'Klay Thompson', team: 'Golden State Warriors' },
      { player: 'Desmond Bane', team: 'Memphis Grizzlies' },
      { player: 'Buddy Hield', team: 'Golden State Warriors' }
    ],
    // Defensive traits
    'def_perimeter': [
      { player: 'Jrue Holiday', team: 'Boston Celtics' },
      { player: 'OG Anunoby', team: 'New York Knicks' },
      { player: 'Mikal Bridges', team: 'New York Knicks' },
      { player: 'Alex Caruso', team: 'Oklahoma City Thunder' }
    ],
    'def_rim': [
      { player: 'Victor Wembanyama', team: 'San Antonio Spurs' },
      { player: 'Rudy Gobert', team: 'Minnesota Timberwolves' },
      { player: 'Jaren Jackson Jr.', team: 'Memphis Grizzlies' },
      { player: 'Brook Lopez', team: 'Milwaukee Bucks' }
    ],
    'def_rebounding': [
      { player: 'Domantas Sabonis', team: 'Sacramento Kings' },
      { player: 'Nikola Jokić', team: 'Denver Nuggets' },
      { player: 'Giannis Antetokounmpo', team: 'Milwaukee Bucks' },
      { player: 'Steven Adams', team: 'Houston Rockets' }
    ],
    'def_versatility': [
      { player: 'Bam Adebayo', team: 'Miami Heat' },
      { player: 'Draymond Green', team: 'Golden State Warriors' },
      { player: 'Jaden McDaniels', team: 'Minnesota Timberwolves' }
    ],
    // Physical style
    'phys_athletic': [
      { player: 'Anthony Edwards', team: 'Minnesota Timberwolves' },
      { player: 'Ja Morant', team: 'Memphis Grizzlies' },
      { player: 'Zion Williamson', team: 'New Orleans Pelicans' }
    ],
    'phys_physicality': [
      { player: 'Giannis Antetokounmpo', team: 'Milwaukee Bucks' },
      { player: 'Joel Embiid', team: 'Philadelphia 76ers' },
      { player: 'Julius Randle', team: 'New York Knicks' }
    ],
    'phys_finesse': [
      { player: 'Luka Dončić', team: 'Dallas Mavericks' },
      { player: 'Nikola Jokić', team: 'Denver Nuggets' },
      { player: 'Shai Gilgeous-Alexander', team: 'Oklahoma City Thunder' }
    ],
    // Tempo and energy
    'tempo_fast': [
      { player: 'De’Aaron Fox', team: 'Sacramento Kings' },
      { player: 'Tyrese Maxey', team: 'Philadelphia 76ers' },
      { player: 'Ja Morant', team: 'Memphis Grizzlies' }
    ],
    'tempo_halfcourt': [
      { player: 'Jayson Tatum', team: 'Boston Celtics' },
      { player: 'Kawhi Leonard', team: 'LA Clippers' }
    ],
    'energy_high': [
      { player: 'Josh Hart', team: 'New York Knicks' },
      { player: 'Alex Caruso', team: 'Oklahoma City Thunder' },
      { player: 'Herb Jones', team: 'New Orleans Pelicans' }
    ],
    'energy_efficient': [
      { player: 'Kawhi Leonard', team: 'LA Clippers' },
      { player: 'Kevin Durant', team: 'Phoenix Suns' }
    ],
  };

  function rankTraitPlayers(traits: string[]): TraitPlayer[] {
    if (traits.length === 0) return [];
    const score: Record<string, { p: TraitPlayer; s: number }> = {};
    traits.forEach((t) => {
      (PLAYERS_BY_TRAIT[t] || []).forEach((tp, idx) => {
        const key = tp.player;
        if (!score[key]) score[key] = { p: tp, s: 0 };
        score[key].s += 10 - Math.min(idx, 5);
      });
    });
    return Object.values(score)
      .sort((a, b) => b.s - a.s)
      .slice(0, 7)
      .map((e) => e.p);
  }

  function parsePlayerNarrative(text: string | null): Array<{ name: string; team?: string; blurb: string }> {
    if (!text) return [];
    const lines = String(text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const out: Array<{ name: string; team?: string; blurb: string }> = [];
    lines.forEach((line) => {
      const m = line.match(/^\d+\.\s*([^:(]+?)\s*(?:\(([^)]+)\))?\s*:\s*(.+)$/);
      if (m) {
        out.push({ name: m[1].trim(), team: (m[2] || '').trim() || undefined, blurb: m[3].trim() });
      }
    });
    return out;
  }

  const handleAnswer = (questionId: string, value: any) => {
    if (questionId === 'dealbreakers') {
      // Handle multiple selection
      const current = answers.dealbreakers || [];
      let updated;
      if (value === 'none') {
        updated = ['none'];
      } else {
        updated = current.includes(value)
          ? current.filter((v: string) => v !== value)
          : [...current.filter((v: string) => v !== 'none'), value];
      }
      setAnswers({ ...answers, dealbreakers: updated });
      return;
    }

    setAnswers({ ...answers, [questionId]: value });
    
    if (path === 'quiz') {
      if (step < (quizSteps as any).length - 1) {
        setStep(step + 1);
      } else {
        const computed = calculateQuizMatchV2(answersV2, teams, footballClubMappings);
        setResults(computed);
      }
    }
  };

  const handlePlayerSelect = (playerName: string) => {
    if (selectedPlayers.includes(playerName)) {
      setSelectedPlayers(selectedPlayers.filter(p => p !== playerName));
    } else if (selectedPlayers.length < 3) {
      setSelectedPlayers([...selectedPlayers, playerName]);
    }
  };

  const resetQuiz = () => {
    setPath(null);
    setStep(0);
    setAnswers({});
    setResults(null);
    setSelectedPlayers([]);
    setAnswersV2({ timezonePref: 'ANY' });
    setClubSearch('');
  };

  // RESULTS DISPLAY
  if (results) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={resetQuiz}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Top Matches</h1>
            {/* User selections summary (quiz) */}
            {Array.isArray(results) && results.length > 0 && (
              <div className="text-sm text-gray-700">
                <span className="mr-1 text-gray-600">Based on your selections —</span>
                {(() => {
                  const r0 = results[0] || {};
                  const fragments: Array<JSX.Element> = [];
                  if (r0.userLocation) {
                    const loc = (
                      <span key="loc">
                        {r0.userFlag ? <span aria-hidden className="mr-1 text-base align-middle">{r0.userFlag}</span> : null}
                        watching in <span className="font-medium">{r0.userLocation}</span>
                      </span>
                    );
                    fragments.push(loc);
                  }
                  if (r0.userNationality && r0.userNationality !== 'No preference') {
                    fragments.push(
                      <span key="nat">prefer players from <span className="font-medium">{r0.userNationality}</span></span>
                    );
                  }
                  if (r0.userStyle) {
                    const styleText = String(r0.userStyle).replace(/_/g, ' ');
                    fragments.push(
                      <span key="style">along with <span className="font-medium">{styleText}</span></span>
                    );
                  }
                  return (
                    <span>
                      {fragments.map((node, i) => (
                        <React.Fragment key={i}>
                          {i > 0 ? '; ' : ''}
                          {node}
                        </React.Fragment>
                      ))}
                    </span>
                  );
                })()}
                <span className="ml-1 text-gray-600">— here are your teams:</span>
              </div>
            )}
          </div>

          <div className="space-y-5 mb-8">
            {results.map((team: any, index: number) => {
              const accents = [
                { ring: 'bg-blue-600', chip: 'bg-blue-50 text-blue-700 border-blue-200', leftBar: 'border-blue-400', grad: 'from-blue-50' },
                { ring: 'bg-violet-600', chip: 'bg-violet-50 text-violet-700 border-violet-200', leftBar: 'border-violet-400', grad: 'from-violet-50' },
                { ring: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800 border-amber-200', leftBar: 'border-amber-400', grad: 'from-amber-50' },
              ];
              const tone = accents[index % accents.length];
              const titleLabel = index === 0 ? 'Top recommendation' : index === 1 ? 'Second choice' : 'Dark horse';
              const starNames: string[] = Array.isArray(team.stars)
                ? team.stars
                : team.stars
                ? String(team.stars).split(/,\s*/)
                : [];
              const toHighlight = [SHORT_TO_FULL[team.name] || team.name, ...starNames].filter(Boolean);
              return (
                <div key={team.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-full ${tone.ring} text-white font-bold`}>{index + 1}</div>
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{SHORT_TO_FULL[team.name] || team.name}</h2>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${tone.chip}`}>{titleLabel}</span>
                          {team.tierLabel ? (
                            <span className="inline-block rounded border px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border-slate-200">{team.tierLabel}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {team.matchPercent && (
                      <span className="ml-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">{team.matchPercent}% match</span>
                    )}
                  </div>

                  <div className={`relative rounded-xl border ${tone.leftBar} border-l-4 bg-gradient-to-br ${tone.grad} to-white p-5`}>
                    {team.narrativeSummary ? (
                      <p className="mx-auto max-w-2xl text-[15px] leading-7 text-slate-800 whitespace-pre-line">
                        <HighlightedText text={team.narrativeSummary} terms={toHighlight} />
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-3.5 w-11/12 animate-pulse rounded bg-slate-200" />
                        <div className="h-3.5 w-10/12 animate-pulse rounded bg-slate-200" />
                        <div className="h-3.5 w-9/12 animate-pulse rounded bg-slate-200" />
                        <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-200" />
                      </div>
                    )}
                  </div>

                  {/* Viewing info */}
                  <div className="mt-3 bg-blue-50 border-l-2 border-blue-500 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {team.userFlag ? <span className="text-lg" aria-hidden>{team.userFlag}</span> : null}
                      <h4 className="text-sm font-semibold text-blue-800">{`Live viewing in ${team.userLocation || 'your location'}`}</h4>
                    </div>
                    <div className="text-sm text-gray-800">
                      {team.viewingSentence ? (
                        <p className="mb-1">{team.viewingSentence}</p>
                      ) : team.viewingLocalTip ? (
                        <p className="mb-1">{team.viewingLocalTip}</p>
                      ) : null}
                      {!team.userLocation && team.viewingTimes ? (
                        <p className="text-gray-700">{team.viewingTimes}</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Compact promo line */}
                  <p className="mt-3 text-[13.5px] leading-6 text-slate-700">
                    <strong>{SHORT_TO_FULL[team.name] || team.name}</strong>
                    {!team.userLocation && team.viewingTimes ? <> · Live window: <strong>{team.viewingTimes}</strong></> : null}
                    {team.style ? <> · {team.style}</> : null}
                    {starNames.length ? <> · Stars: <strong>{starNames.join(', ')}</strong></> : null}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Removed Pro Tip */}

          <button
            onClick={resetQuiz}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // INITIAL PATH SELECTION
  if (!path) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Find Your NBA Team
            </h1>
            <p className="text-lg text-gray-600">Answer a few quick questions to find your team!</p>
          </div>

          <div className="space-y-4 mb-8">
            {/* Existing Team Path -> new page */}
            <Link href="/existing" className="w-full block">
              <div className="w-full bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all text-left group">
                <div className="flex items-center gap-4">
                  <Trophy className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">I support an existing team in a different sport</h3>
                    <p className="text-gray-600 text-sm">Match based on favorite teams in other sports • 1 minute</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                </div>
              </div>
            </Link>

            {/* Quiz Path */}
            <button
              onClick={() => setPath('quiz')}
              className="w-full bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <Target className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Support your national team</h3>
                  <p className="text-gray-600 text-sm">Identify optimal teams to follow based on time zone and nationalities • 1 minute</p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
              </div>
            </button>

            {/* Player Path */}
            <button
              onClick={() => setPath('player')}
              className="w-full bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <Star className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Find exciting players to follow</h3>
                  <p className="text-gray-600 text-sm">Ferocious dunkers, the best shooters, fancy passing, and more • 1 minute</p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
              </div>
            </button>
          </div>

          
        </div>
      </div>
    );
  }

  // Existing flow moved to /existing

  // PLAYER SELECTION PATH
  if (path === 'player') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            <button
              onClick={resetQuiz}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select skills below to find top NBA players to follow</h2>
              
              {/* Removed direct player-pick chips for beginner flow */}
              {/* Traits selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {/* Offensive skills */}
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">Offensive skills</div>
                  {[
                    ['off_three_point','Three-point shooting — loves taking and making threes'],
                    ['off_dunking','Dunking and finishing — big dunks, layups, lob catches'],
                    ['off_midrange','Mid‑range touch — short jumpers and floaters'],
                    ['off_iso_handles','Ball-handling & 1‑on‑1 scoring — beats defenders off the dribble'],
                    ['off_playmaking','Passing & playmaking — sets up teammates'],
                    ['off_offball','Off‑ball movement — smart cuts, gets open for shots'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTraits.includes(key as string)}
                        onChange={(e) => {
                          setSelectedTraits((prev) => e.target.checked ? Array.from(new Set([...prev, key as string])) : prev.filter((x) => x !== key));
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {/* Defensive traits */}
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">Defensive traits</div>
                  {[
                    ['def_perimeter','Stay in front — guards ball handlers on the wing'],
                    ['def_rim','Shot blocking — protects the rim'],
                    ['def_rebounding','Rebounding — grabs missed shots'],
                    ['def_versatility','Switchable defense — guards many positions'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTraits.includes(key as string)}
                        onChange={(e) => {
                          setSelectedTraits((prev) => e.target.checked ? Array.from(new Set([...prev, key as string])) : prev.filter((x) => x !== key));
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {/* Physical style */}
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">Physical style</div>
                  {[
                    ['phys_athletic','Explosive athlete — fast and jumps high'],
                    ['phys_physicality','Strong/physical — uses strength and contact'],
                    ['phys_finesse','Smooth/finesse — crafty footwork and touch'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTraits.includes(key as string)}
                        onChange={(e) => {
                          setSelectedTraits((prev) => e.target.checked ? Array.from(new Set([...prev, key as string])) : prev.filter((x) => x !== key));
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {/* Tempo and energy */}
                <div className="border rounded-lg p-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">Tempo and energy</div>
                  {[
                    ['tempo_fast','Fast pace — run-and-gun, lots of fast breaks'],
                    ['tempo_halfcourt','Slower pace — set plays, patient offense'],
                    ['energy_high','High energy — constant effort, hustle plays'],
                    ['energy_efficient','Calm & efficient — saves energy, picks smart spots'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTraits.includes(key as string)}
                        onChange={(e) => {
                          setSelectedTraits((prev) => e.target.checked ? Array.from(new Set([...prev, key as string])) : prev.filter((x) => x !== key));
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={async () => {
                    const ranked = rankTraitPlayers(selectedTraits);
                    setSuggestedPlayers(ranked);
                    setTraitsComputed(true);
                    setPlayersLoading(true);
                    let buffer = '';
                    await generatePlayerNarrative(ranked, selectedTraits, (chunk: string) => { buffer += chunk; });
                    setPlayerNarrativeItems(parsePlayerNarrative(buffer));
                    setPlayersLoading(false);
                  }}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60"
                  disabled={selectedTraits.length === 0}
                >
                  Find players
                </button>
              </div>
              {traitsComputed && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-800 mb-2">Suggested players to follow</div>
                  <div className="bg-white border rounded-lg p-3">
                    {playersLoading ? (
                      <div className="space-y-2">
                        <div className="h-3.5 w-11/12 animate-pulse rounded bg-slate-200" />
                        <div className="h-3.5 w-10/12 animate-pulse rounded bg-slate-200" />
                        <div className="h-3.5 w-9/12 animate-pulse rounded bg-slate-200" />
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-200">
                        {playerNarrativeItems.map((it, idx) => (
                          <li key={idx} className="py-2">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-slate-900">{it.name}{it.team ? ` — ${it.team}` : ''}</div>
                              <div className="text-xs text-slate-500">#{idx + 1}</div>
                            </div>
                            <div className="text-[13.5px] text-slate-800">{it.blurb}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

              {/* Removed manual player grid for simpler beginner UX */}

              {/* Removed team calc button; using trait-based suggestions instead */}
          </div>
        </div>
      </div>
    );
  }

  // QUIZ PATH
  if (path === 'quiz') {
    return (
      <QuizFlow
        teams={teams}
        clubs={footballClubMappings}
        mergedTeamsMap={mergedTeamsMap}
        onBack={resetQuiz}
        onResults={(computed) => setResults(computed)}
      />
    );
  }

  return null;
};

export default function Home() {
  return <NBATeamFinder />;
}

// Highlight helper copied from existing page style for bolding names inside narrative
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeQuotes(s: string) {
  return s.replace(/[’‘]/g, "'");
}
function buildHighlightRegex(terms: string[]) {
  const variants: string[] = [];
  for (const t of terms) {
    const v1 = normalizeQuotes(String(t));
    const v2 = v1.replace(/é|è|ê/g, 'e');
    variants.push(v1, v2);
  }
  const uniq = Array.from(new Set(variants.filter(Boolean)));
  const source = uniq.map((t) => escapeRegExp(t)).join("|");
  return new RegExp(`(${source})`, "gi");
}
function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  if (!text || !terms || terms.length === 0) return <>{text}</> as any;
  const pattern = buildHighlightRegex(terms);
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) => {
        const isMatch = terms.some((t) => normalizeQuotes(String(t)).toLowerCase() === normalizeQuotes(part).toLowerCase());
        return isMatch ? <strong key={i}>{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}
