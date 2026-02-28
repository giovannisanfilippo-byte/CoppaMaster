import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Calendar, Users, Award, LayoutDashboard, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../utils/supabase';
import { StandingsTable } from './StandingsTable';
import { ScorerTable } from './ScorerTable';
import { AssistTable } from './AssistTable';

interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  colors?: string;
}

interface Match {
  id: string;
  tournamentId: string;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number;
  scoreB: number;
  status: 'scheduled' | 'finished';
  round: number;
  matchType: string;
  isReturnMatch: boolean;
  nextMatchId?: string;
  positionInRound?: number;
}

interface MatchEvent {
  id: string;
  matchId: string;
  playerId: string;
  type: string;
}

interface Tournament {
  id: string;
  name: string;
  type: 'league' | 'knockout';
  maxTeams: number;
  status: 'attivo' | 'nascosto' | 'concluso';
}

interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  playerExternalId: string;
}

export function PublicTournamentView() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'scorers' | 'assists' | 'bracket'>('matches');

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: tData, error: tError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tError) throw tError;
      if (tData.status === 'nascosto') {
        setError('Questo torneo è privato o non ancora pubblicato.');
        setLoading(false);
        return;
      }

      setTournament({
        id: tData.id,
        name: tData.name,
        type: tData.type,
        maxTeams: tData.max_teams,
        status: tData.status
      });

      const { data: ttData } = await supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', tournamentId);

      const teamIds = ttData?.map((tt: any) => tt.club_id) || [];

      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);

        if (teamsData) {
          setTeams(teamsData.map((t: any) => ({
            id: t.id,
            name: t.name,
            logoUrl: t.logo_url,
            colors: t.colors
          })));
        }

        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .in('team_id', teamIds);

        if (playersData) {
          setPlayers(playersData.map((p: any) => ({
            id: p.id,
            teamId: p.team_id,
            name: p.name,
            number: p.number,
            playerExternalId: p.player_external_id
          })));
        }
      }

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true });

      if (matchesData) {
        setMatches(matchesData.map((m: any) => ({
          id: m.id,
          tournamentId: m.tournament_id,
          teamAId: m.team_a_id,
          teamBId: m.team_b_id,
          scoreA: m.score_a,
          scoreB: m.score_b,
          status: m.status,
          round: m.round,
          matchType: m.match_type,
          isReturnMatch: m.is_return_match,
          nextMatchId: m.next_match_id,
          positionInRound: m.position_in_round
        })));

        const matchIds = matchesData.map((m: any) => m.id);
        if (matchIds.length > 0) {
          const { data: eventsData } = await supabase
            .from('match_events')
            .select('*')
            .in('match_id', matchIds);

          if (eventsData) {
            setEvents(eventsData.map((e: any) => ({
              id: e.id,
              matchId: e.match_id,
              playerId: e.player_id,
              type: e.event_type
            })));
          }
        }
      }

      if (tData.type === 'knockout') setActiveTab('bracket');

    } catch (err: any) {
      console.error('Error loading public tournament:', err);
      setError('Impossibile caricare i dati del torneo.');
    } finally {
      setLoading(false);
    }
  };

  const standings = useMemo(() => {
    if (!tournament || tournament.type !== 'league') return [];
    const stats: Record<string, any> = {};
    teams.forEach(t => {
      stats[t.id] = { name: t.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    });

    matches
      .filter(m => m.status === 'finished' && m.matchType === 'league_match')
      .forEach(m => {
        if (!m.teamAId || !m.teamBId) return;
        const sA = stats[m.teamAId];
        const sB = stats[m.teamBId];
        if (!sA || !sB) return;

        sA.p++; sB.p++;
        sA.gf += m.scoreA; sA.ga += m.scoreB;
        sB.gf += m.scoreB; sB.ga += m.scoreA;

        if (m.scoreA > m.scoreB) { sA.w++; sB.l++; sA.pts += 3; }
        else if (m.scoreB > m.scoreA) { sB.w++; sA.l++; sB.pts += 3; }
        else { sA.d++; sB.d++; sA.pts += 1; sB.pts += 1; }
      });

    return Object.values(stats).sort((a: any, b: any) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  }, [matches, teams, tournament]);

  const scorerStats = useMemo(() => {
    const stats: Record<string, { goals: number; name: string; team: string }> = {};
    events
      .filter(e => e.type === 'gol')
      .forEach(e => {
        const player = players.find(p => p.id === e.playerId);
        if (!player) return;
        if (!stats[e.playerId]) {
          stats[e.playerId] = { goals: 0, name: player.name, team: teams.find(t => t.id === player.teamId)?.name || '' };
        }
        stats[e.playerId].goals++;
      });
    return Object.values(stats).sort((a, b) => b.goals - a.goals);
  }, [events, players, teams]);

  const assistStats = useMemo(() => {
    const stats: Record<string, { assists: number; name: string; team: string }> = {};
    events
      .filter(e => e.type === 'assist')
      .forEach(e => {
        const player = players.find(p => p.id === e.playerId);
        if (!player) return;
        if (!stats[e.playerId]) {
          stats[e.playerId] = { assists: 0, name: player.name, team: teams.find(t => t.id === player.teamId)?.name || '' };
        }
        stats[e.playerId].assists++;
      });
    return Object.values(stats).sort((a, b) => b.assists - a.assists);
  }, [events, players, teams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold animate-pulse">Caricamento Torneo...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 text-center space-y-6 max-w-md">
          <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="text-red-500 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Ops! Qualcosa è andato storto</h1>
          <p className="text-slate-500 font-medium">{error || 'Torneo non trovato.'}</p>
          <Link to="/" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm">
            Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight uppercase">{tournament.name}</h1>
          </div>
          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'matches', icon: Calendar, label: 'Partite', show: tournament.type === 'league' },
              { id: 'bracket', icon: LayoutDashboard, label: 'Tabellone', show: tournament.type === 'knockout' },
              { id: 'standings', icon: Users, label: 'Classifica', show: tournament.type === 'league' },
              { id: 'scorers', icon: Award, label: 'Marcatori', show: true },
              { id: 'assists', icon: Award, label: 'Assist', show: true },
            ].filter(t => t.show).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 mt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'matches' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              {Array.from(new Set(matches.map(m => m.round)))
                .sort((a: number, b: number) => a - b)
                .map(roundNum => {
                  const roundMatches = matches.filter(m => m.round === roundNum);
                  const isReturn = roundMatches[0]?.isReturnMatch;
                  return (
                    <div key={roundNum} className="space-y-4">
                      <div className="flex items-center gap-4 px-2">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600">Giornata {roundNum}</h2>
                        <div className="h-px bg-slate-200 flex-1" />
                        {isReturn && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Ritorno</span>}
                      </div>
                      <div className="grid gap-4">
                        {roundMatches.map(match => {
                          const teamA = teams.find(t => t.id === match.teamAId);
                          const teamB = teams.find(t => t.id === match.teamBId);
                          return (
                            <div key={match.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 text-right font-bold text-slate-700 truncate">{teamA?.name}</div>
                                <div className="flex items-center gap-4 px-6">
                                  <div className="w-12 h-12 flex items-center justify-center text-2xl font-black bg-slate-50 rounded-xl border border-slate-100">
                                    {match.status === 'finished' ? match.scoreA : '-'}
                                  </div>
                                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">VS</div>
                                  <div className="w-12 h-12 flex items-center justify-center text-2xl font-black bg-slate-50 rounded-xl border border-slate-100">
                                    {match.status === 'finished' ? match.scoreB : '-'}
                                  </div>
                                </div>
                                <div className="flex-1 text-left font-bold text-slate-700 truncate">{teamB?.name}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </motion.div>
          )}

          {activeTab === 'standings' && tournament.type === 'league' && (
            <StandingsTable standings={standings} />
          )}

          {activeTab === 'bracket' && tournament.type === 'knockout' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-x-auto pb-8">
              <div className="flex gap-12 min-w-max p-4">
                {[16, 8, 4, 2].filter(r => matches.some(m => m.round === r))
                  .sort((a, b) => b - a)
                  .map(roundSize => (
                    <div key={roundSize} className="flex flex-col gap-8">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-4">
                        {roundSize === 2 ? 'Finale' : roundSize === 4 ? 'Semifinali' : roundSize === 8 ? 'Quarti' : 'Ottavi'}
                      </h3>
                      <div className="flex flex-col justify-around flex-1 gap-8">
                        {matches.filter(m => m.round === roundSize)
                          .sort((a, b) => (a.positionInRound || 0) - (b.positionInRound || 0))
                          .map(match => {
                            const teamA = teams.find(t => t.id === match.teamAId);
                            const teamB = teams.find(t => t.id === match.teamBId);
                            return (
                              <div key={match.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-64 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className={`text-sm font-bold truncate flex-1 ${match.status === 'finished' && match.scoreA > match.scoreB ? 'text-indigo-600' : 'text-slate-600'}`}>
                                    {teamA?.name || '---'}
                                  </span>
                                  <span className="font-black text-slate-900 ml-2">{match.status === 'finished' ? match.scoreA : '-'}</span>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div className="flex justify-between items-center">
                                  <span className={`text-sm font-bold truncate flex-1 ${match.status === 'finished' && match.scoreB > match.scoreA ? 'text-indigo-600' : 'text-slate-600'}`}>
                                    {teamB?.name || '---'}
                                  </span>
                                  <span className="font-black text-slate-900 ml-2">{match.status === 'finished' ? match.scoreB : '-'}</span>
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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <ScorerTable stats={scorerStats} />
            </motion.div>
          )}

          {activeTab === 'assists' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <AssistTable stats={assistStats} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
          Powered by Tournament Master • Pagina Pubblica
        </p>
      </footer>
    </div>
  );
}
