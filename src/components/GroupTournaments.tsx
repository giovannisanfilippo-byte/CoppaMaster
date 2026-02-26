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

    return Object.values(stats).sort((a: any, b: any) =>
