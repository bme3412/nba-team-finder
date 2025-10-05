"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FootballClubsMap, TeamsMap } from "../lib/types";
import { enrichMatchesWithNarrative, rankTeamsFromSources } from "../lib/match";
import { generateTeamNarrative } from "../lib/ai";

/**
 * Drop‑in page that:
 *  - Bolds team & player names inside the narrative paragraph (no dangerouslySetInnerHTML)
 *  - Renders a single promo line under the paragraph: "Live window · Style · Stars"
 *  - Keeps your selection flow intact
 */

export default function TeamMatcherPage() {
  const [teams, setTeams] = useState<TeamsMap | null>(null);
  const [footballClubMappings, setFootballClubMappings] = useState<FootballClubsMap | null>(null);
  const [leagueMaps, setLeagueMaps] = useState<{ nfl?: FootballClubsMap; mlb?: FootballClubsMap; nhl?: FootballClubsMap; f1?: FootballClubsMap }>({});

  // Lazy-load large JSON maps after first paint to reduce navigation latency
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [teamsMod, footballMod, nflMod, mlbMod, nhlMod, f1Mod] = await Promise.all([
          import("../../data/teams.json"),
          import("../../data/footballClubs.json"),
          import("../../data/nflTeams.json"),
          import("../../data/mlbTeams.json"),
          import("../../data/nhlTeams.json"),
          import("../../data/f1Teams.json"),
        ]);
        if (!mounted) return;
        setTeams(teamsMod.default as TeamsMap);
        setFootballClubMappings(footballMod.default as FootballClubsMap);
        setLeagueMaps({
          nfl: nflMod.default as unknown as FootballClubsMap,
          mlb: mlbMod.default as unknown as FootballClubsMap,
          nhl: nhlMod.default as unknown as FootballClubsMap,
          f1: f1Mod.default as unknown as FootballClubsMap,
        });
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const mergedTeamsMap: FootballClubsMap | null = useMemo(() => {
    if (!footballClubMappings) return null;
    const unwrap = (m: any): FootballClubsMap => (m && m.MLB && m.MLB.teams) ? (m.MLB.teams as FootballClubsMap) : (m as FootballClubsMap || {} as FootballClubsMap);
    return {
      ...footballClubMappings,
      ...(leagueMaps.nfl || {}),
      ...unwrap(leagueMaps.mlb || {}),
      ...(leagueMaps.nhl || {}),
      ...(leagueMaps.f1 || {}),
    } as FootballClubsMap;
  }, [footballClubMappings, leagueMaps]);

  
  const [selectedExistingTeams, setSelectedExistingTeams] = useState<string[]>([]);
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<any[] | null>(null);
  const [streaming, setStreaming] = useState(false);

  const formatList = (list: string[]) => {
    if (!list || list.length === 0) return "";
    if (list.length === 1) return list[0];
    if (list.length === 2) return `${list[0]} and ${list[1]}`;
    return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("selectedExistingTeams");
      if (saved) setSelectedExistingTeams(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("selectedExistingTeams", JSON.stringify(selectedExistingTeams));
    } catch {}
  }, [selectedExistingTeams]);

  const leagueDefs = useMemo(() => {
    const unwrap = (m: any): FootballClubsMap => (m && m.MLB && m.MLB.teams) ? (m.MLB.teams as FootballClubsMap) : (m as FootballClubsMap || {} as FootballClubsMap);
    return [
      { key: "soccer", label: "Soccer / Football", map: footballClubMappings || {} as FootballClubsMap },
      { key: "NFL", label: "NFL", map: (leagueMaps.nfl || {}) as FootballClubsMap },
      { key: "MLB", label: "MLB", map: unwrap(leagueMaps.mlb || {}) as FootballClubsMap },
      { key: "NHL", label: "NHL", map: (leagueMaps.nhl || {}) as FootballClubsMap },
      { key: "F1", label: "F1", map: (leagueMaps.f1 || {}) as FootballClubsMap },
    ];
  }, [footballClubMappings, leagueMaps]);

  const toggleLeague = (key: string) => setExpandedLeagues((p) => ({ ...p, [key]: !p[key] }));

  const showMatches = async () => {
    if (selectedExistingTeams.length === 0) return;
    if (!teams || !mergedTeamsMap) return;
    setStreaming(true);
    const ranked = rankTeamsFromSources(selectedExistingTeams, mergedTeamsMap, teams);
    const enriched = enrichMatchesWithNarrative(ranked, selectedExistingTeams, teams, mergedTeamsMap);
    setResults(enriched);

    try {
      let buffer = "";
      const paragraphs = await generateTeamNarrative(
        enriched.map((e: any) => ({ name: e.name, headline: e.headline, reasons: e.reasons, catch: e.catch })),
        selectedExistingTeams,
        (chunk: string) => {
          buffer += chunk;
          const parts = buffer.split(/\n\n+/).slice(0, 3);
          setResults((prev) => {
            if (!prev) return prev;
            const next = [...prev];
            parts.forEach((p, i) => { if (next[i]) next[i] = { ...next[i], narrativeSummary: p }; });
            return next;
          });
        }
      );
      if (paragraphs) enriched.forEach((e: any, i: number) => (e.narrativeSummary = paragraphs[i] || e.narrativeSummary));
    } catch {}

    setResults(enriched);
    setStreaming(false);
  };

  // ===== Results View =====
  if (results) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-4">
        <div className="mx-auto w-full max-w-4xl">
          <button onClick={() => setResults(null)} className="group mb-6 inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" /> Back
          </button>

          <header className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Your Top Matches</h1>
            {selectedExistingTeams.length > 0 && (
              <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
                Based on your fandom for <span className="font-medium text-slate-900">{formatList(selectedExistingTeams)}</span>, you might like these NBA teams:
              </p>
            )}
          </header>

          <ol className="space-y-5">
            {results.map((team: any, index: number) => (
              <MatchCard key={team.name} team={team} index={index} streaming={streaming} />
            ))}
          </ol>

          <div className="mt-8">
            <button onClick={() => setResults(null)} className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">Start Over</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Selection View =====
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <a href="/" className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900"><ChevronLeft className="h-5 w-5" /> Back</a>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Select favorite teams in other sports</h2>
              <p className="text-slate-600">Pick a league, then choose teams—we'll find your NBA match.</p>
            </div>
              <button
                onClick={showMatches}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedExistingTeams.length === 0 || !teams || !mergedTeamsMap}
              >
              Show Top Matches
            </button>
          </div>

          {selectedExistingTeams.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedExistingTeams.map((t) => (
                <span key={t} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {t}
                  <button aria-label={`Remove ${t}`} onClick={() => setSelectedExistingTeams((prev) => prev.filter((x) => x !== t))} className="text-blue-600 hover:text-blue-800">×</button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {leagueDefs.map(({ key, label, map }) => {
              const names = Object.keys(map || {}).sort((a, b) => a.localeCompare(b));
              const visible = expandedLeagues[key] === true;
              return (
                <section key={key} className="overflow-hidden rounded-xl border border-slate-200">
                  <button onClick={() => toggleLeague(key)} className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left">
                    <span className="font-semibold text-slate-900">{label}</span>
                    <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${visible ? "rotate-90" : ""}`} />
                  </button>
                  {visible && (
                    <div className="px-4 pb-4">
                      {!map || names.length === 0 ? (
                        <div className="py-6 text-sm text-slate-500">Loading…</div>
                      ) : (
                        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto md:grid-cols-3">
                          {names.slice(0, 300).map((club) => {
                              const selected = selectedExistingTeams.includes(club);
                              return (
                                <button
                                  key={club}
                                  onClick={() => setSelectedExistingTeams((prev) => (prev.includes(club) ? prev.filter((x) => x !== club) : [...prev, club]))}
                                  className={`rounded-lg border p-3 text-left text-sm font-medium transition-all ${selected ? "border-blue-500 bg-blue-50 text-slate-900" : "border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-slate-50"}`}
                                >
                                  {club}
                                  {selected && <span className="ml-2 text-blue-600">✓</span>}
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============== Presentation Components ==================

function MatchCard({ team, index, streaming }: { team: any; index: number; streaming: boolean }) {
  const accents = [
    { ring: "bg-blue-600", chip: "bg-blue-50 text-blue-700 border-blue-200", leftBar: "border-blue-400", grad: "from-blue-50" },
    { ring: "bg-violet-600", chip: "bg-violet-50 text-violet-700 border-violet-200", leftBar: "border-violet-400", grad: "from-violet-50" },
    { ring: "bg-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200", leftBar: "border-amber-400", grad: "from-amber-50" },
  ];
  const tone = accents[index % accents.length];

  const starNames: string[] = Array.isArray(team.stars)
    ? team.stars
    : team.stars
    ? String(team.stars).split(/,\s*/)
    : [];
  const toHighlight = [team.name, ...starNames].filter(Boolean);

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-full ${tone.ring} text-white font-bold`}>{index + 1}</div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{team.name}</h2>
            {team.titleLabel && <span className={`mt-1 inline-block rounded border px-2 py-0.5 text-xs font-semibold ${tone.chip}`}>{team.titleLabel}</span>}
          </div>
        </div>
        {team.matchPercent && (
          <span className="ml-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">{team.matchPercent}% match</span>
        )}
      </div>

      <div className={`relative rounded-xl border ${tone.leftBar} border-l-4 bg-gradient-to-br ${tone.grad} to-white p-5`}>
        {team.narrativeSummary ? (
          <p className="mx-auto max-w-2xl text-[15px] leading-7 text-slate-800">
            <HighlightedText text={team.narrativeSummary} terms={toHighlight} />
          </p>
        ) : (
          <SkeletonParagraph streaming={streaming} />
        )}
      </div>

      <PromoLine teamName={team.name} viewingTimes={team.viewingTimes} styleHook={team.style} stars={starNames} />
    </li>
  );
}

function PromoLine({ teamName, viewingTimes, styleHook, stars }: { teamName?: string; viewingTimes?: string; styleHook?: string; stars?: string[] }) {
  if (!teamName && !viewingTimes && !styleHook && (!stars || stars.length === 0)) return null;

  const bits: React.ReactNode[] = [];
  if (teamName) bits.push(<strong key="tn">{teamName}</strong>);
  if (viewingTimes) bits.push(<span key="vw">Live window: <strong>{viewingTimes}</strong></span>);
  if (styleHook) bits.push(<span key="st">{styleHook}</span>);
  if (stars && stars.length) bits.push(<span key="sr">Stars: <strong>{stars.join(", ")}</strong></span>);

  return (
    <p className="mt-3 text-[13.5px] leading-6 text-slate-700">
      {bits.map((node, i) => (
        <React.Fragment key={i}>
          {node}
          {i < bits.length - 1 ? " · " : null}
        </React.Fragment>
      ))}
    </p>
  );
}

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
    const v2 = v1.replace(/é|è|ê/g, "e"); // mild fallback for Latin accents
    variants.push(v1, v2);
  }
  const uniq = Array.from(new Set(variants.filter(Boolean)));
  const source = uniq.map((t) => escapeRegExp(t)).join("|");
  return new RegExp(`(${source})`, "gi");
}
function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  if (!text || !terms || terms.length === 0) return <>{text}</>;
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

function Chip({ label, tone = "neutral", emphasis = false }: { label: string; tone?: "neutral" | "primary"; emphasis?: boolean }) {
  const base = tone === "primary" ? "bg-blue-50 text-blue-700 border-blue-200" : emphasis ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200";
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${base}`}>{label}</span>;
}
function SkeletonParagraph({ streaming }: { streaming: boolean }) {
  return (
    <div className="space-y-2">
      <div className="h-3.5 w-11/12 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-10/12 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-9/12 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-200" />
    </div>
  );
}
