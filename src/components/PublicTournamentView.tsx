import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Calendar, Users, Award, LayoutDashboard, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../utils/supabase';
import { StandingsTable } from './StandingsTable';
import { ScorerTable } from './ScorerTable';
import { AssistTable } from './AssistTable';

interface Team { id: string; name: string; logoUrl?: string; colors?: string; }
interface Match {
  id: string; tournamentId: string; teamAId: string | null; teamBId: string | null;
  scoreA: number; scoreB: number; status: 'scheduled' | 'finished'; round: number;
  matchType: string; isReturnMatch: boolean; nextMatchId?: string; positionInRound?: number;
}
interface MatchEvent { id: string; matchId: string; playerId: string; type: string; }
interface Tournament {
  id: string; name: string; type: 'league' | 'knockout'; maxTeams: number;
  status: 'attivo' | 'nascosto' | 'concluso'; logoUrl?: string;
}
interface Player { id: string; teamId: string; name: string; number: number; playerExternalId: string; }

export function PublicTournamentView() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'scorers' | 'assists' | 'bracket' | 'rose'>('matches');
  const [selectedRoseTeamId, setSelectedRoseTeamId] = useState<string>('');
  const [selectedPublicRound, setSelectedPublicRound] = useState<number | null>(null);

  useEffect(() => { if (tournamentId) loadData(); }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: tData, error: tError } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
      if (tError) throw tError;
      if (tData.status === 'nascosto') { setError('Questo torneo è privato o non ancora pubblicato.'); setLoading(false); return; }
      setTournament({ id: tData.id, name: tData.name, type: tData.type, maxTeams: tData.max_teams, status: tData.status, logoUrl: tData.logo_url });

      const { data: ttData } = await supabase.from('tournament_teams').select('*').eq('tournament_id', tournamentId);
      const teamIds = ttData?.map((tt: any) => tt.club_id) || [];

      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase.from('teams').select('*').in('id', teamIds);
        if (teamsData) setTeams(teamsData.map((t: any) => ({ id: t.id, name: t.name, logoUrl: t.logo_url, colors: t.colors })));
        const { data: playersData } = await supabase.from('players').select('*').in('team_id', teamIds);
        if (playersData) setPlayers(playersData.map((p: any) => ({ id: p.id, teamId: p.team_id, name: p.name, number: p.number, playerExternalId: p.player_external_id })));
      }

      const { data: matchesData } = await supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('round', { ascending: true });
      if (matchesData) {
        setMatches(matchesData.map((m: any) => ({ id: m.id, tournamentId: m.tournament_id, teamAId: m.team_a_id, teamBId: m.team_b_id, scoreA: m.score_a, scoreB: m.score_b, status: m.status, round: m.round, matchType: m.match_type, isReturnMatch: m.is_return_match, nextMatchId: m.next_match_id, positionInRound: m.position_in_round })));
        const matchIds = matchesData.map((m: any) => m.id);
        if (matchIds.length > 0) {
          const { data: eventsData } = await supabase.from('match_events').select('*').in('match_id', matchIds);
          if (eventsData) setEvents(eventsData.map((e: any) => ({ id: e.id, matchId: e.match_id, playerId: e.player_id, type: e.event_type })));
        }
      }
      if (tData.type === 'knockout') setActiveTab('bracket');
    } catch (err: any) {
      setError('Impossibile caricare i dati del torneo.');
    } finally {
      setLoading(false);
    }
  };

  const standings = useMemo(() => {
    if (!tournament || tournament.type !== 'league') return [];
    const stats: Record<string, any> = {};
    teams.forEach(t => { stats[t.id] = { name: t.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    matches.filter(m => m.status === 'finished' && m.matchType === 'league_match').forEach(m => {
      if (!m.teamAId || !m.teamBId) return;
      const sA = stats[m.teamAId]; const sB = stats[m.teamBId]; if (!sA || !sB) return;
      sA.p++; sB.p++; sA.gf += m.scoreA; sA.ga += m.scoreB; sB.gf += m.scoreB; sB.ga += m.scoreA;
      if (m.scoreA > m.scoreB) { sA.w++; sB.l++; sA.pts += 3; } else if (m.scoreB > m.scoreA) { sB.w++; sA.l++; sB.pts += 3; } else { sA.d++; sB.d++; sA.pts += 1; sB.pts += 1; }
    });
    return Object.values(stats).sort((a: any, b: any) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  }, [matches, teams, tournament]);

  const scorerStats = useMemo(() => {
    const stats: Record<string, { goals: number; name: string; team: string }> = {};
    events.filter(e => e.type === 'gol').forEach(e => {
      const player = players.find(p => p.id === e.playerId); if (!player) return;
      if (!stats[e.playerId]) stats[e.playerId] = { goals: 0, name: player.name, team: teams.find(t => t.id === player.teamId)?.name || '', logoUrl: teams.find(t => t.id === player.teamId)?.logoUrl || '' };
      stats[e.playerId].goals++;
    });
    return Object.values(stats).sort((a, b) => b.goals - a.goals);
  }, [events, players, teams]);

  const assistStats = useMemo(() => {
    const stats: Record<string, { assists: number; name: string; team: string }> = {};
    events.filter(e => e.type === 'assist').forEach(e => {
      const player = players.find(p => p.id === e.playerId); if (!player) return;
      if (!stats[e.playerId]) stats[e.playerId] = { assists: 0, name: player.name, team: teams.find(t => t.id === player.teamId)?.name || '', logoUrl: teams.find(t => t.id === player.teamId)?.logoUrl || '' };
      stats[e.playerId].assists++;
    });
    return Object.values(stats).sort((a, b) => b.assists - a.assists);
  }, [events, players, teams]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold animate-pulse">Caricamento Torneo...</p>
      </div>
    </div>
  );

  if (error || !tournament) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 text-center space-y-6 max-w-md">
        <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"><AlertCircle className="text-red-500 w-8 h-8" /></div>
        <h1 className="text-2xl font-black text-slate-900">Ops! Qualcosa è andato storto</h1>
        <p className="text-slate-500 font-medium">{error || 'Torneo non trovato.'}</p>
        <Link to="/" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm">Torna alla Home</Link>
      </div>
    </div>
  );

  const selectedRoseTeam = teams.find(t => t.id === selectedRoseTeamId);
  const roseTeamPlayers = players.filter(p => p.teamId === selectedRoseTeamId).sort((a, b) => a.number - b.number);
  const roundMatches = matches.filter(m => m.round === selectedPublicRound);
  const isReturnRound = roundMatches[0]?.isReturnMatch;

  const tabs = [
    { id: 'matches', icon: Calendar, label: 'Partite', show: tournament.type === 'league' },
    { id: 'bracket', icon: LayoutDashboard, label: 'Tabellone', show: tournament.type === 'knockout' },
    { id: 'standings', icon: Users, label: 'Classifica', show: tournament.type === 'league' },
    { id: 'scorers', icon: Award, label: 'Marcatori', show: true },
    { id: 'assists', icon: Award, label: 'Assist', show: true },
    { id: 'rose', icon: Users, label: 'Rose', show: true },
  ].filter(t => t.show);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">

      {/* NAVBAR - solo logo e nome */}
      <nav className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-50 shadow-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {tournament.logoUrl ? (
            <img src={tournament.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
          ) : (
            <div className="bg-indigo-600 p-1.5 rounded-lg flex-shrink-0"><Trophy className="w-5 h-5 text-white" /></div>
          )}
          <h1 className="font-bold text-base tracking-tight uppercase truncate">{tournament.name}</h1>
        </div>
      </nav>

      {/* TAB BAR FISSA IN BASSO - ottimizzata mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 shadow-2xl">
        <div className="max-w-4xl mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 gap-0.5 transition-all ${
                activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500'
              }`}
            >
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
              <select
                value={selectedPublicRound ?? ''}
                onChange={e => setSelectedPublicRound(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-700 text-sm outline-none shadow-sm"
              >
                <option value="">Seleziona giornata...</option>
                {Array.from(new Set(matches.map(m => m.round))).sort((a: number, b: number) => a - b).map(rn => {
                  const isRet = matches.filter(m => m.round === rn)[0]?.isReturnMatch;
                  return <option key={rn} value={rn}>Giornata {rn}{isRet ? ' (Ritorno)' : ''}</option>;
                })}
              </select>

              {!selectedPublicRound && (
                <div className="text-center py-12 text-slate-400 italic text-sm">Seleziona una giornata dal menu.</div>
              )}

              {selectedPublicRound && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <h2 className="text-xs font-black uppercase tracking-widest text-indigo-600">Giornata {selectedPublicRound}</h2>
                    <div className="h-px bg-slate-200 flex-1" />
                    {isReturnRound && <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Ritorno</span>}
                  </div>
                  <div className="grid gap-3">
                    {roundMatches.map(match => {
                      const teamA = teams.find(t => t.id === match.teamAId);
                      const teamB = teams.find(t => t.id === match.teamBId);
                      return (
                        <div key={match.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                              <span className="font-bold text-slate-700 text-sm truncate">{teamA?.name}</span>
                              {teamA?.logoUrl && <img src={teamA.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0 border border-slate-100" />}
                            </div>
                            <div className="flex items-center gap-2 px-2 flex-shrink-0">
                              <div className="w-10 h-10 flex items-center justify-center text-xl font-black bg-slate-50 rounded-xl border border-slate-100">
                                {match.status === 'finished' ? match.scoreA : '-'}
                              </div>
                              <div className="text-[9px] font-black text-slate-300 uppercase">VS</div>
                              <div className="w-10 h-10 flex items-center justify-center text-xl font-black bg-slate-50 rounded-xl border border-slate-100">
                                {match.status === 'finished' ? match.scoreB : '-'}
                              </div>
                            </div>
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              {teamB?.logoUrl && <img src={teamB.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0 border border-slate-100" />}
                              <span className="font-bold text-slate-700 text-sm truncate">{teamB?.name}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'standings' && tournament.type === 'league' && (
            <div className="overflow-x-auto -mx-3">
              <div className="min-w-[340px] px-3">
                <StandingsTable standings={standings} />
              </div>
            </div>
          )}

          {activeTab === 'bracket' && tournament.type === 'knockout' && (
            <motion.div key="bracket" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-x-auto pb-4 -mx-3 px-3">
              <div className="flex gap-6 min-w-max">
                {[16, 8, 4, 2].filter(r => matches.some(m => m.round === r)).sort((a, b) => b - a).map(roundSize => (
                  <div key={roundSize} className="flex flex-col gap-6">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
                      {roundSize === 2 ? 'Finale' : roundSize === 4 ? 'Semifinali' : roundSize === 8 ? 'Quarti' : 'Ottavi'}
                    </h3>
                    <div className="flex flex-col justify-around flex-1 gap-6">
                      {matches.filter(m => m.round === roundSize).sort((a, b) => (a.positionInRound || 0) - (b.positionInRound || 0)).map(match => {
                        const teamA = teams.find(t => t.id === match.teamAId);
                        const teamB = teams.find(t => t.id === match.teamBId);
                        return (
                          <div key={match.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 w-48 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`text-xs font-bold truncate flex-1 ${match.status === 'finished' && match.scoreA > match.scoreB ? 'text-indigo-600' : 'text-slate-600'}`}>{teamA?.name || '---'}</span>
                              <span className="font-black text-slate-900 ml-2 text-sm">{match.status === 'finished' ? match.scoreA : '-'}</span>
                            </div>
                            <div className="h-px bg-slate-100" />
                            <div className="flex justify-between items-center">
                              <span className={`text-xs font-bold truncate flex-1 ${match.status === 'finished' && match.scoreB > match.scoreA ? 'text-indigo-600' : 'text-slate-600'}`}>{teamB?.name || '---'}</span>
                              <span className="font-black text-slate-900 ml-2 text-sm">{match.status === 'finished' ? match.scoreB : '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
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

          {activeTab === 'rose' && (
            <motion.div key="rose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <select
                value={selectedRoseTeamId}
                onChange={e => setSelectedRoseTeamId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-black text-slate-700 text-sm outline-none shadow-sm"
              >
                <option value="">Seleziona squadra...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              {!selectedRoseTeamId && (
                <div className="text-center py-12 text-slate-400 italic text-sm">Seleziona una squadra dal menu.</div>
              )}

              {selectedRoseTeamId && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedRoseTeam?.logoUrl && <img src={selectedRoseTeam.logoUrl} alt="logo" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />}
                      <h3 className="font-black text-slate-900 uppercase tracking-wide text-sm truncate">{selectedRoseTeam?.name}</h3>
                    </div>
                    <span className="bg-indigo-100 text-indigo-600 text-xs font-black px-3 py-1 rounded-full flex-shrink-0 ml-2">
                      {roseTeamPlayers.length} 👤
                    </span>
                  </div>
                  {roseTeamPlayers.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm italic">Nessun giocatore registrato.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {roseTeamPlayers.map(player => (
                        <div key={player.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs flex-shrink-0">{player.number}</div>
                            <span className="font-bold text-slate-700 text-sm">{player.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0 ml-2">
                            {player.playerExternalId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
