'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import QuizFlow from './components/QuizFlow';
import Container from './components/Container';
import Chip from './components/Chip';
import SkeletonLine from './components/SkeletonLine';
import { calculateQuizMatchV2 } from './lib/match';
import { PLAYERS_BY_TRAIT } from './lib/players';
import type { Answers, TeamsMap, FootballClubsMap, QuizAnswersV2 } from './lib/types';
import { ChevronRight, ChevronLeft, Trophy, Users, MapPin, Heart, Star, Zap, Target } from 'lucide-react';
import { generatePlayerNarrative } from './lib/ai';

// QuizFlow is imported statically to avoid loading fallback flashes

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
  
  // Lazy-loaded datasets for quiz flow
  const [teams, setTeams] = useState<TeamsMap | null>(null);
  const [footballClubMappings, setFootballClubMappings] = useState<FootballClubsMap | null>(null);
  const [mergedTeamsMap, setMergedTeamsMap] = useState<FootballClubsMap | null>(null);

  useEffect(() => {
    if (path === 'quiz' && (!teams || !footballClubMappings || !mergedTeamsMap)) {
      (async () => {
        try {
          const [
            { default: teamsJson },
            { default: footballClubsJson },
            { default: nflJson },
            { default: mlbJson },
            { default: nhlJson },
            { default: f1Json },
          ] = await Promise.all([
            import('../data/teams.json'),
            import('../data/footballClubs.json'),
            import('../data/nflTeams.json'),
            import('../data/mlbTeams.json'),
            import('../data/nhlTeams.json'),
            import('../data/f1Teams.json'),
          ]);
          setTeams(teamsJson as TeamsMap);
          const merged = {
            ...(footballClubsJson as FootballClubsMap),
            ...(nflJson as any),
            ...(mlbJson as any),
            ...(nhlJson as any),
            ...(f1Json as any),
          } as FootballClubsMap;
          setFootballClubMappings(footballClubsJson as FootballClubsMap);
          setMergedTeamsMap(merged);
        } catch {}
      })();
    }
  }, [path]);

  // Preload datasets before switching to quiz to avoid any loading flash
  const preloadQuizData = async () => {
    if (teams && footballClubMappings && mergedTeamsMap) return;
    try {
      const [
        { default: teamsJson },
        { default: footballClubsJson },
        { default: nflJson },
        { default: mlbJson },
        { default: nhlJson },
        { default: f1Json },
      ] = await Promise.all([
        import('../data/teams.json'),
        import('../data/footballClubs.json'),
        import('../data/nflTeams.json'),
        import('../data/mlbTeams.json'),
        import('../data/nhlTeams.json'),
        import('../data/f1Teams.json'),
      ]);
      setTeams(teamsJson as TeamsMap);
      const merged = {
        ...(footballClubsJson as FootballClubsMap),
        ...(nflJson as any),
        ...(mlbJson as any),
        ...(nhlJson as any),
        ...(f1Json as any),
      } as FootballClubsMap;
      setFootballClubMappings(footballClubsJson as FootballClubsMap);
      setMergedTeamsMap(merged);
    } catch {}
  };

  // Existing team flow moved to /existing route

  // Quiz V2 steps (5 questions)
  const quizSteps = [
    { id: 'location', title: 'Where are you located?', subtitle: 'City or country helps us infer timezone', icon: MapPin },
    { id: 'fandom', title: 'Do you already support a team?', subtitle: 'Any sport — we can match identity and culture', icon: Users },
    { id: 'nationality', title: 'Player nationality preference', subtitle: 'Optional — creates a connection', icon: Heart },
    { id: 'style', title: 'Preferred playing style', subtitle: 'Pick what you enjoy watching', icon: Zap },
    { id: 'philosophy', title: 'Team philosophy', subtitle: 'What identity resonates most?', icon: Target },
  ] as const;

  // (legacy quiz flow removed in favor of QuizFlow component)

  // ---------- Player style explorer (traits -> players) ----------
  type TraitPlayer = { player: string; team?: string };

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
    const ranked = Object.values(score)
      .sort((a, b) => b.s - a.s)
      .map((e) => e.p);
    // Ensure at least 8 suggestions; backfill from selected traits if dedupe reduced count
    const needMin = 8;
    const maxOut = 10;
    if (ranked.length < needMin) {
      const seen = new Set(ranked.map((r) => r.player));
      for (const t of traits) {
        for (const tp of (PLAYERS_BY_TRAIT[t] || [])) {
          if (!seen.has(tp.player)) {
            ranked.push(tp);
            seen.add(tp.player);
            if (ranked.length >= needMin) break;
          }
        }
        if (ranked.length >= needMin) break;
      }
    }
    return ranked.slice(0, maxOut);
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
        if (teams && footballClubMappings) {
          const computed = calculateQuizMatchV2(answersV2, teams as any, footballClubMappings as any);
          setResults(computed);
        }
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
        <Container>
          <button
            onClick={resetQuiz}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Your Top Matches</h1>
            {/* User selections summary (quiz) */}
            {Array.isArray(results) && results.length > 0 && (
              <div className="text-sm text-slate-700">
                <span className="mr-1 text-slate-600">Based on your selections —</span>
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
            {results.slice(0, 6).map((team: any, index: number) => {
              const accents = [
                { ring: 'bg-blue-600', chip: 'bg-blue-50 text-blue-700 border-blue-200', leftBar: 'border-blue-400', grad: 'from-blue-50' },
                { ring: 'bg-blue-600', chip: 'bg-blue-50 text-blue-700 border-blue-200', leftBar: 'border-blue-400', grad: 'from-blue-50' },
                { ring: 'bg-slate-900', chip: 'bg-slate-100 text-slate-800 border-slate-300', leftBar: 'border-slate-400', grad: 'from-slate-50' },
              ];
              const tone = accents[index % accents.length];
              const titleLabel = index === 0 ? 'Top recommendation' : index === 1 ? 'Second choice' : index === 2 ? 'Dark horse' : 'Also consider';
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
                        <SkeletonLine width="w-11/12" />
                        <SkeletonLine width="w-10/12" />
                        <SkeletonLine width="w-9/12" />
                        <SkeletonLine width="w-1/2" />
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
            className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
          >
            Start Over
          </button>
        </Container>
      </div>
    );
  }

  // INITIAL PATH SELECTION
  if (!path) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center">
        <Container>
          <div className="mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
              Find Your NBA Team
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
              A fast, modern selector that matches your vibe to the right franchise.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-5">
            {/* Existing Team Path -> new page */}
            <Link href="/existing" className="group w-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 rounded-xl">
              <div className="w-full bg-white border border-slate-200 rounded-xl p-6 md:p-7 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">I support an existing team in a different sport</h3>
                    <p className="text-slate-600 text-sm">Match based on favorite clubs in other sports • 1 minute</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </Link>

            {/* Quiz Path */}
            <button
              type="button"
              onClick={async () => { await preloadQuizData(); setPath('quiz'); }}
              className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 rounded-xl"
            >
              <div className="w-full bg-white border border-slate-200 rounded-xl p-6 md:p-7 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">Support your national team</h3>
                    <p className="text-slate-600 text-sm">Time zone and nationality-based picks • 1 minute</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </button>

            {/* Player Path */}
            <button
              type="button"
              onClick={() => setPath('player')}
              className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 rounded-xl"
            >
              <div className="w-full bg-white border border-slate-200 rounded-xl p-6 md:p-7 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <Star className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">Find exciting players to follow</h3>
                    <p className="text-slate-600 text-sm">Best shooters, dunkers, playmakers, and more • 1 minute</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Built for fans worldwide — modern, fast, and ad‑free.
          </div>
        </Container>
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
                    await generatePlayerNarrative(ranked, selectedTraits, (chunk: string) => {
                      buffer += chunk;
                      // Incrementally parse incoming text and update list so UI streams
                      try {
                        // Normalize SSE newlines to ensure parser sees boundaries
                        const normalized = buffer.replace(/__NL__/g, '\n').replace(/\n\n+/g, '\n')
                        const items = parsePlayerNarrative(normalized);
                        if (items.length > 0) {
                          setPlayerNarrativeItems(items);
                          setPlayersLoading(false);
                        }
                      } catch {}
                    });
                    // Ensure final parse in case last chunk lacked trailing newline
                    const finalNormalized = buffer.replace(/__NL__/g, '\n').replace(/\n\n+/g, '\n')
                    setPlayerNarrativeItems(parsePlayerNarrative(finalNormalized));
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
    if (!teams || !footballClubMappings || !mergedTeamsMap) return null;
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
