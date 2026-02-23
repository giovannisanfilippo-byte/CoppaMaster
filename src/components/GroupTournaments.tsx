import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase";
import { Trophy, ArrowLeft, Users, Calendar } from 'lucide-react';

export const GroupTournaments = ({ onBack }: { onBack: () => void }) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<any[]>([]);
  const [groups, setGroups] = useState<{name: string, teams: any[]}[]>([]);

  // Carica le squadre dal database all'apertura
  useEffect(() => {
    const loadTeams = async () => {
      const { data } = await supabase.from('teams').select('*');
      if (data) setTeams(data);
    };
    loadTeams();
  }, []);

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
          <div className="w-24"></div> {/* Spacer */}
        </div>

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

          {/* Colonna 2 e 3: Anteprima Gironi */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20">
              <h3 className="text-xl font-bold mb-2">Pronto per iniziare?</h3>
              <p className="text-blue-100 mb-6">Hai selezionato {selectedTeams.length} squadre. Ora puoi dividerle in gironi.</p>
              <button 
                disabled={selectedTeams.length < 3}
                className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-sm uppercase hover:bg-blue-50 disabled:opacity-50 transition-all"
              >
                Crea Gironi Automatici
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
