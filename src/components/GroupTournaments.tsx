import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase";
import { Trophy, ArrowLeft, Users, Calendar, Trash2 } from 'lucide-react';

export const GroupTournaments = ({ onBack }: { onBack: () => void }) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<any[]>([]);
  const [groups, setGroups] = useState<{name: string, teams: any[], matches: any[]}[]>([]);
  const [numGroups, setNumGroups] = useState(2);

  useEffect(() => {
    const loadTeams = async () => {
      const { data } = await supabase.from('teams').select('*');
      if (data) setTeams(data);
    };
    loadTeams();
  }, []);

  const createGroups = () => {
    if (selectedTeams.length < 3) return;
    
    const shuffled = [...selectedTeams].sort(() => Math.random() - 0.5);
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const newGroups: {name: string, teams: any[], matches: any[]}[] = [];

    for (let i = 0; i < numGroups; i++) {
      newGroups.push({ name: groupNames[i], teams: [], matches: [] });
    }

    shuffled.forEach((team, i) => {
      newGroups[i % numGroups].teams.push(team);
    });

    // Genera partite per ogni girone (andata e ritorno)
    newGroups.forEach(group => {
      const matches: any[] = [];
      for (let i = 0; i < group.teams.length; i++) {
        for (let j = i + 1; j < group.teams.length; j++) {
          matches.push({
            teamA: group.teams[i],
            teamB: group.teams[j],
            scoreA: 0,
            scoreB: 0,
            played: false
          });
          matches.push({
            teamA: group.teams[j],
            teamB: group.teams[i],
            scoreA: 0,
            scoreB: 0,
            played: false,
            isReturn: true
          });
        }
      }
      group.matches = matches;
    });

    setGroups(newGroups);
  };

  const updateScore = (groupIdx: number, matchIdx: number, scoreA: number, scoreB: number) => {
    const newGroups = [...groups];
    newGroups[groupIdx].matches[matchIdx].scoreA = scoreA;
    newGroups[groupIdx].matches[matchIdx].scoreB = scoreB;
    newGroups[groupIdx].matches[matchIdx].played = true;
    setGroups(newGroups);
  };

  const getGroupStandings = (group: any) => {
    const stats: Record<string, any> = {};
    group.teams.forEach((t: any) => {
      stats[t.id] = { name: t.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    });

    group.matches.filter((m: any) => m.played).forEach((m: any) => {
      const sA = stats[m.teamA.id];
      const sB = stats[m.teamB.id];
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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
            {/* Colonna 1: Lista Squadre */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="flex items-center gap-2 font-bold mb-4 text-slate-800">
                <Users className="w-5 h-5 text-blue-500" /> Seleziona Squadre
              </h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {teams.map(team => (
                  <div 
                    key={team.id}
                    onClick={() => {
                      if (selectedTeams.find(t => t.id === team.id)) {
                        setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
                      } else {
                        setSelectedTeams([...selectedTeams, team]);
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTeams.find(t => t.id === team.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold text-sm">{team.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Colonna 2 e 3 */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                <h3 className="text-xl font-bold mb-2">Pronto per iniziare?</h3>
                <p className="text-blue-100 mb-6">Hai selezionato {selectedTeams.length} squadre. Ora puoi dividerle in gironi.</p>
                
                <div className="flex items-center gap-4 mb-6">
                  <label className="text-white font-bold text-sm">Numero di gironi:</label>
                  <select 
                    value={numGroups}
                    onChange={e => setNumGroups(parseInt(e.target.value))}
                    className="bg-white text-blue-600 font-black px-4 py-2 rounded-xl outline-none"
                  >
                    {[2, 3, 4].map(n => (
                      <option key={n} value={n}>{n} gironi</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={createGroups}
                  disabled={selectedTeams.length < 3}
                  className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-sm uppercase hover:bg-blue-50 disabled:opacity-50 transition-all"
                >
                  Crea Gironi Automatici
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Vista Gironi */
          <div className="space-y-8">
            <button 
              onClick={() => setGroups([])}
              className="text-sm font-bold text-slate-400 hover:text-slate-600"
            >
              ← Riconfigura gironi
            </button>

            {groups.map((group, groupIdx) => (
              <div key={group.name} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-blue-600 px-6 py-4">
                  <h2 className="text-white font-black text-lg">Girone {group.name}</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6 p-6">
                  {/* Classifica girone */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Classifica</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-black uppercase text-slate-400">
                          <th className="text-left py-2">Squadra</th>
                          <th className="text-center py-2">P</th>
                          <th className="text-center py-2">V</th>
                          <th className="text-center py-2">N</th>
                          <th className="text-center py-2">S</th>
                          <th className="text-center py-2">GF</th>
                          <th className="text-center py-2">GS</th>
                          <th className="text-center py-2">PT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {getGroupStandings(group).map((s: any, i: number) => (
                          <tr key={s.name} className="hover:bg-slate-50">
                            <td className="py-2 font-bold text-slate-700">{i + 1}. {s.name}</td>
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
                  </div>

                  {/* Partite girone */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Partite</h3>
                    <div className="space-y-2">
                      {group.matches.map((match: any, matchIdx: number) => (
                        <div key={matchIdx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                          <span className="text-xs font-bold text-slate-600 flex-1 text-right truncate">{match.teamA.name}</span>
                          <input
                            type="number"
                            min="0"
                            className="w-10 h-8 text-center text-sm font-black bg-white rounded-lg border border-slate-200 outline-none"
                            value={match.scoreA}
                            onChange={e => updateScore(groupIdx, matchIdx, parseInt(e.target.value) || 0, match.scoreB)}
                          />
                          <span className="text-[10px] font-black text-slate-300">VS</span>
                          <input
                            type="number"
                            min="0"
                            className="w-10 h-8 text-center text-sm font-black bg-white rounded-lg border border-slate-200 outline-none"
                            value={match.scoreB}
                            onChange={e => updateScore(groupIdx, matchIdx, match.scoreA, parseInt(e.target.value) || 0)}
                          />
                          <span className="text-xs font-bold text-slate-600 flex-1 truncate">{match.teamB.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
