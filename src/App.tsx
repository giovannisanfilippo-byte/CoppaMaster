/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Calendar, Users, Plus, Trash2, User, Award, ChevronRight, X, ShieldCheck, Settings, LayoutDashboard, UserPlus, Save, AlertCircle, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchReportForm } from './components/MatchReportForm';
import { ScorerTable } from './components/ScorerTable';
import { AssistTable } from './components/AssistTable';
import { StandingsTable } from './components/StandingsTable';
import { ClubsPage } from './components/ClubsPage';
import { PublicTournamentView } from './components/PublicTournamentView';
import { ConfirmModal } from './components/ConfirmModal';
import { supabase, fetchClubs, saveClub, fetchTournaments, saveTournament, saveMatches, saveTournamentTeams, updateMatchScoreDB, saveMatchEventDB, deleteMatchEventDB, fetchTournamentData, deleteTournamentDB, saveTeamDB, deleteTeamDB, savePlayerDB, updatePlayerDB, deletePlayerDB } from './utils/supabase';
import { GroupTournaments } from './components/GroupTournaments';

// --- Types ---
type TournamentType = 'league' | 'knockout';
type EventType = 'goal' | 'assist';

type TournamentStatus = 'attivo' | 'nascosto' | 'concluso';

interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  maxTeams: number;
  status: TournamentStatus;
}

interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  colors?: string;
}

interface TournamentTeam {
  tournamentId: string;
  teamId: string;
}

interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  playerExternalId: string;
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
  matchType: 'league_match' | 'bracket_match';
  isReturnMatch: boolean;
  nextMatchId?: string;
  positionInRound?: number;
}

interface MatchEvent {
  id: string;
  matchId: string;
  playerId: string;
  type: EventType;
}

export default function App() {
  return (
    <Routes>
      <Route path="/public/:tournamentId" element={<PublicTournamentView />} />
      <Route path="*" element={<PrivateApp />} />
    </Routes>
  );
}

