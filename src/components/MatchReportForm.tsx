import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Award, X, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface MatchReportFormProps {
  match: any;
  teams: any[];
  players: any[];
  events: any[];
  onUpdateScore: (scoreA: number, scoreB: number) => void;
  onAddEvent: (playerId: string, type: 'gol' | 'assist') => void;
  onRemoveEvent: (eventId: string) => void;
  onResetMatch: () => void;
  onClose: () => void;
}

export function MatchReportForm({ match, teams, players, events, onUpdateScore, onAddEvent, onRemoveEvent, onResetMatch, onClose }: MatchReportFormProps) {
  const [scoreA, setScoreA] = useState(match.scoreA);
  const [scoreB, setScoreB] = useState(match.scoreB);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const teamA = teams.find((t: any) => t.id === match.teamAId);
  const teamB = teams.find((t: any) => t.id === match.teamBId);
  
  const teamAPlayers = players.filter((p: any) => p.teamId === match.teamAId).sort((a: any, b: any) => a.name.localeCompare(b.name, 'it'));
  const teamBPlayers = players.filter((p: any) => p.teamId === match.teamBId).sort((a: any, b: any) => b.name.localeCompare(a.name, 'it'));

  const teamAGoals = events.filter((e: any) => e.type === 'gol' && players.find((p: any) => p.id === e.playerId)?.teamId === match.teamAId).length;
  const teamBGoals = events.filter((e: any) => e.type === 'gol' && players.find((p: any) => p.id === e.playerId)?.teamId === match.teamBId).length;

  const isValidA = teamAGoals === scoreA;
  const isValidB = teamBGoals === scoreB;

  const handleSave = () => {
    onUpdateScore(scoreA, scoreB);
    onClose();
  };

  const handleReset = () => {
    onResetMatch();
    setScoreA(0);
    setScoreB(0);
    setIsConfirmResetOpen(false);
    onClose();
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      >
        <motion.div 
          initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
          className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="p-6 bg-slate-900 text-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Referto Partita</h2>
              <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-8">
              <div className="flex-1 text-right">
                <div className="font-black text-lg truncate mb-2">{teamA?.name || '---'}</div>
                <input 
                  type="number"
                  className="w-16 h-16 text-center text-3xl font-black bg-white/10 rounded-2xl border border-white/20 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={scoreA}
                  onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="text-xl font-black text-white/20">VS</div>
              <div className="flex-1 text-left">
                <div className="font-black text-lg truncate mb-2">{teamB?.name || '---'}</div>
                <input 
                  type="number"
                  className="w-16 h-16 text-center text-3xl font-black bg-white/10 rounded-2xl border border-white/20 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={scoreB}
                  onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {(!isValidA || !isValidB) && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-amber-700 text-xs font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>
                  Assegna i marcatori per far corrispondere il totale al punteggio inserito.
                  {scoreA > teamAGoals && ` Mancano ${scoreA - teamAGoals} gol per ${teamA?.name}.`}
                  {scoreB > teamBGoals && ` Mancano ${scoreB - teamBGoals} gol per ${teamB?.name}.`}
                </p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{teamA?.name}</h3>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full ${isValidA ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {teamAGoals} / {scoreA} GOL
                  </span>
                </div>
                <div className="space-y-2">
                  {teamAPlayers.map((p: any) => (
                    <PlayerEventRow key={p.id} player={p} events={events.filter((e: any) => e.playerId === p.id)} onAdd={onAddEvent} onRemove={onRemoveEvent} />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{teamB?.name}</h3>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full ${isValidB ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {teamBGoals} / {scoreB} GOL
                  </span>
                </div>
                <div className="space-y-2">
                  {teamBPlayers.map((p: any) => (
                    <PlayerEventRow key={p.id} player={p} events={events.filter((e: any) => e.playerId === p.id)} onAdd={onAddEvent} onRemove={onRemoveEvent} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <button 
              onClick={() => setIsConfirmResetOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Resetta Risultato
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-6 py-3 rounded-2xl font-black text-sm text-slate-400 hover:text-slate-600 transition-colors">
                Annulla
              </button>
              <button 
                onClick={handleSave}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 flex items-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <Save className="w-4 h-4" /> Salva Risultato
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <ConfirmModal 
        isOpen={isConfirmResetOpen}
        onClose={() => setIsConfirmResetOpen(false)}
        onConfirm={handleReset}
        title="Resetta Partita"
        message="Sei sicuro di voler resettare il risultato e tutti i marcatori di questa partita? Questa azione non può essere annullata."
      />
    </>
  );
}

function PlayerEventRow({ player, events, onAdd, onRemove }: any) {
  const goals = events.filter((e: any) => e.type === 'gol');
  const assists = events.filter((e: any) => e.type === 'assist');
  return (
    <div className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800 truncate">{player.name}</div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {goals.map((g: any) => (
            <button key={g.id} onClick={() => onRemove(g.id)} className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center text-[8px] font-black hover:bg-red-100 hover:text-red-600 transition-colors">G</button>
          ))}
          {assists.map((a: any) => (
            <button key={a.id} onClick={() => onRemove(a.id)} className="w-5 h-5 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-[8px] font-black hover:bg-red-100 hover:text-red-600 transition-colors">A</button>
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={() => onAdd(player.id, 'gol')} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all" title="Aggiungi Gol">
          <Trophy className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onAdd(player.id, 'assist')} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all" title="Aggiungi Assist">
          <Award className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
