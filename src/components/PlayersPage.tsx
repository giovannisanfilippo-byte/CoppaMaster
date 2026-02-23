import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase"; 

export const PlayersPage = () => {
  const [playerName, setPlayerName] = useState("");
  const [tesseratoId, setTesseratoId] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const { data: p } = await supabase.from('players').select('*, teams(name)').order('name');
    const { data: t } = await supabase.from('teams').select('*').order('name');
    if (p) setPlayers(p);
    if (t) setTeams(t);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('players').insert([
        { name: playerName, tesserato_id: tesseratoId, team_id: selectedTeam }
      ]);
      if (error) throw error;
      setPlayerName("");
      setTesseratoId("");
      fetchData();
      alert("Giocatore aggiunto con successo!");
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePlayer = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo giocatore?")) {
      await supabase.from('players').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>🏃 Gestione Tesserati</h1>
        <button onClick={() => window.location.href = '/'} style={{ background: '#444', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>Home</button>
      </div>

      <form onSubmit={handleSave} style={{ background: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: '1px solid #333' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '14px', color: '#aaa' }}>Nome Giocatore</label>
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required />
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#aaa' }}>ID Tesserato</label>
            <input value={tesseratoId} onChange={e => setTesseratoId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required />
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#aaa' }}>Club</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required>
              <option value="">Seleziona Club...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading} style={{ padding: '12px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? "..." : "Aggiungi"}
          </button>
        </div>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e1e1e', borderRadius: '10px' }}>
          <thead>
            <tr style={{ background: '#333' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Nome</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Club</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Elimina</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '12px' }}>{p.name}</td>
                <td style={{ padding: '12px' }}>{p.tesserato_id}</td>
                <td style={{ padding: '12px' }}>{p.teams?.name || 'Nessuno'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => deletePlayer(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
