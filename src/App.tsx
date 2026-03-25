/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Calendar, Users, Plus, Trash2, Award, ChevronRight, X, ShieldCheck, Settings, LayoutDashboard, UserPlus, AlertCircle, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchReportForm } from './components/MatchReportForm';
import { ScorerTable } from './components/ScorerTable';
import { AssistTable } from './components/AssistTable';
import { StandingsTable } from './components/StandingsTable';
import { ClubsPage } from './components/ClubsPage';
import { PublicTournamentView } from './components/PublicTournamentView';
import { ConfirmModal } from './components/ConfirmModal';
import { supabase, fetchTournaments, saveTournament, saveMatches, saveTournamentTeams, updateMatchScoreDB, saveMatchEventDB, deleteMatchEventDB, saveTeamDB, deleteTeamDB, savePlayerDB, updatePlayerDB, deletePlayerDB } from './utils/supabase';
import { GroupTournaments } from './components/GroupTournaments';

type TournamentType = 'league' | 'knockout';
type EventType = 'gol' | 'assist';
type TournamentStatus = 'attivo' | 'nascosto' | 'concluso';

interface Tournament { id: string; name: string; type: TournamentType; maxTeams: number; status: TournamentStatus; logoUrl?: string; }
interface Team { id: string; name: string; logoUrl?: string; colors?: string; }
interface TournamentTeam { tournamentId: string; teamId: string; }
interface Player { id: string; teamId: string; name: string; number: number; playerExternalId: string; }
interface Match { id: string; tournamentId: string; teamAId: string | null; teamBId: string | null; scoreA: number; scoreB: number; status: 'scheduled' | 'finished'; round: number; matchType: 'league_match' | 'bracket_match'; isReturnMatch: boolean; nextMatchId?: string; positionInRound?: number; }
interface MatchEvent { id: string; matchId: string; playerId: string; type: EventType; }

export default function App() {
  return (
    <Routes>
      <Route path="/public/:tournamentId" element={<PublicTournamentView />} />
      <Route path="*" element={<PrivateApp />} />
    </Routes>
  );
}

function PrivateApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<'home' | 'setup' | 'teams' | 'roster' | 'dashboard' | 'clubs' | 'gironi'>('home');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'scorers' | 'assists' | 'bracket'>('matches');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isReplaceTeamOpen, setIsReplaceTeamOpen] = useState(false);
  const [replaceOldTeamId, setReplaceOldTeamId] = useState('');
  const [replaceNewTeamId, setReplaceNewTeamId] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [leagueMatchMode, setLeagueMatchMode] = useState<'andata' | 'andata_ritorno'>('andata_ritorno');
  const leagueMatchModeRef = React.useRef<'andata' | 'andata_ritorno'>('andata_ritorno');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) loadUserData(); }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const [clubsDataResponse, tournamentsData, playersDataResponse] = await Promise.all([
        supabase.from('teams').select('*'),
        fetchTournaments(user.id),
        supabase.from('players').select('*')
      ]);
      if (clubsDataResponse.data) setTeams(clubsDataResponse.data.map((t: any) => ({ id: t.id, name: t.name || t.nome || t.club_name || "Squadra senza nome", logoUrl: t.logo_url || "", colors: t.colors || [] })));
      if (tournamentsData) setTournaments(tournamentsData.map((t: any) => ({ id: t.id, name: t.name, type: t.type, maxTeams: t.max_teams, status: t.status, logoUrl: t.logo_url })));
      if (playersDataResponse.data) setPlayers(playersDataResponse.data.map((p: any) => ({ id: p.id, teamId: p.team_id, name: p.name, number: p.number, playerExternalId: p.player_external_id })));
    } catch (error) { console.error('Failed to load user data:', error); }
  };

  const loadTournamentDetails = async (tournamentId: string) => {
    try {
      const { data: ttData } = await supabase.from('tournament_teams').select('*').eq('tournament_id', tournamentId);
      if (ttData) setTournamentTeams(prev => [...prev.filter(tt => tt.tournamentId !== tournamentId), ...ttData.map((tt: any) => ({ tournamentId: tt.tournament_id, teamId: tt.club_id }))]);
      const { data: matchesData } = await supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('round', { ascending: true });
      if (matchesData) {
        setMatches(prev => [...prev.filter(m => m.tournamentId !== tournamentId), ...matchesData.map((m: any) => ({ id: m.id, tournamentId: m.tournament_id, teamAId: m.team_a_id, teamBId: m.team_b_id, scoreA: m.score_a, scoreB: m.score_b, status: m.status, round: m.round, matchType: m.match_type, isReturnMatch: m.is_return_match, nextMatchId: m.next_match_id, positionInRound: m.position_in_round }))]);
        const matchIds = matchesData.map((m: any) => m.id);
        if (matchIds.length > 0) {
          const { data: eventsData } = await supabase.from('match_events').select('*').in('match_id', matchIds);
          if (eventsData) setEvents(prev => [...prev.filter(e => !matchIds.includes(e.matchId)), ...eventsData.map((e: any) => ({ id: e.id, matchId: e.match_id, playerId: e.player_id, type: e.event_type }))]);
        }
      }
    } catch (error) { console.error('Failed to load tournament details:', error); }
  };

  const tournament = useMemo(() => tournaments.find(t => t.id === activeTournamentId), [tournaments, activeTournamentId]);
  const currentTournamentTeams = useMemo(() => { const teamIds = tournamentTeams.filter(tt => tt.tournamentId === activeTournamentId).map(tt => tt.teamId); return teams.filter(t => teamIds.includes(t.id)); }, [teams, tournamentTeams, activeTournamentId]);

  const handleCreateTournament = async (name: string, type: TournamentType, maxTeams: number, logoUrl?: string, matchMode: 'andata' | 'andata_ritorno' = 'andata_ritorno') => {
    if (!user) return;
    try {
      const savedTournament = await saveTournament({ name, type, max_teams: maxTeams, status: 'attivo', user_id: user.id, logo_url: logoUrl || null });
      const newTournament: Tournament = { id: savedTournament.id, name: savedTournament.name, type: savedTournament.type as TournamentType, maxTeams: savedTournament.max_teams, status: savedTournament.status as TournamentStatus, logoUrl: savedTournament.logo_url };
      setTournaments([...tournaments, newTournament]);
      setActiveTournamentId(newTournament.id);
      setLeagueMatchMode(matchMode);
      leagueMatchModeRef.current = matchMode;
      setView('teams');
      setActiveTab(type === 'knockout' ? 'bracket' : 'matches');
    } catch (error) { alert('Errore nella creazione del torneo.'); }
  };

  const addTeamToTournament = (teamId: string) => {
    if (!activeTournamentId) return;
    if (tournamentTeams.some(tt => tt.tournamentId === activeTournamentId && tt.teamId === teamId)) return;
    setTournamentTeams([...tournamentTeams, { tournamentId: activeTournamentId, teamId }]);
  };

  const createAndAddTeam = async (teamData: { name: string; logoUrl?: string; colors?: string }) => {
    if (!user) return;
    try {
      const savedTeam = await saveTeamDB({ ...teamData, user_id: user.id });
      const newTeam: Team = { id: savedTeam.id, name: savedTeam.name, logoUrl: savedTeam.logo_url, colors: savedTeam.colors };
      setTeams([...teams, newTeam]);
      addTeamToTournament(newTeam.id);
    } catch (error) { console.error('Error quick-creating team:', error); }
  };

  const removeTeamFromTournament = (teamId: string) => { setTournamentTeams(tournamentTeams.filter(tt => !(tt.tournamentId === activeTournamentId && tt.teamId === teamId))); };

  const generateLeagueCalendar = (currentTeams: Team[], matchMode: 'andata' | 'andata_ritorno'): Match[] => {
    const newMatches: Match[] = [];
    const teamIds = currentTeams.map(t => t.id);
    if (teamIds.length % 2 !== 0) teamIds.push('BYE');
    const numTeams = teamIds.length;
    const roundsPerLeg = numTeams - 1;
    const legs = matchMode === 'andata' ? 1 : 2;
    for (let leg = 0; leg < legs; leg++) {
      for (let r = 0; r < roundsPerLeg; r++) {
        const roundNumber = leg === 0 ? r + 1 : roundsPerLeg + r + 1;
        for (let i = 0; i < numTeams / 2; i++) {
          const teamA = teamIds[i]; const teamB = teamIds[numTeams - 1 - i];
          if (teamA !== 'BYE' && teamB !== 'BYE') {
            newMatches.push({ id: '', tournamentId: activeTournamentId!, teamAId: leg === 0 ? teamA : teamB, teamBId: leg === 0 ? teamB : teamA, scoreA: 0, scoreB: 0, status: 'scheduled', round: roundNumber, matchType: 'league_match', isReturnMatch: leg === 1 });
          }
        }
        teamIds.splice(1, 0, teamIds.pop()!);
      }
    }
    return newMatches;
  };

  const generateCalendar = async (teamsToUse?: Team[], manualMatchups?: {teamA: Team, teamB: Team}[], forcedMatchMode?: 'andata' | 'andata_ritorno') => {
    if (!tournament || activeTournamentId === null) return;
    const currentTeams = teamsToUse || currentTournamentTeams;
    if (currentTeams.length < 2) return;
    if (teamsToUse) {
      setTeams(prev => { const existingIds = new Set(prev.map(t => t.id)); return [...prev, ...teamsToUse.filter(t => !existingIds.has(t.id))]; });
      setTournamentTeams(prev => [...prev.filter(tt => tt.tournamentId !== activeTournamentId), ...teamsToUse.map(t => ({ tournamentId: activeTournamentId!, teamId: t.id }))]);
    }
    try {
      await saveTournamentTeams(activeTournamentId, currentTeams.map(t => t.id), user.id);
      if (tournament.type === 'league') {
        const modeToUse = forcedMatchMode || leagueMatchModeRef.current;
        const newMatches = generateLeagueCalendar(currentTeams, modeToUse);
        await saveMatches(newMatches.map(m => ({ tournament_id: m.tournamentId, team_a_id: m.teamAId, team_b_id: m.teamBId, score_a: m.scoreA, score_b: m.scoreB, round: m.round, match_type: m.matchType, is_return_match: m.isReturnMatch, status: m.status, next_match_id: null, position_in_round: m.positionInRound, user_id: user.id })));
        await loadTournamentDetails(activeTournamentId!);
      } else {
        const numTeams = currentTeams.length;
        let bracketSize = 2;
        while (bracketSize < numTeams) bracketSize *= 2;
        const rounds: { round: number, count: number }[] = [];
        let r = 2;
        while (r <= bracketSize) { rounds.push({ round: r, count: r / 2 }); r *= 2; }
        const savedRounds: { round: number, matches: any[] }[] = [];
        for (const roundInfo of rounds) {
          const saved = await saveMatches(Array.from({ length: roundInfo.count }, (_, i) => ({ tournament_id: activeTournamentId, team_a_id: null, team_b_id: null, score_a: 0, score_b: 0, round: roundInfo.round, match_type: 'bracket_match', is_return_match: false, status: 'scheduled', next_match_id: null, position_in_round: i, user_id: user.id })));
          savedRounds.push({ round: roundInfo.round, matches: saved });
        }
        const reversedRounds = [...savedRounds].reverse();
        for (let i = 0; i < reversedRounds.length - 1; i++) {
          const cur = reversedRounds[i]; const nxt = reversedRounds[i + 1];
          for (let j = 0; j < cur.matches.length; j++) {
            const nextMatch = nxt.matches[Math.floor(j / 2)];
            await supabase.from('matches').update({ next_match_id: nextMatch.id }).eq('id', cur.matches[j].id);
            cur.matches[j].next_match_id = nextMatch.id;
          }
        }
        const firstRound = reversedRounds[0];
        if (manualMatchups && manualMatchups.length > 0) {
          for (let i = 0; i < manualMatchups.length; i++) {
            await supabase.from('matches').update({ team_a_id: manualMatchups[i].teamA.id, team_b_id: manualMatchups[i].teamB.id }).eq('id', firstRound.matches[i].id);
          }
        } else {
          const shuffled = [...currentTeams].sort(() => Math.random() - 0.5);
          for (let i = 0; i < shuffled.length; i++) {
            const mi = Math.floor(i / 2); const isB = i % 2 !== 0; const mid = firstRound.matches[mi].id;
            if (isB) await supabase.from('matches').update({ team_b_id: shuffled[i].id }).eq('id', mid);
            else await supabase.from('matches').update({ team_a_id: shuffled[i].id }).eq('id', mid);
          }
        }
        await loadTournamentDetails(activeTournamentId!);
      }
      setView('roster');
    } catch (error: any) { alert('Errore: ' + (error?.message || JSON.stringify(error))); }
  };

  const updateTournamentStatus = (id: string, status: TournamentStatus) => { setTournaments(tournaments.map(t => t.id === id ? { ...t, status } : t)); };

  const deleteTournament = async (id: string) => {
    if (!window.confirm("Confermi la cancellazione definitiva del torneo?")) return;
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) { alert("Errore: " + error.message); return; }
      setTournaments(prev => prev.filter(t => t.id !== id));
      alert("Torneo eliminato!");
    } catch (err: any) { alert("Errore: " + err.message); }
  };

  const replaceTeamInTournament = async (oldTeamId: string, newTeamId: string) => {
    if (!activeTournamentId) return;
    try {
      await supabase.from('tournament_teams').update({ club_id: newTeamId }).eq('tournament_id', activeTournamentId).eq('club_id', oldTeamId);
      await supabase.from('matches').update({ team_a_id: newTeamId }).eq('tournament_id', activeTournamentId).eq('team_a_id', oldTeamId);
      await supabase.from('matches').update({ team_b_id: newTeamId }).eq('tournament_id', activeTournamentId).eq('team_b_id', oldTeamId);
      setTournamentTeams(prev => prev.map(tt => tt.tournamentId === activeTournamentId && tt.teamId === oldTeamId ? { ...tt, teamId: newTeamId } : tt));
      setMatches(prev => prev.map(m => { if (m.tournamentId !== activeTournamentId) return m; return { ...m, teamAId: m.teamAId === oldTeamId ? newTeamId : m.teamAId, teamBId: m.teamBId === oldTeamId ? newTeamId : m.teamBId }; }));
      alert('Squadra sostituita!'); setIsReplaceTeamOpen(false);
    } catch (error: any) { alert('Errore: ' + error.message); }
  };

  const addPlayer = (teamId: string, name: string, number: number, playerExternalId: string) => {
    if (!name || !playerExternalId) return;
    setPlayers([...players, { id: Math.random().toString(36).substr(2, 9), teamId, name, number, playerExternalId }]);
  };
  const updatePlayer = (id: string, updates: Partial<Player>) => { setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p)); };
  const removePlayer = (id: string) => {
    const pt = players.find(p => p.id === id);
    const hasGoals = events.some(e => e.playerId === id && e.type === 'gol');
    setConfirmModal({ isOpen: true, title: 'Elimina Giocatore', message: hasGoals ? `${pt?.name} ha segnato dei gol. Eliminare comunque?` : `Eliminare "${pt?.name}"?`, onConfirm: () => { setPlayers(players.filter(p => p.id !== id)); } });
  };

  const addMatchEvent = async (matchId: string, playerId: string, type: EventType) => {
    const match = matches.find(m => m.id === matchId); if (!match) return;
    const player = players.find(p => p.id === playerId); if (!player) return;
    const isTeamA = player.teamId === match.teamAId;
    const currentGoals = events.filter(e => e.matchId === matchId && e.type === 'gol' && players.find(p => p.id === e.playerId)?.teamId === player.teamId).length;
    if (type === 'gol' && currentGoals >= (isTeamA ? match.scoreA : match.scoreB)) { alert(`Hai già assegnato tutti i gol per questa squadra.`); return; }
    try {
      const se = await saveMatchEventDB({ match_id: matchId, player_id: playerId, event_type: type });
      setEvents([...events, { id: se.id, matchId: se.match_id, playerId: se.player_id, type: se.event_type as EventType }]);
    } catch (error) { console.error('Error adding match event:', error); }
  };

  const removeMatchEvent = async (id: string) => {
    try { await deleteMatchEventDB(id); setEvents(events.filter(e => e.id !== id)); }
    catch (error) { console.error('Error removing match event:', error); }
  };

  const resetMatch = async (matchId: string) => {
    try {
      for (const event of events.filter(e => e.matchId === matchId)) await supabase.from('match_events').delete().eq('id', event.id);
      await supabase.from('matches').update({ score_a: 0, score_b: 0, status: 'scheduled' }).eq('id', matchId);
      setEvents(events.filter(e => e.matchId !== matchId));
      setMatches(matches.map(m => m.id === matchId ? { ...m, scoreA: 0, scoreB: 0, status: 'scheduled' } : m));
    } catch (error) { console.error('Error resetting match:', error); }
  };

  const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number) => {
    try {
      await updateMatchScoreDB(matchId, scoreA, scoreB);
      const um = matches.map(m => m.id === matchId ? { ...m, scoreA, scoreB, status: 'finished' as const } : m);
      if (tournament?.type === 'knockout') {
        const match = um.find(m => m.id === matchId);
        if (match && match.nextMatchId) {
          const winnerId = scoreA > scoreB ? match.teamAId : scoreB > scoreA ? match.teamBId : null;
          if (winnerId) {
            const ni = um.findIndex(m => m.id === match.nextMatchId);
            if (ni !== -1) {
              const isB = (match.positionInRound || 0) % 2 !== 0;
              const unm = { ...um[ni], teamAId: isB ? um[ni].teamAId : winnerId, teamBId: isB ? winnerId : um[ni].teamBId };
              um[ni] = unm;
              await supabase.from('matches').update({ team_a_id: unm.teamAId, team_b_id: unm.teamBId }).eq('id', unm.id);
            }
          }
        }
      }
      setMatches([...um]);
    } catch (error) { console.error('Error updating match score:', error); }
  };

  const standings = useMemo(() => {
    const stats: Record<string, any> = {};
    currentTournamentTeams.forEach(t => { stats[t.id] = { id: t.id, name: t.name, logoUrl: t.logoUrl, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    const fm = matches.filter(m => m.tournamentId === activeTournamentId && m.status === 'finished' && m.matchType === 'league_match');
    fm.forEach(m => {
      if (!m.teamAId || !m.teamBId) return;
      const sA = stats[m.teamAId]; const sB = stats[m.teamBId]; if (!sA || !sB) return;
      sA.p++; sB.p++; sA.gf += m.scoreA; sA.ga += m.scoreB; sB.gf += m.scoreB; sB.ga += m.scoreA;
      if (m.scoreA > m.scoreB) { sA.w++; sB.l++; sA.pts += 3; } else if (m.scoreB > m.scoreA) { sB.w++; sA.l++; sB.pts += 3; } else { sA.d++; sB.d++; sA.pts++; sB.pts++; }
    });
    const h2h = (a: any, b: any) => {
      let pA = 0, pB = 0, drA = 0;
      fm.filter(m => (m.teamAId === a.id && m.teamBId === b.id) || (m.teamAId === b.id && m.teamBId === a.id)).forEach(m => {
        if (m.teamAId === a.id) { drA += m.scoreA - m.scoreB; if (m.scoreA > m.scoreB) pA += 3; else if (m.scoreA === m.scoreB) { pA++; pB++; } else pB += 3; }
        else { drA += m.scoreB - m.scoreA; if (m.scoreB > m.scoreA) pA += 3; else if (m.scoreA === m.scoreB) { pA++; pB++; } else pB += 3; }
      });
      return { pA, pB, drA };
    };
    return Object.values(stats).sort((a: any, b: any) => { if (b.pts !== a.pts) return b.pts - a.pts; const h = h2h(a, b); if (h.pA !== h.pB) return h.pB - h.pA; if (h.drA !== 0) return -h.drA; return (b.gf - b.ga) - (a.gf - a.ga); });
  }, [matches, currentTournamentTeams, activeTournamentId]);

  const scorerStats = useMemo(() => {
    if (!activeTournamentId) return [];
    const ids = new Set(matches.filter(m => m.tournamentId === activeTournamentId).map(m => m.id));
    const stats: Record<string, { goals: number; name: string; team: string }> = {};
    events.filter(e => e.type === 'gol' && ids.has(e.matchId)).forEach(e => {
      const p = players.find(x => x.id === e.playerId); if (!p) return;
      if (!stats[e.playerId]) stats[e.playerId] = { goals: 0, name: p.name, team: teams.find(t => t.id === p.teamId)?.name || '', logoUrl: teams.find(t => t.id === p.teamId)?.logoUrl || '' };
      stats[e.playerId].goals++;
    });
    return Object.values(stats).sort((a, b) => b.goals - a.goals);
  }, [events, players, teams, matches, activeTournamentId]);

  const assistStats = useMemo(() => {
    if (!activeTournamentId) return [];
    const ids = new Set(matches.filter(m => m.tournamentId === activeTournamentId).map(m => m.id));
    const stats: Record<string, { assists: number; name: string; team: string }> = {};
    events.filter(e => e.type === 'assist' && ids.has(e.matchId)).forEach(e => {
      const p = players.find(x => x.id === e.playerId); if (!p) return;
      if (!stats[e.playerId]) stats[e.playerId] = { assists: 0, name: p.name, team: teams.find(t => t.id === p.teamId)?.name || '', logoUrl: teams.find(t => t.id === p.teamId)?.logoUrl || '' };
      stats[e.playerId].assists++;
    });
    return Object.values(stats).sort((a, b) => b.assists - a.assists);
  }, [events, players, teams, matches, activeTournamentId]);

  const handleShare = () => {
    if (!activeTournamentId) return;
    navigator.clipboard.writeText(`${window.location.origin}/public/${activeTournamentId}`);
    alert('Link pubblico copiato negli appunti!');
  };

  if (view === 'home') return <HomeView tournaments={tournaments} onSelect={(id: string) => { setActiveTournamentId(id); supabase.from('matches').select('match_type').eq('tournament_id', id).limit(1).then(({ data }) => { if (data && data[0]?.match_type?.startsWith('girone_')) { setView('gironi'); } else { loadTournamentDetails(id); setView('dashboard'); } }); }} onCreate={() => setView('setup')} onDelete={deleteTournament} onToggleStatus={(id: string, status: TournamentStatus) => updateTournamentStatus(id, status)} setView={setView} />;
  if (view === 'setup') return <SetupView onCreate={handleCreateTournament} onBack={() => setView('home')} />;
  if (view === 'gironi') return <GroupTournaments onBack={() => { setActiveTournamentId(null); setView('home'); }} onTournamentCreated={() => loadUserData()} existingTournamentId={activeTournamentId || undefined} />;
  if (view === 'teams') return <TeamRegistrationView tournament={tournament} teams={teams} currentTournamentTeams={currentTournamentTeams} onAddExistingTeam={(id: string) => addTeamToTournament(id)} onCreateAndAddTeam={(teamData: any) => createAndAddTeam(teamData)} onRemoveTeam={(id: string) => removeTeamFromTournament(id)} onGenerate={(t: any, m: any) => generateCalendar(t, m, leagueMatchMode)} onRefreshTeams={() => loadUserData()} />;
  if (view === 'roster') return <RosterView teams={currentTournamentTeams} players={players} onAddPlayer={addPlayer} onUpdatePlayer={updatePlayer} onRemovePlayer={removePlayer} onFinish={() => setView('dashboard')} />;
  if (view === 'clubs') return (
    <ClubsPage user={user} teams={teams} players={players}
      onAddTeam={async (td) => { if (!user) return; try { const st = await saveTeamDB({ ...td, user_id: user.id }); setTeams([...teams, { id: st.id, name: st.name, logoUrl: st.logo_url, colors: st.colors }]); } catch (e) { console.error(e); } }}
      onDeleteTeam={async (id) => { const t = teams.find(x => x.id === id); setConfirmModal({ isOpen: true, title: 'Elimina Club', message: `Eliminare "${t?.name}"?`, onConfirm: async () => { try { await deleteTeamDB(id); setTeams(teams.filter(x => x.id !== id)); setTournamentTeams(tournamentTeams.filter(tt => tt.teamId !== id)); } catch (e) { console.error(e); } } }); }}
      onAddPlayer={async (teamId, name, number, playerExternalId) => { if (!user) return; try { const p = await savePlayerDB({ team_id: teamId, name, number, player_external_id: playerExternalId, user_id: user.id }); setPlayers([...players, { id: p.id, teamId: p.team_id, name: p.name, number: p.number, playerExternalId: p.player_external_id }]); } catch (e) { console.error(e); } }}
      onUpdatePlayer={async (id, updates) => { try { const db: any = { ...updates }; if (updates.playerExternalId) { db.player_external_id = updates.playerExternalId; delete db.playerExternalId; } await updatePlayerDB(id, db); setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p)); } catch (e) { console.error(e); } }}
      onRemovePlayer={async (id) => { const p = players.find(x => x.id === id); setConfirmModal({ isOpen: true, title: 'Elimina Tesserato', message: `Eliminare "${p?.name}"?`, onConfirm: async () => { try { await deletePlayerDB(id); setPlayers(players.filter(x => x.id !== id)); } catch (e) { console.error(e); } } }); }}
      onBack={() => setView('home')} />
  );

  // Dashboard tabs
  const dashTabs = [
    { id: 'matches', icon: Calendar, label: 'Partite', show: tournament?.type === 'league' },
    { id: 'bracket', icon: LayoutDashboard, label: 'Tabellone', show: tournament?.type === 'knockout' },
    { id: 'standings', icon: Users, label: 'Classifica', show: tournament?.type === 'league' },
    { id: 'scorers', icon: Award, label: 'Marcatori', show: true },
    { id: 'assists', icon: Award, label: 'Assist', show: true },
  ].filter(t => t.show);

  return (
    <div className="min-h-screen text-slate-900 font-sans pb-20" onClick={() => setIsSettingsOpen(false)}>
      {/* NAVBAR - solo nome + share + settings */}
      <nav className="bg-slate-900 text-white px-3 py-3 sticky top-0 z-50 shadow-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setView('home')} className="bg-slate-800 p-1.5 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0">
              <LayoutDashboard className="w-4 h-4" />
            </button>
            {tournament?.logoUrl && <img src={tournament.logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover border border-slate-700 flex-shrink-0" />}
            <h1 className="font-bold text-sm tracking-tight uppercase truncate">{tournament?.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {activeTournamentId && (
              <button onClick={handleShare} className="flex items-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Condividi</span>
              </button>
            )}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50">
                    <button onClick={() => setView('roster')} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">Gestione Rose</button>
                    <button onClick={() => { setIsReplaceTeamOpen(true); setIsSettingsOpen(false); }} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">Sostituisci Squadra</button>
                    <button onClick={() => updateTournamentStatus(activeTournamentId!, tournament?.status === 'nascosto' ? 'attivo' : 'nascosto')} className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">{tournament?.status === 'nascosto' ? 'Mostra Torneo' : 'Nascondi Torneo'}</button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button onClick={() => deleteTournament(activeTournamentId!)} className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50">Elimina Torneo</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {tournament?.status === 'nascosto' && <div className="bg-amber-50 border-b border-amber-100 p-2 text-center text-[10px] font-black uppercase tracking-widest text-amber-700">Torneo nascosto al pubblico</div>}

      {/* TAB BAR FISSA IN BASSO */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 shadow-2xl">
        <div className="max-w-4xl mx-auto flex">
          {dashTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 gap-0.5 transition-all ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500'}`}>
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wide leading-tight">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-3 mt-2">
        <AnimatePresence mode="wait">
          {activeTab === 'matches' && (
            <motion.div key="matches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <select value={selectedRound ?? ''} onChange={e => setSelectedRound(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-700 text-sm outline-none shadow-sm">
                <option value="">Seleziona giornata...</option>
                {Array.from(new Set(matches.filter(m => m.tournamentId === activeTournamentId).map(m => m.round))).sort((a: number, b: number) => a - b).map(rn => {
                  const isRet = matches.filter(m => m.tournamentId === activeTournamentId && m.round === rn)[0]?.isReturnMatch;
                  return <option key={rn} value={rn}>Giornata {rn}{isRet ? ' (Ritorno)' : ''}</option>;
                })}
              </select>
              {!selectedRound && <div className="text-center py-12 text-slate-400 italic text-sm">Seleziona una giornata dal menu.</div>}
              {selectedRound && (() => {
                const rm = matches.filter(m => m.tournamentId === activeTournamentId && m.round === selectedRound);
                const isRet = rm[0]?.isReturnMatch;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-1">
                      <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600">Giornata {selectedRound}</h2>
                      <div className="h-px bg-slate-200 flex-1" />
                      {isRet && <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Ritorno</span>}
                    </div>
                    <div className="grid gap-3">
                      {rm.map(match => {
                        const tA = teams.find(t => t.id === match.teamAId); const tB = teams.find(t => t.id === match.teamBId);
                        return (
                          <div key={match.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                                <span className="font-bold text-slate-700 text-sm truncate">{tA?.name}</span>
                                {tA?.logoUrl && <img src={tA.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0 border border-slate-100" />}
                              </div>
                              <div className="flex items-center gap-2 px-2 flex-shrink-0">
                                <div className="w-10 h-10 flex items-center justify-center text-xl font-black bg-slate-50 rounded-xl border border-slate-100">{match.status === 'finished' ? match.scoreA : '-'}</div>
                                <div className="text-[9px] font-black text-slate-300 uppercase">VS</div>
                                <div className="w-10 h-10 flex items-center justify-center text-xl font-black bg-slate-50 rounded-xl border border-slate-100">{match.status === 'finished' ? match.scoreB : '-'}</div>
                              </div>
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                {tB?.logoUrl && <img src={tB.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0 border border-slate-100" />}
                                <span className="font-bold text-slate-700 text-sm truncate">{tB?.name}</span>
                              </div>
                            </div>
                            <div className="flex justify-center mt-2">
                              <button onClick={() => setSelectedMatchId(match.id)} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-600 transition-colors py-1">Referto Marcatori</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'standings' && tournament?.type === 'league' && (
            <div className="overflow-x-auto -mx-3">
              <div className="min-w-[340px] px-3">
                <StandingsTable standings={standings} />
              </div>
            </div>
          )}

          {activeTab === 'scorers' && (
            <motion.div key="scorers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <ScorerTable stats={scorerStats} />
            </motion.div>
          )}

          {activeTab === 'assists' && (
            <motion.div key="assists" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AssistTable stats={assistStats} />
            </motion.div>
          )}

          {activeTab === 'bracket' && tournament?.type === 'knockout' && (
            <motion.div key="bracket" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-x-auto pb-4 -mx-3 px-3">
              <div className="flex gap-6 min-w-max">
                {[16, 8, 4, 2].filter(r => matches.some(m => m.tournamentId === activeTournamentId && m.round === r)).sort((a, b) => b - a).map(rs => (
                  <div key={rs} className="flex flex-col gap-6">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">{rs === 2 ? 'Finale' : rs === 4 ? 'Semifinali' : rs === 8 ? 'Quarti' : 'Ottavi'}</h3>
                    <div className="flex flex-col justify-around flex-1 gap-6">
                      {matches.filter(m => m.tournamentId === activeTournamentId && m.round === rs).sort((a, b) => (a.positionInRound || 0) - (b.positionInRound || 0)).map(match => {
                        const tA = teams.find(t => t.id === match.teamAId); const tB = teams.find(t => t.id === match.teamBId);
                        return (
                          <div key={match.id} onClick={() => setSelectedMatchId(match.id)} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 w-44 cursor-pointer hover:border-indigo-400 transition-all space-y-2">
                            <div className="flex justify-between items-center"><span className={`text-xs font-bold truncate flex-1 ${match.status === 'finished' && match.scoreA > match.scoreB ? 'text-indigo-600' : 'text-slate-600'}`}>{tA?.name || '---'}</span><span className="font-black text-slate-900 ml-1 text-sm">{match.status === 'finished' ? match.scoreA : '-'}</span></div>
                            <div className="h-px bg-slate-100" />
                            <div className="flex justify-between items-center"><span className={`text-xs font-bold truncate flex-1 ${match.status === 'finished' && match.scoreB > match.scoreA ? 'text-indigo-600' : 'text-slate-600'}`}>{tB?.name || '---'}</span><span className="font-black text-slate-900 ml-1 text-sm">{match.status === 'finished' ? match.scoreB : '-'}</span></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedMatchId && <MatchReportForm match={matches.find(m => m.id === selectedMatchId)!} teams={teams} players={players} events={events.filter(e => e.matchId === selectedMatchId)} onUpdateScore={(sA, sB) => updateMatchScore(selectedMatchId, sA, sB)} onAddEvent={(pId, type) => addMatchEvent(selectedMatchId, pId, type)} onRemoveEvent={removeMatchEvent} onResetMatch={() => resetMatch(selectedMatchId!)} onClose={() => setSelectedMatchId(null)} />}
      </AnimatePresence>

      {isReplaceTeamOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-black text-slate-900">Sostituisci Squadra</h2>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Squadra da sostituire</label><select className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold text-sm" value={replaceOldTeamId} onChange={e => setReplaceOldTeamId(e.target.value)}><option value="">Scegli...</option>{currentTournamentTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nuova squadra</label><select className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold text-sm" value={replaceNewTeamId} onChange={e => setReplaceNewTeamId(e.target.value)}><option value="">Scegli...</option>{teams.filter(t => !currentTournamentTeams.find(ct => ct.id === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="flex gap-3"><button onClick={() => setIsReplaceTeamOpen(false)} className="flex-1 py-3 rounded-2xl font-black text-sm text-slate-400 bg-slate-100">Annulla</button><button disabled={!replaceOldTeamId || !replaceNewTeamId} onClick={() => replaceTeamInTournament(replaceOldTeamId, replaceNewTeamId)} className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black text-sm disabled:opacity-50">Sostituisci</button></div>
          </div>
        </div>
      )}
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} />
    </div>
  );
}

function HomeView({ tournaments, onSelect, onCreate, onDelete, onToggleStatus, setView }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isLogin) { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
      else { const { error } = await supabase.auth.signUp({ email, password }); if (error) throw error; alert("Controlla la tua email!"); }
    } catch (error: any) { alert(error.message); } finally { setLoading(false); }
  };

  if (!user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30 mb-4"><Trophy className="text-white w-8 h-8" /></div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tournament Master</h1>
          <p className="text-slate-400 font-medium text-sm">Accedi per gestire i tuoi tornei.</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label><input type="email" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label><input type="password" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button disabled={loading} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50">{loading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}</button>
        </form>
        <div className="text-center"><button onClick={() => setIsLogin(!isLogin)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">{isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}</button></div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header mobile-friendly */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bentornato!</h1>
              <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5"><ShieldCheck className="w-3 h-3 text-emerald-500" />{user.email}</p>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 font-bold text-xs transition-colors">Logout</button>
          </div>
          {/* Bottoni in griglia 2x2 su mobile */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <button onClick={() => setView('clubs')} className="bg-white text-slate-900 border border-slate-200 px-3 py-3 rounded-2xl font-black text-xs shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
              <ShieldCheck className="w-4 h-4" /> Anagrafica Club
            </button>
            <button onClick={() => setView('gironi')} className="bg-blue-600 text-white px-3 py-3 rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
              <Trophy className="w-4 h-4" /> Torneo a Gironi
            </button>
            <button onClick={onCreate} className="col-span-2 sm:col-span-1 bg-indigo-600 text-white px-3 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
              <Plus className="w-4 h-4" /> Nuovo Torneo
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {tournaments.length === 0 && <div className="col-span-full py-16 text-center space-y-4"><div className="bg-slate-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto text-slate-300"><Trophy className="w-7 h-7" /></div><p className="text-slate-400 font-medium text-sm">Nessun torneo creato.</p></div>}
          {tournaments.map((t: any) => (
            <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${t.status === 'attivo' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{t.status}</div>
                <div className="flex gap-1">
                  <button onClick={() => onToggleStatus(t.id, t.status === 'nascosto' ? 'attivo' : 'nascosto')} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><Settings className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(t.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-1">
                {t.logoUrl && <img src={t.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-slate-100" />}
                <h3 className="text-lg font-black text-slate-900 truncate">{t.name}</h3>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t.type === 'league' ? 'Campionato' : 'Eliminazione'} • {t.maxTeams} Squadre</p>
              <button onClick={() => onSelect(t.id)} className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black text-sm group-hover:bg-indigo-600 transition-colors">Gestisci Torneo</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupView({ onCreate, onBack }: { onCreate: (name: string, type: TournamentType, maxTeams: number, logoUrl?: string, matchMode?: 'andata' | 'andata_ritorno') => void, onBack: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TournamentType>('league');
  const [maxTeams, setMaxTeams] = useState(8);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [matchMode, setMatchMode] = useState<'andata' | 'andata_ritorno'>('andata_ritorno');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const img = new Image(); const reader = new FileReader();
    reader.onloadend = () => { img.src = reader.result as string; img.onload = () => { const canvas = document.createElement('canvas'); const MAX_SIZE = 200; let w = img.width, h = img.height; if (w > h) { if (w > MAX_SIZE) { h = h * MAX_SIZE / w; w = MAX_SIZE; } } else { if (h > MAX_SIZE) { w = w * MAX_SIZE / h; h = MAX_SIZE; } } canvas.width = w; canvas.height = h; canvas.getContext('2d')?.drawImage(img, 0, 0, w, h); setLogoPreview(canvas.toDataURL('image/jpeg', 0.7)); }; };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
          <h1 className="text-xl font-black text-slate-900">Crea Torneo</h1>
          <div className="w-6" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo (opzionale)</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">{logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <Trophy className="w-5 h-5 text-slate-300" />}</div>
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs px-3 py-2.5 rounded-xl transition-all">Carica<input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} /></label>
              {logoPreview && <button onClick={() => setLogoPreview(null)} className="text-red-400 text-xs font-bold">Rimuovi</button>}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Torneo</label>
            <input type="text" placeholder="Es. Champions League 2024" className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modalità</label>
              <select className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm appearance-none" value={type} onChange={e => setType(e.target.value as TournamentType)}>
                <option value="league">Campionato</option>
                <option value="knockout">Eliminazione</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Squadre</label>
              <input type="number" className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" value={maxTeams} onChange={e => setMaxTeams(parseInt(e.target.value) || 2)} />
            </div>
          </div>
          {type === 'league' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo Partite</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMatchMode('andata')} className={`p-3 rounded-2xl border-2 font-black text-xs transition-all ${matchMode === 'andata' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>➡️ Solo Andata</button>
                <button onClick={() => setMatchMode('andata_ritorno')} className={`p-3 rounded-2xl border-2 font-black text-xs transition-all ${matchMode === 'andata_ritorno' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>🔄 A/R</button>
              </div>
            </div>
          )}
          <button disabled={!name} onClick={() => onCreate(name, type, maxTeams, logoPreview || undefined, matchMode)} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Inizia Configurazione
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TeamRegistrationView({ tournament, teams: initialTeams, currentTournamentTeams, onAddExistingTeam, onCreateAndAddTeam, onRemoveTeam, onGenerate }: any) {
  const [name, setName] = useState('');
  const [localTeams, setLocalTeams] = useState(initialTeams || []);
  const [selectedTeams, setSelectedTeams] = useState<any[]>([]);
  const [drawMode, setDrawMode] = useState<'auto' | 'manual'>('auto');
  const [matchups, setMatchups] = useState<{teamA: any, teamB: any}[]>([]);
  const [showDraw, setShowDraw] = useState(false);

  useEffect(() => {
    const loadTeams = async () => {
      const { data } = await supabase.from('teams').select('*');
      if (data && data.length > 0) setLocalTeams(data.map((t: any) => ({ id: t.id, name: t.name || t.nome || t.club_name || "Squadra senza nome", logoUrl: t.logo_url || "", colors: t.colors || [] })));
    };
    loadTeams();
  }, []);

  const handleAddTeam = (teamId: string) => {
    const team = localTeams.find((t: any) => t.id === teamId);
    if (team && !selectedTeams.find((t: any) => t.id === teamId)) { setSelectedTeams([...selectedTeams, team]); onAddExistingTeam(teamId); }
  };
  const handleRemoveTeam = (teamId: string) => { setSelectedTeams(selectedTeams.filter((t: any) => t.id !== teamId)); onRemoveTeam(teamId); setShowDraw(false); setMatchups([]); };
  const canGenerate = selectedTeams.length >= 2 && selectedTeams.length === tournament.maxTeams;
  const isKnockout = tournament.type === 'knockout';
  let bracketSize = 2; while (bracketSize < selectedTeams.length) bracketSize *= 2;
  const firstRoundMatchCount = bracketSize / 2;

  const handleProceed = () => {
    if (isKnockout && drawMode === 'manual') { setMatchups(Array.from({ length: firstRoundMatchCount }, () => ({ teamA: null, teamB: null }))); setShowDraw(true); }
    else { onGenerate(selectedTeams, undefined); }
  };

  const assignTeamToSlot = (matchIdx: number, slot: 'teamA' | 'teamB', teamId: string) => {
    const team = selectedTeams.find((t: any) => t.id === teamId);
    const nm = [...matchups];
    nm.forEach((m, i) => { if (m.teamA?.id === teamId) nm[i] = { ...nm[i], teamA: null }; if (m.teamB?.id === teamId) nm[i] = { ...nm[i], teamB: null }; });
    nm[matchIdx] = { ...nm[matchIdx], [slot]: team || null };
    setMatchups(nm);
  };

  const allMatchupsFilled = matchups.length > 0 && matchups.every(m => m.teamA && m.teamB);
  const usedTeamIds = new Set(matchups.flatMap(m => [m.teamA?.id, m.teamB?.id].filter(Boolean)));

  if (showDraw && isKnockout) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDraw(false)} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400"><X className="w-5 h-5" /></button>
            <h1 className="text-xl font-black text-slate-900">Sorteggio Manuale</h1>
          </div>
          <div className="space-y-3">
            {matchups.map((matchup, idx) => (
              <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 text-center">Sfida {idx + 1}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Squadra A</label><select className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold text-sm" value={matchup.teamA?.id || ''} onChange={e => assignTeamToSlot(idx, 'teamA', e.target.value)}><option value="">Scegli...</option>{selectedTeams.filter((t: any) => !usedTeamIds.has(t.id) || matchup.teamA?.id === t.id).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                  <div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Squadra B</label><select className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold text-sm" value={matchup.teamB?.id || ''} onChange={e => assignTeamToSlot(idx, 'teamB', e.target.value)}><option value="">Scegli...</option>{selectedTeams.filter((t: any) => !usedTeamIds.has(t.id) || matchup.teamB?.id === t.id).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                </div>
              </div>
            ))}
          </div>
          <button disabled={!allMatchupsFilled} onClick={() => onGenerate(selectedTeams, matchups)} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">Genera Tabellone <ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.reload()} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400"><X className="w-5 h-5" /></button>
          <div><h1 className="text-xl font-black text-slate-900">Iscrizione Squadre</h1><p className="text-slate-400 text-xs">Max {tournament.maxTeams} squadre.</p></div>
        </div>
        <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seleziona Club</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" onChange={(e) => { if (e.target.value) { handleAddTeam(e.target.value); e.target.value = ''; } }} disabled={selectedTeams.length >= tournament.maxTeams}>
              <option value="">Scegli un club...</option>
              {localTeams.length === 0 ? <option disabled>Nessun club trovato</option> : localTeams.map((t: any) => <option key={t.id} value={t.id}>{t.name || t.club_name || "Nome mancante"}</option>)}
            </select>
          </div>
          <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div><div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-300 bg-white px-3">Oppure crea rapido</div></div>
          <div className="flex gap-2">
            <input placeholder="Nome Club" className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={name} onChange={e => setName(e.target.value)} disabled={selectedTeams.length >= tournament.maxTeams} />
            <button onClick={() => { if(name) { onCreateAndAddTeam({ name }); setName(''); } }} disabled={!name || selectedTeams.length >= tournament.maxTeams} className="bg-slate-900 text-white px-5 rounded-2xl font-black text-sm disabled:opacity-50">Crea</button>
          </div>
          <div className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Squadre ({selectedTeams.length}/{tournament.maxTeams})</h3>
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
              {selectedTeams.map((t: any) => (<div key={t.id} className="p-3 flex items-center justify-between hover:bg-white transition-colors"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-slate-400">{(t.name || '?').charAt(0)}</div><span className="font-bold text-slate-700 text-sm">{t.name}</span></div><button onClick={() => handleRemoveTeam(t.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></div>))}
              {selectedTeams.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">Nessuna squadra iscritta.</div>}
            </div>
          </div>
          {isKnockout && canGenerate && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sorteggio</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDrawMode('auto')} className={`p-3 rounded-2xl border-2 font-black text-sm transition-all ${drawMode === 'auto' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>🎲 Auto</button>
                <button onClick={() => setDrawMode('manual')} className={`p-3 rounded-2xl border-2 font-black text-sm transition-all ${drawMode === 'manual' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>✋ Manuale</button>
              </div>
            </div>
          )}
          <button disabled={!canGenerate} onClick={handleProceed} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isKnockout && drawMode === 'manual' ? 'Procedi al Sorteggio' : 'Genera Calendario'} <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RosterView({ teams, players, onAddPlayer, onUpdatePlayer, onRemovePlayer, onFinish }: any) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id);
  const [name, setName] = useState('');
  const [number, setNumber] = useState(0);
  const [playerExternalId, setPlayerExternalId] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const teamPlayers = players.filter((p: any) => p.teamId === selectedTeamId);

  return (
    <div className="min-h-screen p-4 pb-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-900">Gestione Rose</h1>
          <button onClick={onFinish} className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black text-sm">Dashboard</button>
        </div>

        {/* Selezione squadra come dropdown su mobile */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Squadra</label>
          <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm shadow-sm">
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-black text-slate-900 flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4 text-indigo-600" /> {editingPlayerId ? 'Modifica' : 'Nuovo Giocatore'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input placeholder="Nome" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={name} onChange={e => setName(e.target.value)} />
            <input type="number" placeholder="N° Maglia" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={number || ''} onChange={e => setNumber(parseInt(e.target.value) || 0)} />
            <input placeholder="ID Tesserato" className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={playerExternalId} onChange={e => setPlayerExternalId(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {editingPlayerId ? (
              <><button onClick={() => { onUpdatePlayer(editingPlayerId, { name, number, playerExternalId }); setEditingPlayerId(null); setName(''); setNumber(0); setPlayerExternalId(''); }} className="flex-1 bg-indigo-600 text-white font-black py-3.5 rounded-2xl text-sm hover:bg-indigo-700 transition-all">Salva</button><button onClick={() => { setEditingPlayerId(null); setName(''); setNumber(0); setPlayerExternalId(''); }} className="px-5 bg-slate-100 text-slate-400 font-black py-3.5 rounded-2xl text-sm">Annulla</button></>
            ) : (
              <button onClick={() => { onAddPlayer(selectedTeamId, name, number, playerExternalId); setName(''); setNumber(0); setPlayerExternalId(''); }} className="w-full bg-slate-900 text-white font-black py-3.5 rounded-2xl text-sm hover:bg-slate-800 transition-all">Aggiungi alla Rosa</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Giocatori in Rosa ({teamPlayers.length})</h3></div>
          <div className="divide-y divide-slate-100">
            {teamPlayers.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">Nessun giocatore aggiunto.</div>}
            {teamPlayers.map((p: any) => (
              <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs flex-shrink-0">{p.number}</div>
                  <div><div className="font-bold text-slate-800 text-sm">{p.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase">ID: {p.playerExternalId}</div></div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditingPlayerId(p.id); setName(p.name); setNumber(p.number); setPlayerExternalId(p.playerExternalId); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Settings className="w-4 h-4" /></button>
                  <button onClick={() => onRemovePlayer(p.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