function PrivateApp() {
  // --- State ---
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
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // --- Auth & Data Fetching ---
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const [clubsData, tournamentsData] = await Promise.all([
        fetchClubs(user.id),
        fetchTournaments(user.id)
      ]);
      if (clubsData) {
      setTeams(clubsData.map(t => ({
        id: t.id,
        name: t.name,
        logoUrl: t.logo_url,
        colors: t.colors
      })));
    }
      
      // Transform Supabase data to local state format
      const loadedTeams: Team[] = clubsData.map((c: any) => ({
        id: c.id,
        name: c.name,
        logoUrl: c.logo_url,
        colors: c.colors
      }));

      const loadedPlayers: Player[] = clubsData.flatMap((c: any) => 
        c.players.map((p: any) => ({
          id: p.id,
          teamId: p.team_id,
          name: p.name,
          number: p.number,
          playerExternalId: p.player_external_id
        }))
      );

      setTeams(loadedTeams);
      setPlayers(loadedPlayers);
      setTournaments(tournamentsData.map((t: any) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        maxTeams: t.max_teams,
        status: t.status
      })));
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadTournamentDetails = async (tournamentId: string) => {
    try {
      const data = await fetchTournamentData(tournamentId);
      
      // Update local state with tournament specific data
      // We don't overwrite teams/players global list, but we might need to ensure they are present
      // Actually, tournament_teams might include teams not in the global 'clubs' list if they were 'quick created'
      // But for now, let's just load matches and events
      setMatches(prev => [
        ...prev.filter(m => m.tournamentId !== tournamentId),
        ...data.matches.map((m: any) => ({
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
        }))
      ]);

      setEvents(prev => [
        ...prev.filter(e => !data.matches.some(m => m.id === e.matchId)),
        ...data.events.map((e: any) => ({
          id: e.id,
          matchId: e.match_id,
          playerId: e.player_id,
          type: e.event_type
        }))
      ]);
    } catch (error) {
      console.error('Failed to load tournament details:', error);
    }
  };

  const tournament = useMemo(() => tournaments.find(t => t.id === activeTournamentId), [tournaments, activeTournamentId]);
  const currentTournamentTeams = useMemo(() => {
    const teamIds = tournamentTeams.filter(tt => tt.tournamentId === activeTournamentId).map(tt => tt.teamId);
    return teams.filter(t => teamIds.includes(t.id));
  }, [teams, tournamentTeams, activeTournamentId]);

  // --- Handlers: Setup ---
  const handleCreateTournament = async (name: string, type: TournamentType, maxTeams: number) => {
    if (!user) return;
    try {
      const newTournamentData = {
        name,
        type,
        max_teams: maxTeams,
        status: 'attivo',
        user_id: user.id
      };
      
      const savedTournament = await saveTournament(newTournamentData);
      
      const newTournament: Tournament = { 
        id: savedTournament.id, 
        name: savedTournament.name, 
        type: savedTournament.type as TournamentType, 
        maxTeams: savedTournament.max_teams, 
        status: savedTournament.status as TournamentStatus 
      };

      setTournaments([...tournaments, newTournament]);
      setActiveTournamentId(newTournament.id);
      setView('teams');
      setActiveTab(type === 'knockout' ? 'bracket' : 'matches');
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Errore nella creazione del torneo.');
    }
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
      const newTeam: Team = { 
        id: savedTeam.id, 
        name: savedTeam.name,
        logoUrl: savedTeam.logo_url,
        colors: savedTeam.colors
      };
      setTeams([...teams, newTeam]);
      addTeamToTournament(newTeam.id);
    } catch (error) {
      console.error('Error quick-creating team:', error);
    }
  };

  const removeTeamFromTournament = (teamId: string) => {
    setTournamentTeams(tournamentTeams.filter(tt => !(tt.tournamentId === activeTournamentId && tt.teamId === teamId)));
  };

  const generateCalendar = async () => {
    if (!tournament || activeTournamentId === null) return;
    const currentTeams = currentTournamentTeams;
    if (currentTeams.length < 2) return;
    
    let newMatches: Match[] = [];
    if (tournament.type === 'league') {
      newMatches = generateLeagueCalendar(currentTeams);
    } else {
      newMatches = generateKnockoutCalendar(currentTeams);
    }

    try {
      // 1. Save Tournament Teams
      await saveTournamentTeams(activeTournamentId, currentTeams.map(t => t.id), user.id);

      // 2. Save Matches
      const matchesToSave = newMatches.map(m => ({
        tournament_id: m.tournamentId,
        team_a_id: m.teamAId,
        team_b_id: m.teamBId,
        score_a: m.scoreA,
        score_b: m.scoreB,
        round: m.round,
        match_type: m.matchType,
        is_return_match: m.isReturnMatch,
        status: m.status,
        next_match_id: m.nextMatchId,
        position_in_round: m.positionInRound,
        user_id: user.id
      }));

      const savedMatches = await saveMatches(matchesToSave);
      
      // Update local state with DB IDs
      const finalMatches: Match[] = savedMatches.map((m: any) => ({
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
      }));

      setMatches([...matches, ...finalMatches]);
      setView('roster');
    } catch (error) {
      console.error('Error generating calendar:', error);
      alert('Errore nel salvataggio del calendario.');
    }
  };

  const generateLeagueCalendar = (currentTeams: Team[]): Match[] => {
    const newMatches: Match[] = [];
    const teamIds = currentTeams.map(t => t.id);
    if (teamIds.length % 2 !== 0) teamIds.push('BYE');
    const numTeams = teamIds.length;
    const roundsPerLeg = numTeams - 1;

    for (let leg = 0; leg < 2; leg++) {
      for (let r = 0; r < roundsPerLeg; r++) {
        const roundNumber = leg === 0 ? r + 1 : roundsPerLeg + r + 1;
        for (let i = 0; i < numTeams / 2; i++) {
          const teamA = teamIds[i];
          const teamB = teamIds[numTeams - 1 - i];
          if (teamA !== 'BYE' && teamB !== 'BYE') {
            newMatches.push({
              id: '', // Temporary
              tournamentId: activeTournamentId!,
              teamAId: leg === 0 ? teamA : teamB,
              teamBId: leg === 0 ? teamB : teamA,
              scoreA: 0, 
              scoreB: 0, 
              status: 'scheduled', 
              round: roundNumber, 
              matchType: 'league_match',
              isReturnMatch: leg === 1
            });
          }
        }
        teamIds.splice(1, 0, teamIds.pop()!);
      }
    }
    return newMatches;
  };

  const generateKnockoutCalendar = (currentTeams: Team[]): Match[] => {
    const newMatches: Match[] = [];
    const numTeams = currentTeams.length;
    
    // Determine bracket size (2, 4, 8, 16, 32)
    let bracketSize = 2;
    while (bracketSize < numTeams) bracketSize *= 2;

    const createRound = (size: number, nextRoundMatches: Match[] | null): Match[] => {
      const roundMatches: Match[] = [];
      for (let i = 0; i < size / 2; i++) {
        const match: Match = {
          id: Math.random().toString(36).substr(2, 9), // Temp ID for linking
          tournamentId: activeTournamentId!,
          teamAId: null,
          teamBId: null,
          scoreA: 0,
          scoreB: 0,
          status: 'scheduled',
          round: size,
          matchType: 'bracket_match',
          isReturnMatch: false,
          nextMatchId: nextRoundMatches ? nextRoundMatches[Math.floor(i / 2)].id : undefined,
          positionInRound: i
        };
        roundMatches.push(match);
      }
      return roundMatches;
    };

    // Build rounds from Final to start
    let currentSize = 2;
    let lastRoundMatches: Match[] | null = null;
    const allKnockoutMatches: Match[] = [];

    while (currentSize <= bracketSize) {
      lastRoundMatches = createRound(currentSize, lastRoundMatches);
      allKnockoutMatches.push(...lastRoundMatches);
      currentSize *= 2;
    }

    // Fill first round with teams
    const firstRoundMatches = allKnockoutMatches.filter(m => m.round === bracketSize);
    const shuffledTeams = [...currentTeams].sort(() => Math.random() - 0.5);
    
    shuffledTeams.forEach((team, i) => {
      const matchIndex = Math.floor(i / 2);
      const isTeamB = i % 2 !== 0;
      if (isTeamB) firstRoundMatches[matchIndex].teamBId = team.id;
      else firstRoundMatches[matchIndex].teamAId = team.id;
    });

    return allKnockoutMatches;
  };

  const updateTournamentStatus = (id: string, status: TournamentStatus) => {
    setTournaments(tournaments.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTournament = async (id: string) => {
    const tournamentToDelete = tournaments.find(t => t.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'Elimina Torneo',
      message: `Sei sicuro di voler eliminare il torneo "${tournamentToDelete?.name}"? Questa azione è irreversibile e tutti i dati (partite, eventi, classifiche) verranno persi.`,
      onConfirm: async () => {
        try {
          await deleteTournamentDB(id);
          setTournaments(tournaments.filter(t => t.id !== id));
          setMatches(matches.filter(m => m.tournamentId !== id));
          if (activeTournamentId === id) {
            setActiveTournamentId(null);
            setView('home');
          }
        } catch (error) {
          console.error('Error deleting tournament:', error);
          alert('Errore nell\'eliminazione del torneo.');
        }
      }
    });
  };

  // --- Handlers: Roster ---
  const addPlayer = (teamId: string, name: string, number: number, playerExternalId: string) => {
    if (!name || !playerExternalId) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      teamId,
      name,
      number,
      playerExternalId
    };
    setPlayers([...players, newPlayer]);
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePlayer = (id: string) => {
    const playerToDelete = players.find(p => p.id === id);
    const hasGoals = events.some(e => e.playerId === id && e.type === 'goal');
    
    setConfirmModal({
      isOpen: true,
      title: 'Elimina Giocatore',
      message: hasGoals 
        ? `Questo giocatore (${playerToDelete?.name}) ha segnato dei gol in questo torneo. Sei sicuro di volerlo eliminare? I suoi dati rimarranno nei referti storici ma non sarà più disponibile per nuovi eventi.`
        : `Sei sicuro di voler eliminare il giocatore "${playerToDelete?.name}"?`,
      onConfirm: () => {
        setPlayers(players.filter(p => p.id !== id));
      }
    });
  };

  // --- Handlers: Match Report ---
  const addMatchEvent = async (matchId: string, playerId: string, type: EventType) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const isTeamA = player.teamId === match.teamAId;
    const currentGoals = events.filter(e => e.matchId === matchId && e.type === 'goal' && players.find(p => p.id === e.playerId)?.teamId === player.teamId).length;
    const scoreLimit = isTeamA ? match.scoreA : match.scoreB;

    if (type === 'goal' && currentGoals >= scoreLimit) {
      alert(`Attenzione: Hai già assegnato tutti i ${scoreLimit} gol per questa squadra.`);
      return;
    }

    try {
      const savedEvent = await saveMatchEventDB({
        match_id: matchId,
        player_id: playerId,
        event_type: type,
        user_id: user.id
      });

      const newEvent: MatchEvent = {
        id: savedEvent.id,
        matchId: savedEvent.match_id,
        playerId: savedEvent.player_id,
        type: savedEvent.event_type as EventType
      };
      setEvents([...events, newEvent]);
    } catch (error) {
      console.error('Error adding match event:', error);
    }
  };

  const removeMatchEvent = async (id: string) => {
    try {
      await deleteMatchEventDB(id);
      setEvents(events.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error removing match event:', error);
    }
  };

  const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number) => {
    try {
      await updateMatchScoreDB(matchId, scoreA, scoreB);
      
      const updatedMatches = matches.map(m => {
        if (m.id === matchId) {
          return { ...m, scoreA, scoreB, status: 'finished' as const };
        }
        return m;
      });

      // Handle Knockout Progression
      if (tournament?.type === 'knockout') {
        const match = updatedMatches.find(m => m.id === matchId);
        if (match && match.nextMatchId) {
          const winnerId = scoreA > scoreB ? match.teamAId : scoreB > scoreA ? match.teamBId : null;
          if (winnerId) {
            const nextMatchIndex = updatedMatches.findIndex(m => m.id === match.nextMatchId);
            if (nextMatchIndex !== -1) {
              const isTeamB = (match.positionInRound || 0) % 2 !== 0;
              if (isTeamB) updatedMatches[nextMatchIndex].teamBId = winnerId;
              else updatedMatches[nextMatchIndex].teamAId = winnerId;
              
              // Update next match in DB too
              await supabase.from('matches').update({
                team_a_id: updatedMatches[nextMatchIndex].teamAId,
                team_b_id: updatedMatches[nextMatchIndex].teamBId
              }).eq('id', updatedMatches[nextMatchIndex].id);
            }
          }
        }
      }

      setMatches(updatedMatches);
    } catch (error) {
      console.error('Error updating match score:', error);
    }
  };

  // --- Calculations ---
  const standings = useMemo(() => {
    const stats: Record<string, any> = {};
    currentTournamentTeams.forEach(t => {
      stats[t.id] = { name: t.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    });

    matches
      .filter(m => m.tournamentId === activeTournamentId && m.status === 'finished' && m.matchType === 'league_match')
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

    return Object.values(stats).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  }, [matches, currentTournamentTeams, activeTournamentId]);

  const scorerStats = useMemo(() => {
    if (!activeTournamentId) return [];
    const tournamentMatchIds = new Set(matches.filter(m => m.tournamentId === activeTournamentId).map(m => m.id));
    const stats: Record<string, { goals: number; name: string; team: string }> = {};
    
    events
      .filter(e => e.type === 'goal' && tournamentMatchIds.has(e.matchId))
      .forEach(e => {
        const player = players.find(p => p.id === e.playerId);
        if (!player) return;
        if (!stats[e.playerId]) {
          stats[e.playerId] = { goals: 0, name: player.name, team: teams.find(t => t.id === player.teamId)?.name || '' };
        }
        stats[e.playerId].goals++;
      });
    return Object.values(stats).sort((a, b) => b.goals - a.goals);
  }, [events, players, teams, matches, activeTournamentId]);

  const assistStats = useMemo(() => {
    if (!activeTournamentId) return [];
    const tournamentMatchIds = new Set(matches.filter(m => m.tournamentId === activeTournamentId).map(m => m.id));
    const stats: Record<string, { assists: number; name: string; team: string }> = {};
    
    events
      .filter(e => e.type === 'assist' && tournamentMatchIds.has(e.matchId))
      .forEach(e => {
        const player = players.find(p => p.id === e.playerId);
        if (!player) return;
        if (!stats[e.playerId]) {
          stats[e.playerId] = { assists: 0, name: player.name, team: teams.find(t => t.id === player.teamId)?.name || '' };
        }
        stats[e.playerId].assists++;
      });
    return Object.values(stats).sort((a, b) => b.assists - a.assists);
  }, [events, players, teams, matches, activeTournamentId]);

  const handleShare = () => {
    if (!activeTournamentId) return;
    const publicUrl = `${window.location.origin}/public/${activeTournamentId}`;
    navigator.clipboard.writeText(publicUrl);
    alert('Link pubblico copiato negli appunti!');
  };

  // --- Views ---
  if (view === 'home') {
    return (
      <HomeView 
        tournaments={tournaments} 
        onSelect={(id: string) => { 
          setActiveTournamentId(id); 
          loadTournamentDetails(id);
          setView('dashboard'); 
        }}
        onCreate={() => setView('setup')}
        onDelete={deleteTournament}
        onToggleStatus={(id: string, status: TournamentStatus) => updateTournamentStatus(id, status)}
        setView={setView}
      />
    );
  }

  if (view === 'setup') {
    return <SetupView onCreate={handleCreateTournament} onBack={() => setView('home')} />;
  }

  if (view === 'clubs') {
    return (
      <ClubsPage 
        user={user}
        teams={teams} 
        players={players}
        onAddTeam={async (teamData) => {
          if (!user) return;
          try {
            const savedTeam = await saveTeamDB({ ...teamData, user_id: user.id });
            setTeams([...teams, { id: savedTeam.id, name: savedTeam.name, logoUrl: savedTeam.logo_url, colors: savedTeam.colors }]);
          } catch (error) {
            console.error('Error saving team:', error);
          }
        }}
        onDeleteTeam={async (id) => {
          const teamToDelete = teams.find(t => t.id === id);
          setConfirmModal({
            isOpen: true,
            title: 'Elimina Club',
            message: `Sei sicuro di voler eliminare il club "${teamToDelete?.name}"? Questa azione è irreversibile e tutti i tesserati associati verranno rimossi.`,
            onConfirm: async () => {
              try {
                await deleteTeamDB(id);
                setTeams(teams.filter(t => t.id !== id));
                setTournamentTeams(tournamentTeams.filter(tt => tt.teamId !== id));
              } catch (error) {
                console.error('Error deleting team:', error);
              }
            }
          });
        }}
        onAddPlayer={async (teamId, name, number, playerExternalId) => {
          if (!user) return;
          try {
            const savedPlayer = await savePlayerDB({ 
              team_id: teamId, 
              name, 
              number, 
              player_external_id: playerExternalId,
              user_id: user.id
            });
            setPlayers([...players, { 
              id: savedPlayer.id, 
              teamId: savedPlayer.team_id, 
              name: savedPlayer.name, 
              number: savedPlayer.number, 
              playerExternalId: savedPlayer.player_external_id 
            }]);
          } catch (error) {
            console.error('Error saving player:', error);
          }
        }}
        onUpdatePlayer={async (id, updates) => {
          try {
            const dbUpdates: any = { ...updates };
            if (updates.playerExternalId) {
              dbUpdates.player_external_id = updates.playerExternalId;
              delete dbUpdates.playerExternalId;
            }
            await updatePlayerDB(id, dbUpdates);
            setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p));
          } catch (error) {
            console.error('Error updating player:', error);
          }
        }}
        onRemovePlayer={async (id) => {
          const playerToDelete = players.find(p => p.id === id);
          setConfirmModal({
            isOpen: true,
            title: 'Elimina Tesserato',
            message: `Sei sicuro di voler eliminare il tesserato "${playerToDelete?.name}"? Questa azione è irreversibile.`,
            onConfirm: async () => {
              try {
                await deletePlayerDB(id);
                setPlayers(players.filter(p => p.id !== id));
              } catch (error) {
                console.error('Error deleting player:', error);
              }
            }
          });
        }}
        onBack={() => setView('home')}
      />
    );
  }

 if (view === 'gironi') {
    return (
      <GroupTournaments 
        onBack={() => setView('home')} 
      />
    );
  } 

  if (view === 'teams') {
    return (
      <TeamRegistrationView 
        tournament={tournament!} 
        teams={teams}
        currentTournamentTeams={currentTournamentTeams}
        onAddExistingTeam={addTeamToTournament}
        onCreateAndAddTeam={createAndAddTeam}
        onRemoveTeam={removeTeamFromTournament} 
        onGenerate={generateCalendar} 
      />
    );
  }
  
  if (view === 'roster') {
    return (
      <RosterView 
        teams={currentTournamentTeams} 
        players={players} 
        onAddPlayer={addPlayer} 
        onUpdatePlayer={updatePlayer}
        onRemovePlayer={removePlayer}
        onFinish={() => setView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24" onClick={() => setIsSettingsOpen(false)}>
      {/* Navbar */}
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="bg-slate-800 p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg tracking-tight uppercase">{tournament?.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            {activeTournamentId && (
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Condividi</span>
              </button>
            )}
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
                <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-black">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] font-bold text-slate-300 truncate max-w-[100px]">{user.email}</span>
              </div>
            )}
            <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
              {[
                { id: 'matches', icon: Calendar, label: 'Partite', show: tournament?.type === 'league' },
                { id: 'bracket', icon: LayoutDashboard, label: 'Tabellone', show: tournament?.type === 'knockout' },
                { id: 'standings', icon: Users, label: 'Classifica', show: tournament?.type === 'league' },
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
            
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50"
                  >
                    <button 
                      onClick={() => setView('roster')}
                      className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      Gestione Rose
                    </button>
                    <button 
                      onClick={() => updateTournamentStatus(activeTournamentId!, tournament?.status === 'nascosto' ? 'attivo' : 'nascosto')}
                      className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      {tournament?.status === 'nascosto' ? 'Mostra Torneo' : 'Nascondi Torneo'}
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button 
                      onClick={() => deleteTournament(activeTournamentId!)}
                      className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      Elimina Torneo
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {tournament?.status === 'nascosto' && (
        <div className="bg-amber-50 border-b border-amber-100 p-2 text-center text-[10px] font-black uppercase tracking-widest text-amber-700">
          Questo torneo è attualmente nascosto al pubblico
        </div>
      )}

      <main className="max-w-4xl mx-auto p-4 mt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'matches' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              {Array.from(new Set(matches.filter(m => m.tournamentId === activeTournamentId).map(m => m.round)))
                .sort((a: number, b: number) => a - b)
                .map(roundNum => {
                  const roundMatches = matches.filter(m => m.tournamentId === activeTournamentId && m.round === roundNum);
                  const isReturn = roundMatches[0]?.isReturnMatch;
                  
                  return (
                    <div key={roundNum} className="space-y-4">
                      <div className="flex items-center gap-4 px-2">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600">
                          Giornata {roundNum}
                        </h2>
                        <div className="h-px bg-slate-200 flex-1" />
                        {isReturn && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                            Ritorno
                          </span>
                        )}
                      </div>
                      <div className="grid gap-4">
                        {roundMatches.map(match => {
                          const teamA = teams.find(t => t.id === match.teamAId);
                          const teamB = teams.find(t => t.id === match.teamBId);
                          return (
                            <div 
                              key={match.id} 
                              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 text-right font-bold text-slate-700 truncate">{teamA?.name}</div>
                                <div className="flex items-center gap-4 px-6">
                                  <input 
                                    type="number"
                                    className="w-12 h-12 text-center text-2xl font-black bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={match.scoreA}
                                    onChange={(e) => updateMatchScore(match.id, parseInt(e.target.value) || 0, match.scoreB)}
                                  />
                                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">VS</div>
                                  <input 
                                    type="number"
                                    className="w-12 h-12 text-center text-2xl font-black bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={match.scoreB}
                                    onChange={(e) => updateMatchScore(match.id, match.scoreA, parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="flex-1 text-left font-bold text-slate-700 truncate">{teamB?.name}</div>
                              </div>
                              
                              <div className="flex justify-center">
                                <button 
                                  onClick={() => setSelectedMatchId(match.id)}
                                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
                                >
                                  <Award className="w-3 h-3" /> Referto Marcatori
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              {matches.filter(m => m.tournamentId === activeTournamentId).length === 0 && (
                <div className="py-20 text-center text-slate-400 italic">Nessun match generato.</div>
              )}
            </motion.div>
          )}

          {activeTab === 'standings' && tournament?.type === 'league' && (
            <StandingsTable standings={standings} />
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

          {activeTab === 'bracket' && tournament?.type === 'knockout' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-x-auto pb-8">
              <div className="flex gap-12 min-w-max p-4">
                {[16, 8, 4, 2].filter(r => matches.some(m => m.tournamentId === activeTournamentId && m.round === r))
                  .sort((a, b) => b - a)
                  .map(roundSize => (
                    <div key={roundSize} className="flex flex-col gap-8">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-4">
                        {roundSize === 2 ? 'Finale' : roundSize === 4 ? 'Semifinali' : roundSize === 8 ? 'Quarti' : 'Ottavi'}
                      </h3>
                      <div className="flex flex-col justify-around flex-1 gap-8">
                        {matches.filter(m => m.tournamentId === activeTournamentId && m.round === roundSize)
                          .sort((a, b) => (a.positionInRound || 0) - (b.positionInRound || 0))
                          .map(match => {
                            const teamA = teams.find(t => t.id === match.teamAId);
                            const teamB = teams.find(t => t.id === match.teamBId);
                            return (
                              <div 
                                key={match.id} 
                                onClick={() => setSelectedMatchId(match.id)}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-64 cursor-pointer hover:border-indigo-400 transition-all space-y-2"
                              >
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
        </AnimatePresence>
      </main>

      {/* Match Report Modal */}
      <AnimatePresence>
        {selectedMatchId && (
          <MatchReportForm 
            match={matches.find(m => m.id === selectedMatchId)!}
            teams={teams}
            players={players}
            events={events.filter(e => e.matchId === selectedMatchId)}
            onUpdateScore={(sA, sB) => updateMatchScore(selectedMatchId, sA, sB)}
            onAddEvent={(pId, type) => addMatchEvent(selectedMatchId, pId, type)}
            onRemoveEvent={removeMatchEvent}
            onClose={() => setSelectedMatchId(null)}
          />
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}

// --- Sub-Components ---

function HomeView({ tournaments, onSelect, onCreate, onDelete, onToggleStatus, setView }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Controlla la tua email per confermare l\'iscrizione!');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30 mb-6">
              <Trophy className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tournament Master</h1>
            <p className="text-slate-400 font-medium">Accedi per gestire i tuoi tornei.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
              <input 
                type="email"
                required
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <input 
                type="password"
                required
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
            </button>
          </form>

          <div className="text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bentornato!</h1>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sessione attiva come {user.email}
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-slate-400 hover:text-red-500 font-bold text-xs transition-colors"
            >
              Logout
            </button>

           <button 
              onClick={() => setView('clubs')}
              className="bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-2xl font-black text-sm shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" /> Anagrafica Club
            </button>

            <button 
              onClick={() => setView('gironi')}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700 transition-all"
            >
              <Trophy className="w-4 h-4" /> Torneo a Gironi
            </button>

            <button 
              onClick={onCreate}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuovo Torneo
            </button>
          </div>
        </div>

          <div className="grid sm:grid-cols-2 gap-6">
          {tournaments.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Trophy className="w-8 h-8" />
              </div>
              <p className="text-slate-400 font-medium">Non hai ancora creato nessun torneo.</p>
            </div>
          )}
          {tournaments.map((t: any) => (
            <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${t.status === 'attivo' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {t.status}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onToggleStatus(t.id, t.status === 'nascosto' ? 'attivo' : 'nascosto')} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(t.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">{t.name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{t.type === 'league' ? 'Campionato' : 'Eliminazione'} • {t.maxTeams} Squadre</p>
              <button 
                onClick={() => onSelect(t.id)}
                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black text-sm group-hover:bg-indigo-600 transition-colors"
              >
                Gestisci Torneo
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupView({ onCreate, onBack }: { onCreate: (name: string, type: TournamentType, maxTeams: number) => void, onBack: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TournamentType>('league');
  const [maxTeams, setMaxTeams] = useState(8);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-8"
      >
        <div className="flex justify-between items-start">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
          <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <div className="w-6" />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Crea Torneo</h1>
          <p className="text-slate-400 text-sm">Inserisci i dettagli per iniziare la competizione.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Torneo</label>
            <input 
              type="text"
              placeholder="Es. Champions League 2024"
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modalità</label>
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none"
                value={type}
                onChange={e => setType(e.target.value as TournamentType)}
              >
                <option value="league">Campionato</option>
                <option value="knockout">Eliminazione</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Squadre</label>
              <input 
                type="number"
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                value={maxTeams}
                onChange={e => setMaxTeams(parseInt(e.target.value) || 2)}
              />
            </div>
          </div>

          <button 
            disabled={!name}
            onClick={() => onCreate(name, type, maxTeams)}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Inizia Configurazione
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TeamRegistrationView({ tournament, teams, currentTournamentTeams, onAddExistingTeam, onCreateAndAddTeam, onRemoveTeam, onGenerate }: any) {
  const [name, setName] = useState('');
  const canGenerate = currentTournamentTeams.length >= 2 && currentTournamentTeams.length === tournament.maxTeams;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => window.location.reload()} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Iscrizione Squadre</h1>
            <p className="text-slate-400 text-sm">Aggiungi le squadre fino al limite di {tournament.maxTeams}.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Seleziona Club dall'Anagrafica</label>
            <div className="relative">
              <select 
                className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer"
                onChange={(e) => { if (e.target.value) onAddExistingTeam(e.target.value); e.target.value = ''; }}
                disabled={currentTournamentTeams.length >= tournament.maxTeams}
              >
                <option value="">Scegli un club...</option>
                {teams.filter((t: any) => !currentTournamentTeams.some((ct: any) => ct.id === t.id)).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="w-5 h-5 text-slate-300 rotate-90" />
              </div>
            </div>
            {teams.length === 0 && (
              <p className="text-[10px] font-bold text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                L'anagrafica è vuota. Crea prima i club nella sezione "Anagrafica Club".
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-300 bg-white px-4">Oppure crea club rapido</div>
          </div>

          <div className="flex gap-3">
            <input 
              placeholder="Nome Club"
              className="flex-1 p-5 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={currentTournamentTeams.length >= tournament.maxTeams}
            />
            <button 
              onClick={() => { onCreateAndAddTeam({ name }); setName(''); }}
              disabled={!name || currentTournamentTeams.length >= tournament.maxTeams}
              className="bg-slate-900 text-white px-8 rounded-2xl font-black disabled:opacity-50 hover:bg-slate-800 transition-colors"
            >
              Crea
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Squadre Iscritte ({currentTournamentTeams.length}/{tournament.maxTeams})</h3>
            </div>
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
              {currentTournamentTeams.map((t: any) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-slate-400">
                      {t.name.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-700">{t.name}</span>
                  </div>
                  <button onClick={() => onRemoveTeam(t.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {currentTournamentTeams.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-sm italic">Nessuna squadra iscritta.</div>
              )}
            </div>
          </div>

          <button 
            disabled={!canGenerate}
            onClick={onGenerate}
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            Genera Calendario <ChevronRight className="w-5 h-5" />
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestione Rose</h1>
            <p className="text-slate-400 text-sm">Configura i tesserati per ogni squadra del torneo.</p>
          </div>
          <button 
            onClick={onFinish}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20"
          >
            Vai alla Dashboard
          </button>
        </div>

        <div className="grid md:grid-cols-[250px_1fr] gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Squadre</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {teams.map((t: any) => (
                <button 
                  key={t.id} 
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`w-full p-4 text-left font-bold text-sm transition-all ${selectedTeamId === t.id ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" /> {editingPlayerId ? 'Modifica Giocatore' : 'Nuovo Giocatore'}
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <input 
                  placeholder="Nome"
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <input 
                  type="number"
                  placeholder="N°"
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={number || ''}
                  onChange={e => setNumber(parseInt(e.target.value) || 0)}
                />
                <input 
                  placeholder="ID Tesserato"
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={playerExternalId}
                  onChange={e => setPlayerExternalId(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {editingPlayerId ? (
                  <>
                    <button 
                      onClick={() => { onUpdatePlayer(editingPlayerId, { name, number, playerExternalId }); setEditingPlayerId(null); setName(''); setNumber(0); setPlayerExternalId(''); }}
                      className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all"
                    >
                      Salva Modifiche
                    </button>
                    <button 
                      onClick={() => { setEditingPlayerId(null); setName(''); setNumber(0); setPlayerExternalId(''); }}
                      className="px-6 bg-slate-100 text-slate-400 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      Annulla
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => { onAddPlayer(selectedTeamId, name, number, playerExternalId); setName(''); setNumber(0); setPlayerExternalId(''); }}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all"
                  >
                    Aggiungi alla Rosa
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Giocatori in Rosa ({teamPlayers.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {teamPlayers.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">Nessun giocatore aggiunto.</div>}
                {teamPlayers.map((p: any) => (
                  <div key={p.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs">
                        {p.number}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">ID: {p.playerExternalId}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select 
                        className="text-[10px] font-black uppercase tracking-widest bg-slate-100 rounded-lg px-2 outline-none border-none focus:ring-0"
                        value={p.teamId}
                        onChange={(e) => onUpdatePlayer(p.id, { teamId: e.target.value })}
                      >
                        {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button 
                        onClick={() => { setEditingPlayerId(p.id); setName(p.name); setNumber(p.number); setPlayerExternalId(p.playerExternalId); }}
                        className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button onClick={() => onRemovePlayer(p.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




