import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase";
import { Trophy, ArrowLeft, Users, X, Award } from 'lucide-react';

export const GroupTournaments = ({ onBack, onTournamentCreated }: { onBack: () => void, onTournamentCreated?: () => void }) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<any[]>([]);
  const [groups, setGroups] = useState<{name: string, teams: any[], matches: any[]}[]>([]);
  const [numGroups, setNumGroups] = useState(2);
  const [matchMode, setMatchMode] = useState<'andata' | 'andata_ritorno'>('andata_ritorno');
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [matchEvents, setMatchEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'gironi' | 'marcatori' | 'assist' | 'finale'>('gironi');
  const [playoffMatches, setPlayoffMatches] = useState<any[]>([]);
  const [playoffGenerated, setPlayoffGenerated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const loadData = async () => {
      const { data: teamsData } = await supabase.from('teams').select('*');
      const { data: playersData } = await supabase.from('players').select('*');
      if (teamsData) setTeams(teamsData);
      if (playersData) setPlayers(playersData);
    };
    loadData();
  }, []);

  const createGroups = async () => {
    if (selectedTeams.length < 3 || !user) return;
    try {
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .insert([{ name: `Torneo Gironi ${new Date().toLocaleDateString('it-IT')}`, type: 'league', max_teams: selectedTeams.length, status: 'attivo', user_id: user.id }])
        .select().single();
      if (tErr) throw tErr;
      setTournamentId(tournament.id);

      await supabase.from('tournament_teams').insert(selectedTeams.map(t => ({ tournament_id: tournament.id, club_id: t.id })));

      const shuffled = [...selectedTeams].sort(() => Math.random() - 0.5);
      const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const newGroups: any[] = Array.from({ length: numGroups }, (_, i) => ({ name: groupNames[i], teams: [], matches: [] }));
      shuffled.forEach((team, i) => newGroups[i % numGroups].teams.push(team));

      for (const group of newGroups) {
        const matchesToInsert: any[] = [];
        for (let i = 0; i < group.teams.length; i++) {
          for (let j = i + 1; j < group.teams.length; j++) {
            matchesToInsert.push({ tournament_id: tournament.id, team_a_id: group.teams[i].id, team_b_id: group.teams[j].id, score_a: 0, score_b: 0, status: 'scheduled', round: 1, match_type: `girone_${group.name}`, is_return_match: false, user_id: user.id });
            if (matchMode === 'andata_ritorno') {
              matchesToInsert.push({ tournament_id: tournament.id, team_a_id: group.teams[j].id, team_b_id: group.teams[i].id, score_a: 0, score_b: 0, status: 'scheduled', round: 2, match_type: `girone_${group.name}`, is_return_match: true, user_id: user.id });
            }
          }
        }
        const { data: savedMatches } = await supabase.from('matches').insert(matchesToInsert).select();
        if (savedMatches) {
          group.matches = savedMatches.map((m: any) => ({
            id: m.id, teamA: group.teams.find((t: any) => t.id === m.team_a_id), teamB: group.teams.find((t: any) => t.id === m.team_b_id),
            scoreA: m.score_a, scoreB: m.score_b, played: m.status === 'finished', isReturn: m.is_return_match
          }));
        }
      }

      setGroups(newGroups);
      if (onTournamentCreated) onTournamentCreated();
    } catch (error: any) {
      alert('Errore: ' + error.message);
    }
  };

  const updateScore = async (groupIdx: number, matchIdx: number, scoreA: number, scoreB: number) => {
    const match = groups[groupIdx].matches[matchIdx];
    await supabase.from('matches').update({ score_a: scoreA, score_b: scoreB, status: 'finished' }).eq('id', match.id);
    const newGroups = [...groups];
    newGroups[groupIdx].matches[matchIdx] = { ...match, scoreA, scoreB, played: true };
    setGroups(newGroups);
  };

  const openMatchReport = async (match: any) => {
    setSelectedMatch(match);
    const { data } = await supabase.from('match_events').select('*').eq('match_id', match.id);
    if (data) setMatchEvents(data.map((e: any) => ({ id: e.id, matchId: e.match_id, playerId: e.player_id, type: e.event_type })));
  };

  const addEvent = async (playerId: string, type: 'gol' | 'assist') => {
    if (!selectedMatch || !user) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const isTeamA = player.team_id === selectedMatch.teamA?.id;
    const currentGoals = matchEvents.filter(e => e.type === 'gol' && players.find(p => p.id === e.playerId)?.team_id === player.team_id).length;
    const scoreLimit = isTeamA ? selectedMatch.scoreA : selectedMatch.scoreB;
    if (type === 'gol' && currentGoals >= scoreLimit) { alert(`Hai già assegnato tutti i ${scoreLimit} gol per questa squadra.`); return; }
    const { data } = await supabase.from('match_events').insert([{ match_id: selectedMatch.id, player_id: playerId, event_type: type }]).select().single();
    if (data) {
      const newEvent = { id: data.id, matchId: data.match_id, playerId: data.player_id, type: data.event_type };
      setMatchEvents([...matchEvents, newEvent]);
      setAllEvents([...allEvents, newEvent]);
    }
  };

  const removeEvent = async (eventId: string) => {
    await supabase.from('match_events').delete().eq('id', eventId);
    setMatchEvents(matchEvents.filter(e => e.id !== eventId));
    setAllEvents(allEvents.filter(e => e.id !== eventId));
  };

  const getGroupStandings = (group: any) => {
    const stats: Record<string, any> = {};
    group.teams.forEach((t: any) => { stats[t.id] = { id: t.id, name: t.name, groupName: group.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    group.matches.filter((m: any) => m.played).forEach((m: any) => {
      const sA = stats[m.teamA?.id]; const sB = stats[m.teamB?.id];
      if (!sA || !sB) return;
      sA.p++; sB.p++;
      sA.gf += m.scoreA; sA.ga += m.scoreB;
      sB.gf += m.scoreB; sB.ga += m.scoreA;
      if (m.scoreA > m.scoreB) { sA.w++; sB.l++; sA.pts += 3; }
      else if (m.scoreB > m.scoreA) { sB.w++; sA.l++; sB.pts += 3; }
      else { sA.d++; sB.d++; sA.pts++; sB.pts++; }
    });
    return Object.values(stats).sort((a: any, b: any) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
  };

  const allGroupMatchesPlayed = () => {
    return groups.length > 0 && groups.every(g => g.matches.every((m: any) => m.played));
  };

  const generatePlayoff = async () => {
    if (!tournamentId || !user) return;

    const groupStandings = groups.map(g => ({ groupName: g.name, standings: getGroupStandings(g) }));
    const firsts = groupStandings.map(g => ({ ...g.standings[0], position: 1 }));
    const seconds = groupStandings.map(g => ({ ...g.standings[1], position: 2 }));
    const thirds = groupStandings.filter(g => g.standings.length >= 3).map(g => ({ ...g.standings[2], position: 3 }));

    let qualifiedTeams = [...firsts, ...seconds];
    let bracketSize = 2;
    while (bracketSize < qualifiedTeams.length) bracketSize *= 2;

    if (qualifiedTeams.length < bracketSize && thirds.length > 0) {
      const sortedThirds = thirds.sort((a: any, b: any) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
      qualifiedTeams = [...qualifiedTeams, ...sortedThirds.slice(0, bracketSize - qualifiedTeams.length)];
    }

    // Crea accoppiamenti primo turno
    const matchups: any[] = [];
    const usedTeams = new Set<string>();
    for (const first of firsts) {
      if (usedTeams.has(first.id)) continue;
      const opponent = seconds.find((s: any) => s.groupName !== first.groupName && !usedTeams.has(s.id));
      if (opponent) {
        matchups.push({ teamA: first, teamB: opponent });
        usedTeams.add(first.id);
        usedTeams.add(opponent.id);
      }
    }
    const remaining = qualifiedTeams.filter(t => !usedTeams.has(t.id));
    for (let i = 0; i < remaining.length - 1; i += 2) {
      matchups.push({ teamA: remaining[i], teamB: remaining[i + 1] });
    }

    try {
      // Crea tutti i round del bracket dal più piccolo (finale) al più grande
      const rounds: { round: number, count: number }[] = [];
      let r = 2;
      while (r <= bracketSize) {
        rounds.push({ round: r, count: r / 2 });
        r *= 2;
      }

      // Salva tutti i round vuoti
      const savedRounds: { round: number, matches: any[] }[] = [];
      for (const roundInfo of rounds) {
        const toInsert = Array.from({ length: roundInfo.count }, (_, i) => ({
          tournament_id: tournamentId,
          team_a_id: null,
          team_b_id: null,
          score_a: 0, score_b: 0,
          status: 'scheduled',
          round: roundInfo.round,
          match_type: 'playoff',
          is_return_match: false,
          next_match_id: null,
          position_in_round: i,
          user_id: user.id
        }));
        const { data: saved } = await supabase.from('matches').insert(toInsert).select();
        if (saved) savedRounds.push({ round: roundInfo.round, matches: saved });
      }

      // Collega next_match_id: dal round più grande al più piccolo
      const reversedRounds = [...savedRounds].reverse();
      for (let i = 0; i < reversedRounds.length - 1; i++) {
        const currentRound = reversedRounds[i];
        const nextRound = reversedRounds[i + 1];
        for (let j = 0; j < currentRound.matches.length; j++) {
          const nextMatch = nextRound.matches[Math.floor(j / 2)];
          await supabase.from('matches').update({ next_match_id: nextMatch.id }).eq('id', currentRound.matches[j].id);
          currentRound.matches[j].next_match_id = nextMatch.id;
        }
      }

      // Assegna squadre al primo round
      const firstRound = reversedRounds[0];
      for (let i = 0; i < matchups.length; i++) {
        await supabase.from('matches').update({ team_a_id: matchups[i].teamA.id, team_b_id: matchups[i].teamB.id }).eq('id', firstRound.matches[i].id);
        firstRound.matches[i].team_a_id = matchups[i].teamA.id;
        firstRound.matches[i].team_b_id = matchups[i].teamB.id;
      }

      // Costruisci stato locale
      const allPlayoffMatches = savedRounds.flatMap((sr, srIdx) =>
        sr.matches.map((m: any, idx: number) => ({
          id: m.id,
          teamA: srIdx === savedRounds.length - 1 && matchups[idx] ? matchups[idx].teamA : teams.find(t => t.id === m.team_a_id) || null,
          teamB: srIdx === savedRounds.length - 1 && matchups[idx] ? matchups[idx].teamB : teams.find(t => t.id === m.team_b_id) || null,
          scoreA: 0, scoreB: 0,
          played: false,
          round: m.round,
          positionInRound: idx,
          nextMatchId: m.next_match_id
        }))
      );

      setPlayoffMatches(allPlayoffMatches);
      setPlayoffGenerated(true);
      setActiveTab('finale');
    } catch (error: any) {
      alert('Errore generazione playoff: ' + error.message);
    }
  };

  const updatePlayoffScore = async (matchIdx: number, scoreA: number, scoreB: number) => {
    const match = playoffMatches[matchIdx];
    await supabase.from('matches').update({ score_a: scoreA, score_b: scoreB, status: 'finished' }).eq('id', match.id);
    
    const updatedMatches = [...playoffMatches];
    updatedMatches[matchIdx] = { ...match, scoreA, scoreB, played: true };

    // Avanza il vincitore al turno successivo
    if (match.nextMatchId) {
      const winnerId = scoreA > scoreB ? match.teamA?.id : scoreB > scoreA ? match.teamB?.id : null;
      const winner = scoreA > scoreB ? match.teamA : scoreB > scoreA ? match.teamB : null;
      
      if (winnerId && winner) {
        const nextMatchIndex = updatedMatches.findIndex(m => m.id === match.nextMatchId);
        if (nextMatchIndex !== -1) {
          const isTeamB = match.positionInRound % 2 !== 0;
          const updatedNextMatch = {
            ...updatedMatches[nextMatchIndex],
            teamA: isTeamB ? updatedMatches[nextMatchIndex].teamA : winner,
            teamB: isTeamB ? winner : updatedMatches[nextMatchIndex].teamB,
          };
          updatedMatches[nextMatchIndex] = updatedNextMatch;

          await supabase.from('matches').update({
            team_a_id: isTeamB ? updatedMatches[nextMatchIndex].teamA?.id : winnerId,
            team_b_id: isTeamB ? winnerId : updatedMatches[nextMatchIndex].teamB?.id
          }).eq('id', match.nextMatchId);
        }
      }
    }

    setPlayoffMatches(updatedMatches);
  };

  const getScorerStats = () => {
    const stats: Record<string, any> = {};
    allEvents.filter(e => e.type === 'gol').forEach(e => {
      const player = players.find(p => p.id === e.playerId);
      if (!player) return;
      if (!stats[e.playerId]) { const team = teams.find(t => t.id === player.team_id); stats[e.playerId] = { name: player.name, team: team?.name || '', goals: 0 }; }
      stats[e.playerId].goals++;
    });
    return Object.values(stats).sort((a: any, b: any) => b.goals - a.goals);
  };

  const getAssistStats = () => {
    const stats: Record<string, any> = {};
    allEvents.filter(e => e.type === 'assist').forEach(e => {
      const player = players.find(p => p.id === e.playerId);
      if (!player) return;
      if (!stats[e.playerId]) { const team = teams.find(t => t.id === player.team_id); stats[e.playerId] = { name: player.name, team: team?.name || '', assists: 0 }; }
      stats[e.playerId].assists++;
    });
    return Object.values(stats).sort((a: any, b: any) => b.assists - a.assists);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Torna alla Home
          </button>
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 uppercase">Configurazione Gironi</h1>
          </div>
          <div className="w-24"></div>
        </div>

        {groups.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="flex items-center gap-2 font-bold mb-4 text-slate-800"><Users className="w-5 h-5 text-blue-500" /> Seleziona Squadre</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {teams.map(team => (
                  <div key={team.id} onClick={() => { if (selectedTeams.find(t => t.id === team.id)) setSelectedTeams(selectedTeams.filter(t => t.id !== team.id)); else setSelectedTeams([...selectedTeams, team]); }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedTeams.find(t => t.id === team.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                    <span className="font-bold text-sm">{team.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 space-y-6">
              <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                <h3 className="text-xl font-bold mb-2">Pronto per iniziare?</h3>
                <p className="text-blue-100 mb-6">Hai selezionato {selectedTeams.length} squadre.</p>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <label className="text-white font-bold text-sm">Numero di gironi:</label>
                    <select value={numGroups} onChange={e => setNumGroups(parseInt(e.target.value))} className="bg-white text-blue-600 font-black px-4 py-2 rounded-xl outline-none">
                      {[2, 3, 4].map(n => <option key={n} value={n}>{n} gironi</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-white font-bold text-sm">Tipo partite:</label>
                    <select value={matchMode} onChange={e => setMatchMode(e.target.value as 'andata' | 'andata_ritorno')} className="bg-white text-blue-600 font-black px-4 py-2 rounded-xl outline-none">
                      <option value="andata">Solo Andata</option>
                      <option value="andata_ritorno">Andata e Ritorno</option>
                    </select>
                  </div>
                </div>
                <button onClick={createGroups} disabled={selectedTeams.length < 3} className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-sm uppercase hover:bg-blue-50 disabled:opacity-50 transition-all">
                  Crea Gironi Automatici
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={() => setGroups([])} className="text-sm font-bold text-slate-400 hover:text-slate-600">← Riconfigura gironi</button>
              <div className="flex gap-2 bg-white border border-slate-200 p-1 rounded-2xl flex-wrap">
                {(['gironi', 'marcatori', 'assist'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                    {tab === 'gironi' ? '🏆 Gironi' : tab === 'marcatori' ? '⚽ Marcatori' : '🎯 Assist'}
                  </button>
                ))}
                {(allGroupMatchesPlayed() || playoffGenerated) && (
                  <button onClick={() => setActiveTab('finale')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'finale' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                    🏅 Fase Finale
                  </button>
                )}
              </div>
              {allGroupMatchesPlayed() && !playoffGenerated && (
                <button onClick={generatePlayoff} className="bg-indigo-600 text-white px-6 py-2 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all">
                  🏅 Genera Fase Finale
                </button>
              )}
            </div>

            {activeTab === 'gironi' && groups.map((group, groupIdx) => (
              <div key={group.name} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-blue-600 px-6 py-4"><h2 className="text-white font-black text-lg">Girone {group.name}</h2></div>
                <div className="grid md:grid-cols-2 gap-6 p-6">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Classifica</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="text-[10px] font-black uppercase text-slate-400">
                        <th className="text-left py-2">Squadra</th>
                        <th className="text-center py-2">P</th><th className="text-center py-2">V</th>
                        <th className="text-center py-2">N</th><th className="text-center py-2">S</th>
                        <th className="text-center py-2">GF</th><th className="text-center py-2">GS</th>
                        <th className="text-center py-2">PT</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {getGroupStandings(group).map((s: any, i: number) => (
                          <tr key={s.name} className={`hover:bg-slate-50 ${i < 2 ? 'font-bold' : ''}`}>
                            <td className="py-2 text-slate-700 flex items-center gap-2">
                              {i < 2 && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>}
                              {i === 2 && groups.length >= 3 && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>}
                              {i + 1}. {s.name}
                            </td>
                            <td className="text-center py-2">{s.p}</td>
                            <td className="text-center py-2 text-emerald-600">{s.w}</td>
                            <td className="text-center py-2 text-slate-400">{s.d}</td>
                            <td className="text-center py-2 text-red-400">{s.l}</td>
                            <td className="text-center py-2">{s.gf}</td>
                            <td className="text-center py-2">{s.ga}</td>
                            <td className="text-center py-2 font-black text-blue-600">{s.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex gap-3 text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Qualificati</span>
                      {groups.length >= 3 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Possibile terza</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Partite</h3>
                    <div className="space-y-2">
                      {group.matches.map((match: any, matchIdx: number) => (
                        <div key={matchIdx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                          <span className="text-xs font-bold text-slate-600 flex-1 text-right truncate">{match.teamA?.name}</span>
                          <input type="number" min="0" className="w-10 h-8 text-center text-sm font-black bg-white rounded-lg border border-slate-200 outline-none" value={match.scoreA} onChange={e => updateScore(groupIdx, matchIdx, parseInt(e.target.value) || 0, match.scoreB)} />
                          <span className="text-[10px] font-black text-slate-300">VS</span>
                          <input type="number" min="0" className="w-10 h-8 text-center text-sm font-black bg-white rounded-lg border border-slate-200 outline-none" value={match.scoreB} onChange={e => updateScore(groupIdx, matchIdx, match.scoreA, parseInt(e.target.value) || 0)} />
                          <span className="text-xs font-bold text-slate-600 flex-1 truncate">{match.teamB?.name}</span>
                          <button onClick={() => openMatchReport(match)} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 whitespace-nowrap">Referto</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {activeTab === 'finale' && (
              <div className="space-y-6">
                {!playoffGenerated ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
                    <p className="text-slate-400 italic">Completa tutte le partite dei gironi per generare la fase finale.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-indigo-600 px-6 py-4"><h2 className="text-white font-black text-lg">🏅 Fase Finale</h2></div>
                    <div className="p-6 space-y-3">
                      {playoffMatches.map((match: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                          <div className="flex-1 text-right">
                            <div className="font-black text-slate-800">{match.teamA?.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold">Girone {match.teamA?.groupName} - {match.teamA?.position === 1 ? '1°' : match.teamA?.position === 2 ? '2°' : '3°'}</div>
                          </div>
                          <input type="number" min="0" className="w-12 h-12 text-center text-xl font-black bg-white rounded-xl border border-slate-200 outline-none" value={match.scoreA} onChange={e => updatePlayoffScore(idx, parseInt(e.target.value) || 0, match.scoreB)} />
                          <span className="text-[10px] font-black text-slate-300">VS</span>
                          <input type="number" min="0" className="w-12 h-12 text-center text-xl font-black bg-white rounded-xl border border-slate-200 outline-none" value={match.scoreB} onChange={e => updatePlayoffScore(idx, match.scoreA, parseInt(e.target.value) || 0)} />
                          <div className="flex-1">
                            <div className="font-black text-slate-800">{match.teamB?.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold">Girone {match.teamB?.groupName} - {match.teamB?.position === 1 ? '1°' : match.teamB?.position === 2 ? '2°' : '3°'}</div>
                          </div>
                          <button onClick={() => openMatchReport(match)} className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full hover:bg-indigo-100 whitespace-nowrap">Referto</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'marcatori' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-blue-600 px-6 py-4"><h2 className="text-white font-black text-lg">⚽ Classifica Marcatori</h2></div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <tr><th className="px-4 py-4">Pos</th><th className="px-4 py-4">Giocatore</th><th className="px-4 py-4">Squadra</th><th className="px-4 py-4 text-center">Gol</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getScorerStats().length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">Nessun marcatore registrato.</td></tr>}
                    {getScorerStats().map((s: any, i: number) => (
                      <tr key={s.name} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-black text-slate-300">{i + 1}</td>
                        <td className="px-4 py-4 font-bold text-slate-700">{s.name}</td>
                        <td className="px-4 py-4 text-slate-400">{s.team}</td>
                        <td className="px-4 py-4 text-center font-black text-blue-600">{s.goals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'assist' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-blue-600 px-6 py-4"><h2 className="text-white font-black text-lg">🎯 Classifica Assist</h2></div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <tr><th className="px-4 py-4">Pos</th><th className="px-4 py-4">Giocatore</th><th className="px-4 py-4">Squadra</th><th className="px-4 py-4 text-center">Assist</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getAssistStats().length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">Nessun assist registrato.</td></tr>}
                    {getAssistStats().map((s: any, i: number) => (
                      <tr key={s.name} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-black text-slate-300">{i + 1}</td>
                        <td className="px-4 py-4 font-bold text-slate-700">{s.name}</td>
                        <td className="px-4 py-4 text-slate-400">{s.team}</td>
                        <td className="px-4 py-4 text-center font-black text-blue-600">{s.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Referto Partita</h2>
                <button onClick={() => setSelectedMatch(null)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center justify-center gap-8">
                <div className="flex-1 text-right font-black text-lg">{selectedMatch.teamA?.name}</div>
                <div className="flex gap-4 items-center">
                  <span className="w-16 h-16 flex items-center justify-center text-3xl font-black bg-white/10 rounded-2xl">{selectedMatch.scoreA}</span>
                  <span className="text-white/20 font-black">VS</span>
                  <span className="w-16 h-16 flex items-center justify-center text-3xl font-black bg-white/10 rounded-2xl">{selectedMatch.scoreB}</span>
                </div>
                <div className="flex-1 font-black text-lg">{selectedMatch.teamB?.name}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {[selectedMatch.teamA, selectedMatch.teamB].map((team: any) => (
                  <div key={team?.id} className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{team?.name}</h3>
                    {players.filter(p => p.team_id === team?.id).map(player => {
                      const pEvents = matchEvents.filter(e => e.playerId === player.id);
                      const goals = pEvents.filter(e => e.type === 'gol');
                      const assists = pEvents.filter(e => e.type === 'assist');
                      return (
                        <div key={player.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800">{player.name}</div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {goals.map((g: any) => <button key={g.id} onClick={() => removeEvent(g.id)} className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center text-[8px] font-black hover:bg-red-100 hover:text-red-600">G</button>)}
                              {assists.map((a: any) => <button key={a.id} onClick={() => removeEvent(a.id)} className="w-5 h-5 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-[8px] font-black hover:bg-red-100 hover:text-red-600">A</button>)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => addEvent(player.id, 'gol')} className="p-2 bg-white text-slate-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all"><Trophy className="w-3.5 h-3.5" /></button>
                            <button onClick={() => addEvent(player.id, 'assist')} className="p-2 bg-white text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"><Award className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedMatch(null)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
