'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Target, MapPin, Heart, Zap } from 'lucide-react';
import Container from './Container';
import type { TeamsMap, FootballClubsMap, QuizAnswersV2 } from '../lib/types';
import { calculateQuizMatchV2 } from '../lib/match';
import { generateQuizNarrative } from '../lib/ai';
import { topNationalities } from '../lib/nationalities';
import globalPlayers from '../../data/global-players.json';

type QuizFlowProps = {
  teams: TeamsMap;
  clubs: FootballClubsMap;
  mergedTeamsMap: FootballClubsMap;
  onBack: () => void;
  onResults: (results: any[]) => void;
};

export default function QuizFlow({ teams, clubs, mergedTeamsMap, onBack, onResults }: QuizFlowProps) {
  const [step, setStep] = useState(0);
  const [answersV2, setAnswersV2] = useState<QuizAnswersV2>({ timezonePref: 'ANY' });
  const [computing, setComputing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [openRegion, setOpenRegion] = useState<string | null>(null);

  const quizSteps = [
    { id: 'location', title: 'Where will you be watching most games?', subtitle: 'Location helps infer timezone and selects most logical teams to follow', icon: MapPin },
    { id: 'nationality', title: 'Choose players from preferred nationality', subtitle: 'Optional - only applies if selected', icon: Heart },
    { id: 'tier', title: 'Team style and identity', subtitle: 'Pick your preferred team tier/identity', icon: Zap },
  ] as const;

  const current = (quizSteps as any)[step];

  // ---------- Flag helpers ----------
  const COUNTRY_TO_ISO: Record<string, string> = {
    'USA': 'US', 'United States': 'US', 'United States of America': 'US',
    'United Kingdom': 'GB', 'England': 'GB', 'Scotland': 'GB', 'Wales': 'GB', 'Ireland': 'IE',
    'France': 'FR', 'Spain': 'ES', 'Germany': 'DE', 'Italy': 'IT', 'Portugal': 'PT', 'Greece': 'GR', 'Turkey': 'TR',
    'Israel': 'IL', 'United Arab Emirates': 'AE', 'UAE': 'AE', 'India': 'IN', 'Japan': 'JP', 'China': 'CN', 'South Korea': 'KR', 'Singapore': 'SG', 'Hong Kong': 'HK',
    'Australia': 'AU', 'New Zealand': 'NZ',
    'Canada': 'CA', 'Mexico': 'MX', 'Brazil': 'BR', 'Argentina': 'AR', 'Chile': 'CL', 'Colombia': 'CO',
    'Switzerland': 'CH', 'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Poland': 'PL', 'Belgium': 'BE', 'Netherlands': 'NL', 'Austria': 'AT', 'Croatia': 'HR', 'Czech Republic': 'CZ', 'Bosnia and Herzegovina': 'BA', 'Finland': 'FI', 'Latvia': 'LV', 'Lithuania': 'LT', 'Montenegro': 'ME', 'Serbia': 'RS', 'Slovenia': 'SI', 'Ukraine': 'UA',
    'Angola': 'AO', 'Bahamas': 'BS', 'Cameroon': 'CM', 'Dominican Republic': 'DO', 'DRC': 'CD', 'Georgia': 'GE', 'Haiti': 'HT', 'Jamaica': 'JM', 'Mali': 'ML', 'Nigeria': 'NG', 'Saint Lucia': 'LC', 'Senegal': 'SN', 'South Sudan': 'SS', 'Sudan': 'SD',
    'Morocco': 'MA', 'Egypt': 'EG', 'Kenya': 'KE', 'South Africa': 'ZA'
  };

  const isoToFlag = (iso2: string | undefined): string | undefined => {
    if (!iso2) return undefined;
    const up = iso2.toUpperCase();
    if (up.length !== 2) return undefined;
    const base = 127462; // regional indicator 'A'
    const a = up.charCodeAt(0) - 65;
    const b = up.charCodeAt(1) - 65;
    if (a < 0 || a > 25 || b < 0 || b > 25) return undefined;
    return String.fromCodePoint(base + a) + String.fromCodePoint(base + b);
  };

  const countryToFlag = (name?: string): string | undefined => isoToFlag(COUNTRY_TO_ISO[String(name || '').trim()]);

  // Region mapping for nationality grouping
  const countryToRegion = (name?: string): string => {
    const c = String(name || '').trim();
    if (!c || c === 'No preference') return 'Other';
    const EUROPE = new Set(['United Kingdom','Ireland','France','Spain','Germany','Italy','Portugal','Netherlands','Belgium','Switzerland','Sweden','Norway','Denmark','Poland','Greece','Turkey','Austria','Croatia','Czech Republic','Bosnia and Herzegovina','Finland','Latvia','Lithuania','Montenegro','Serbia','Slovenia','Switzerland','Sweden','Ukraine']);
    const NORTH_AMERICA = new Set(['USA','United States','United States of America','Canada','Mexico','Bahamas','Dominican Republic','Haiti','Jamaica','Saint Lucia']);
    const SOUTH_AMERICA = new Set(['Brazil','Argentina','Chile','Colombia']);
    const ASIA = new Set(['Israel','United Arab Emirates','UAE','India','Japan','China','South Korea','Singapore','Hong Kong','Georgia','Turkey']);
    const OCEANIA = new Set(['Australia','New Zealand']);
    const AFRICA = new Set(['South Africa','Nigeria','Kenya','Egypt','Morocco','Angola','Cameroon','DRC','Senegal','Mali','South Sudan','Sudan']);
    if (EUROPE.has(c)) return 'Europe';
    if (NORTH_AMERICA.has(c)) return 'North America';
    if (SOUTH_AMERICA.has(c)) return 'South America';
    if (ASIA.has(c)) return 'Asia';
    if (OCEANIA.has(c)) return 'Oceania';
    if (AFRICA.has(c)) return 'Africa';
    return 'Other';
  };

  const regionOrder = ['North America','Europe','South America','Asia','Oceania','Africa','Other'];

  const groupedNationalities = useMemo(() => {
    const groups: Record<string, string[]> = {};
    (topNationalities || []).forEach((n) => {
      if (n === 'No preference') return;
      const r = countryToRegion(n);
      if (!groups[r]) groups[r] = [];
      groups[r].push(n);
    });
    Object.values(groups).forEach((arr) => arr.sort((a, b) => a.localeCompare(b)));
    return groups;
  }, []);

  useEffect(() => {
    if (answersV2.nationality && answersV2.nationality !== 'No preference') {
      const r = countryToRegion(answersV2.nationality);
      setOpenRegion(r);
    }
  }, [answersV2.nationality]);

  // ---------- Location inference helpers ----------
  const inferTimezone = (location: string | undefined): 'ET' | 'CT' | 'MT' | 'PT' | 'ANY' => {
    const v = (location || '').trim().toLowerCase();
    if (!v) return 'ANY';
    const hits = (...arr: string[]) => arr.some((k) => v.includes(k));
    // Europe/UK → ET tends to be most watchable
    if (hits('uk', 'united kingdom', 'england', 'scotland', 'wales', 'ireland', 'dublin', 'london', 'paris', 'france', 'spain', 'madrid', 'germany', 'berlin', 'rome', 'italy', 'portugal', 'lisbon', 'europe')) return 'ET';
    // Canada
    if (hits('toronto', 'ontario', 'ottawa', 'montreal', 'quebec')) return 'ET';
    if (hits('winnipeg', 'manitoba')) return 'CT';
    if (hits('calgary', 'edmonton', 'alberta')) return 'MT';
    if (hits('vancouver', 'british columbia', 'bc')) return 'PT';
    // US
    if (hits('new york', 'ny', 'boston', 'philadelphia', 'miami', 'florida', 'georgia', 'virginia', 'carolina', 'ohio', 'pennsylvania')) return 'ET';
    if (hits('chicago', 'illinois', 'texas', 'dallas', 'houston', 'nashville', 'tennessee', 'louisiana', 'alabama', 'mississippi', 'wisconsin', 'minnesota', 'iowa', 'kansas', 'oklahoma', 'arkansas', 'missouri')) return 'CT';
    if (hits('denver', 'colorado', 'utah', 'arizona', 'phoenix', 'new mexico', 'montana', 'wyoming', 'idaho')) return 'MT';
    if (hits('california', 'los angeles', 'san francisco', 'seattle', 'washington', 'oregon', 'portland', 'nevada', 'las vegas')) return 'PT';
    // APAC/LatAm/Africa — no clear US-zone fit
    return 'ET';
  };

  const suggestedTz = useMemo(() => inferTimezone(answersV2.location), [answersV2.location]);

  // Auto-apply suggested timezone behind the scenes (no UI selector)
  useEffect(() => {
    if (suggestedTz && suggestedTz !== answersV2.timezonePref) {
      setAnswersV2((prev) => ({ ...prev, timezonePref: suggestedTz }));
    }
  }, [suggestedTz]);

  // (Removed explicit local time conversions per simplified UX)

  // ---------- Country options (grouped by region) ----------
  const REGIONAL_COUNTRIES: Record<string, string[]> = {
    'Europe': [
      'United Kingdom','Ireland','France','Spain','Germany','Italy','Portugal','Netherlands','Belgium','Switzerland','Sweden','Norway','Denmark','Poland','Greece','Turkey'
    ],
    'North America': [
      'United States','Canada','Mexico'
    ],
    'South America': [
      'Brazil','Argentina','Chile','Colombia'
    ],
    'Asia': [
      'Israel','United Arab Emirates','India','Japan','China','South Korea','Singapore','Hong Kong'
    ],
    'Oceania': [
      'Australia','New Zealand'
    ],
    'Africa': [
      'South Africa','Nigeria','Kenya','Egypt','Morocco'
    ]
  };

  // ---------- Nationality to teams (via global-players.json) ----------
  const fullToShort: Record<string, string> = {
    'Los Angeles Lakers': 'Lakers',
    'Boston Celtics': 'Celtics',
    'Oklahoma City Thunder': 'Thunder',
    'Philadelphia 76ers': '76ers',
    'Golden State Warriors': 'Warriors',
    'Los Angeles Clippers': 'Clippers',
    'LA Clippers': 'Clippers',
    'New York Knicks': 'Knicks',
    'Orlando Magic': 'Magic',
    'Denver Nuggets': 'Nuggets',
    'Detroit Pistons': 'Pistons',
    'Indiana Pacers': 'Pacers',
    'Charlotte Hornets': 'Hornets',
    'Miami Heat': 'Heat',
    'San Antonio Spurs': 'Spurs',
    'Washington Wizards': 'Wizards',
    'Milwaukee Bucks': 'Bucks',
    'Minnesota Timberwolves': 'Timberwolves',
    'Cleveland Cavaliers': 'Cavaliers',
    'Phoenix Suns': 'Suns',
    'Memphis Grizzlies': 'Grizzlies',
    'Sacramento Kings': 'Kings',
    'Dallas Mavericks': 'Mavericks',
    'Portland Trail Blazers': 'Trail Blazers',
    'Toronto Raptors': 'Raptors',
    'Atlanta Hawks': 'Hawks',
    'Chicago Bulls': 'Bulls',
    'Houston Rockets': 'Rockets',
    'Utah Jazz': 'Jazz',
    'Brooklyn Nets': 'Nets',
    'New Orleans Pelicans': 'Pelicans',
    'San Antonio': 'Spurs',
  };

  const nationalityTeamsShort = useMemo(() => {
    const out = new Set<string>();
    const country = answersV2.nationality;
    if (!country || country === 'No preference') return out;
    const countries: any = (globalPlayers as any)?.countries || {};
    const list: Array<{ player: string; team: string }> = countries[country] || [];
    list.forEach((e) => {
      const key = fullToShort[e.team] || '';
      if (key && (teams as any)[key]) out.add(key);
    });
    return out;
  }, [answersV2.nationality, teams]);

  const nationalityTeamsDisplay = useMemo(() => Array.from(nationalityTeamsShort).slice(0, 12), [nationalityTeamsShort]);

  // Popular players for selected nationality (priority ordering), shown for non-US locations
  const nationalityPlayers = useMemo(() => {
    const out: Array<{ player: string; team: string }> = [];
    const country = answersV2.nationality;
    if (!country || country === 'No preference') return out;
    const countries: any = (globalPlayers as any)?.countries || {};
    const list: Array<{ player: string; team: string }> = countries[country] || [];
    const priority: Record<string, string[]> = {
      Canada: ['Shai Gilgeous-Alexander','Jamal Murray','RJ Barrett','Andrew Wiggins','Dillon Brooks','Ben Mathurin','Luguentz Dort'],
      Serbia: ['Nikola Jokić'],
      Slovenia: ['Luka Dončić'],
      Greece: ['Giannis Antetokounmpo'],
      France: ['Victor Wembanyama','Rudy Gobert','Bilal Coulibaly','Nicolas Batum','Ousmane Dieng','Rayan Rupert','Tidjane Salaün'],
      Cameroon: ['Joel Embiid','Pascal Siakam'],
      Germany: ['Franz Wagner','Moritz Wagner','Isaiah Hartenstein','Dennis Schröder','Tristan da Silva'],
      Australia: ['Josh Giddey','Ben Simmons','Dyson Daniels','Jock Landale','Patty Mills'],
      Spain: ['Santi Aldama']
    };
    const p = priority[country] || [];
    const score = (name: string) => {
      const idx = p.indexOf(name);
      return idx === -1 ? 999 : idx; // lower is better
    };
    const sorted = [...list].sort((a, b) => {
      const sa = score(a.player);
      const sb = score(b.player);
      if (sa !== sb) return sa - sb;
      return a.player.localeCompare(b.player);
    });
    return sorted.slice(0, 10);
  }, [answersV2.nationality]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Container>
        <div className="mx-auto max-w-3xl bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => (step === 0 ? onBack() : setStep(step - 1))}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            {step < (quizSteps as any).length - 1 && (
              <button
                onClick={() => setStep(step + 1)}
                className="ml-auto bg-blue-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Next
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="mb-8 will-change-transform">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Question {step + 1} of {quizSteps.length}</span>
              <span className="text-sm font-medium text-slate-500">{Math.round(((step + 1) / quizSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-[width] duration-300 ease-out"
                style={{ width: Math.round(((step + 1) / quizSteps.length) * 100) + '%' }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{current.title}</h2>
              <p className="text-slate-600">{current.subtitle}</p>
            </div>

            {/* Step content */}
            {current.id === 'location' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 max-w-md">
                  <label className="text-sm font-medium text-slate-700">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      const loc = e.target.value || '';
                      setAnswersV2({ ...answersV2, location: loc });
                    }}
                    className="w-full max-w-md p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a country…</option>
                    {Object.entries(REGIONAL_COUNTRIES).map(([region, countries]) => (
                      <optgroup key={region} label={region}>
                        {[...countries]
                          .sort((a, b) => a.localeCompare(b))
                          .map((name) => {
                            const flag = countryToFlag(name);
                            const label = `${flag ? flag + ' ' : ''}${name}`;
                            return (
                              <option key={name} value={name}>{label}</option>
                            );
                          })}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {/* removed time conversion UI per simplified spec */}
              </div>
            )}

            {current.id === 'nationality' && (
              <div className="space-y-3">
                {/* Region selector */}
                <div className="flex flex-wrap gap-2">
                  {regionOrder.map((region) => {
                    const list = groupedNationalities[region] || [];
                    if (list.length === 0) return null;
                    const active = openRegion === region;
                    return (
                      <button
                        key={region}
                        onClick={() => setOpenRegion(active ? null : region)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-slate-50'}`}
                      >
                        {region}
                      </button>
                    );
                  })}
                  <button
                    key="No preference"
                    onClick={() => { setAnswersV2({ ...answersV2, nationality: 'No preference' as any }); setOpenRegion(null); }}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${answersV2.nationality === 'No preference' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-slate-50'}`}
                  >
                    No preference
                  </button>
                </div>

                {/* Selected nationality chip + importance */}
                {answersV2.nationality && answersV2.nationality !== 'No preference' && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                    <div>
                      <span className="mr-2">Selected:</span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-blue-800">
                        {countryToFlag(answersV2.nationality) ? (
                          <span aria-hidden className="text-base">{countryToFlag(answersV2.nationality)}</span>
                        ) : null}
                        <span className="font-medium">{answersV2.nationality}</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600">Importance:</span>
                        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                          {(['low','medium','high'] as const).map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => setAnswersV2({ ...answersV2, nationalityImportance: lvl })}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                                answersV2.nationalityImportance === lvl
                                  ? lvl === 'low'
                                    ? 'bg-green-600 text-white shadow'
                                    : lvl === 'medium'
                                    ? 'bg-amber-500 text-white shadow'
                                    : 'bg-rose-600 text-white shadow'
                                  : 'text-slate-700 hover:bg-white'
                              }`}
                              aria-pressed={answersV2.nationalityImportance === lvl}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Higher importance increases how strongly nationality affects your top teams.
                      </div>
                    </div>
                  </div>
                )}

                {/* Popular players under selected chip */}
                {answersV2.nationality && answersV2.nationality !== 'No preference' && nationalityPlayers.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60">
                    <div className="px-3 py-2 text-xs font-semibold text-blue-800 border-b border-blue-100">Popular players from {answersV2.nationality}:</div>
                    <ul className="divide-y divide-blue-100 bg-white/90">
                      {nationalityPlayers.map((p, idx) => (
                        <li key={`${p.player}-${idx}`} className="px-3 py-2 grid grid-cols-1 md:grid-cols-2 items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-900">{p.player}</span>
                          <span className="justify-self-start md:justify-self-end rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700">{p.team}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dropdown countries for selected region */}
                {openRegion && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">{openRegion}</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {(groupedNationalities[openRegion] || []).map((n) => {
                        const flag = countryToFlag(n);
                        return (
                          <button
                            key={n}
                            onClick={() => setAnswersV2({ ...answersV2, nationality: n as any })}
                        className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${answersV2.nationality === n ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                          >
                            {flag ? <span aria-hidden className="text-base">{flag}</span> : null}
                            <span>{n}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
              </div>
            )}

            {current.id === 'tier' && (
              <div className="space-y-2">
                {[
                  'Title contender',
                  'Playoff team',
                  'Rebuilding with young stars',
                  'Defense-first team',
                  'Bottom tier',
                ].map((label) => (
                  <button
                    key={label}
                    onClick={() => setAnswersV2({ ...answersV2, tierPref: label as any })}
                    className={`w-full text-left p-4 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${answersV2.tierPref === label ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                  >
                    <div className="font-semibold text-slate-900 mb-1">{label}</div>
                    <div className="text-sm text-slate-600">
                      {label === 'Title contender' && 'Built to win now; elite watchability'}
                      {label === 'Playoff team' && 'Consistently competitive; fun regular-season slate'}
                      {label === 'Rebuilding with young stars' && 'Youth movement; rising talent and upside'}
                      {label === 'Defense-first team' && 'Identity rooted in stops, physicality, and grit'}
                      {label === 'Bottom tier' && 'Patience project; quirky fun, low expectations'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            {step >= (quizSteps as any).length - 1 && (
              <button
                onClick={async () => {
                  setComputing(true);
                  try {
                    let computed = calculateQuizMatchV2(answersV2, teams, clubs) as any[];
                    // Ensure each result has a placeholder narrativeSummary to avoid missing paragraphs
                    computed = computed.map((r: any) => ({ ...r, narrativeSummary: r.narrativeSummary || '' }));
                    if (nationalityTeamsShort.size > 0) {
                      computed = computed
                        .map((r) => ({
                          ...r,
                          matchPercent: Math.min(99, r.matchPercent + (nationalityTeamsShort.has(r.name) ? 5 : 0)),
                          reasons: Array.from(new Set([...(r.reasons || []), `Players from ${answersV2.nationality}`])).slice(0, 4)
                        }))
                        .sort((a, b) => b.matchPercent - a.matchPercent);
                    }
                    onResults(computed);
                    // Stream quiz narrative for ALL 6 (batched 3+3 to keep responses snappy)
                    try {
                      const batches = [computed.slice(0, 3), computed.slice(3, 6)];
                      for (let b = 0; b < batches.length; b++) {
                        const batch = batches[b];
                        if (batch.length === 0) continue;
                        let buffer = '';
                        await generateQuizNarrative(
                          batch.map((e: any) => ({ name: e.name, headline: e.headline, reasons: e.reasons, catch: e.catch })),
                          answersV2,
                          (chunk: string) => {
                            buffer += chunk
                            const parts = buffer.split(/\n\n+/).slice(0, 3)
                            onResults(((prev: any[]) => {
                              if (!Array.isArray(prev)) return prev
                              const next = [...prev]
                              parts.forEach((p, i) => {
                                const globalIndex = b * 3 + i
                                if (next[globalIndex]) next[globalIndex] = { ...next[globalIndex], narrativeSummary: p }
                              })
                              return next
                            }) as any)
                          }
                        );
                      }
                    } catch {}
                    // Fallback: synthesize minimal text if any narrative still missing
                    onResults(((prev: any[]) => {
                      if (!Array.isArray(prev)) return prev
                      const next = prev.map((r: any) => {
                        if (r && !r.narrativeSummary) {
                          const stars = Array.isArray(r.stars) ? r.stars : String(r.stars || '').split(/,\s*/).filter(Boolean)
                          const parts: string[] = []
                          if (r.headline) parts.push(String(r.headline))
                          if (Array.isArray(r.reasons) && r.reasons.length) parts.push(r.reasons.slice(0, 2).join('; '))
                          if (stars.length) parts.push('Stars: ' + stars.slice(0, 3).join(', '))
                          return { ...r, narrativeSummary: parts.filter(Boolean).join('\n') || 'Strong stylistic fit and watchable slate.' }
                        }
                        return r
                      })
                      return next
                    }) as any)
                    try {
                      const payload = { answers: answersV2, results: computed, ts: Date.now() } as any;
                      localStorage.setItem('quizResults', JSON.stringify(payload));
                    } catch {}
                  } finally {
                    setComputing(false);
                  }
                }}
                className={`ml-auto bg-blue-600 text-white py-3 px-5 rounded-lg font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${computing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                disabled={computing}
              >
                {computing ? 'Computing…' : 'Show My Results'}
              </button>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}


