import React, { useState } from 'react';
import { X, Trash2, UserPlus, Settings, ShieldCheck, Plus, Palette, Image as ImageIcon } from 'lucide-react';

interface ClubsPageProps {
  user: any;
  teams: any[];
  players: any[];
  onAddTeam: (team: { name: string; logoUrl?: string; colors?: string }) => void;
  onDeleteTeam: (id: string) => void;
  onAddPlayer: (teamId: string, name: string, number: number, tesseratoId: string) => void;
  onUpdatePlayer: (id: string, data: any) => void;
  onRemovePlayer: (id: string) => void;
  onBack: () => void;
}

export function ClubsPage({ user, teams, players, onAddTeam, onDeleteTeam, onAddPlayer, onUpdatePlayer, onRemovePlayer, onBack }: ClubsPageProps) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [newTeamColors, setNewTeamColors] = useState('#4f46e5');
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);

  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState(0);
  const [tesseratoId, setTesseratoId] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  const teamPlayers = players.filter((p: any) => p.teamId === selectedTeamId);
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const handleCreateTeam = () => {
    if (!newTeamName) return;
    onAddTeam({ name: newTeamName, logoUrl: newTeamLogo, colors: newTeamColors });
    setNewTeamName('');
    setNewTeamLogo('');
    setNewTeamColors('#4f46e5');
    setShowAddTeamForm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Anagrafica Club</h1>
              <p className="text-slate-400 text-sm">Gestione centralizzata di squadre e tesserati.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddTeamForm(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 flex items-center gap-2 hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4" /> Nuovo Club
          </button>
        </div>

        {showAddTeamForm && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">Crea Nuovo Club</h2>
                <button onClick={() => setShowAddTeamForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Club</label>
                  <input 
                    placeholder="Es: AC Milan"
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">URL Logo (opzionale)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      placeholder="https://..."
                      className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={newTeamLogo}
                      onChange={e => setNewTeamLogo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Colore Sociale</label>
                  <div className="flex gap-4 items-center">
                    <input 
                      type="color"
                      className="w-12 h-12 rounded-xl border-none cursor-pointer"
                      value={newTeamColors}
                      onChange={e => setNewTeamColors(e.target.value)}
                    />
                    <span className="font-mono text-sm font-bold text-slate-400">{newTeamColors.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleCreateTeam}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
              >
                Crea Club
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[350px_1fr] gap-8">
          {/* Sidebar: Club List */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">I Tuoi Club ({teams.length})</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {teams.map((t: any) => (
                  <div 
                    key={t.id} 
                    onClick={() => setSelectedTeamId(t.id)}
                    className={`p-6 flex items-center justify-between cursor-pointer transition-all ${selectedTeamId === t.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-4">
                      {t.logoUrl ? (
                        <img src={t.logoUrl} alt={t.name} className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ backgroundColor: t.colors || '#4f46e5' }}>
                          {t.name.charAt(0)}
                        </div>
                      )}
                      <span className={`font-bold text-sm ${selectedTeamId === t.id ? 'text-indigo-600' : 'text-slate-700'}`}>{t.name}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteTeam(t.id); }} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {teams.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic text-sm">Nessun club registrato.</div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content: Player Management */}
          <div className="space-y-6">
            {selectedTeamId ? (
              <>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-black text-xl text-slate-900 flex items-center gap-3">
                      <UserPlus className="w-6 h-6 text-indigo-600" /> 
                      {editingPlayerId ? 'Modifica Tesserato' : 'Nuovo Tesserato'}
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Completo</label>
                      <input 
                        placeholder="Es: Mario Rossi"
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Numero Maglia</label>
                      <input 
                        type="number"
                        placeholder="N°"
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        value={playerNumber || ''}
                        onChange={e => setPlayerNumber(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID Tesserato</label>
                      <input 
                        placeholder="Es: ABC12345"
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        value={tesseratoId}
                        onChange={e => setTesseratoId(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {editingPlayerId ? (
                      <>
                        <button 
                          onClick={() => { onUpdatePlayer(editingPlayerId, { name: playerName, number: playerNumber, tesseratoId }); setEditingPlayerId(null); setPlayerName(''); setPlayerNumber(0); setTesseratoId(''); }}
                          className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                        >
                          Salva Modifiche
                        </button>
                        <button 
                          onClick={() => { setEditingPlayerId(null); setPlayerName(''); setPlayerNumber(0); setTesseratoId(''); }}
                          className="px-8 bg-slate-100 text-slate-400 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all"
                        >
                          Annulla
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => { onAddPlayer(selectedTeamId, playerName, playerNumber, tesseratoId); setPlayerName(''); setPlayerNumber(0); setTesseratoId(''); }}
                        className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                      >
                        Aggiungi alla Rosa
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tesserati del Club ({teamPlayers.length})</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {teamPlayers.length === 0 && (
                      <div className="p-20 text-center text-slate-400 text-sm italic">Nessun tesserato trovato in questo club.</div>
                    )}
                    {teamPlayers.map((p: any) => (
                      <div key={p.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-sm">
                            {p.number}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-lg">{p.name}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID: {p.tesseratoId}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingPlayerId(p.id); setPlayerName(p.name); setPlayerNumber(p.number); setTesseratoId(p.tesseratoId); }}
                            className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                          <button onClick={() => onRemovePlayer(p.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 p-20 text-center">
                <div className="space-y-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <ShieldCheck className="w-12 h-12 text-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-400">Nessun Club Selezionato</h3>
                    <p className="text-slate-400 font-medium max-w-xs mx-auto">Seleziona un club dalla lista a sinistra per gestire i suoi tesserati o creane uno nuovo.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
