import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase"; 

export const PlayersPage = () => {
  const [playerName, setPlayerName] = useState("");
  const [tesseratoId, setTesseratoId] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [filterTeam, setFilterTeam] = useState(""); 
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: p } = await supabase.from('players').select('*').order('name');
    const { data: t } = await supabase.from('teams').select('*').order('name');
    if (p) setPlayers(p);
    if (t) setTeams(t);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editPlayerId) {
        await supabase.from('players').update({ 
          name: playerName, 
          tesserato_id: tesseratoId, 
          team_id: selectedTeam 
        }).eq('id', editPlayerId);
        setEditPlayerId(null);
      } else {
        await supabase.from('players').insert([
          { name: playerName, tesserato_id: tesseratoId, team_id: selectedTeam }
        ]);
      }
      setPlayerName("");
      setTesseratoId("");
      setSelectedTeam("");
      fetchData();
      alert("Operazione completata!");
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (player: any) => {
    setEditPlayerId(player.id);
    setPlayerName(player.name);
    setTesseratoId(player.tesserato_id);
    setSelectedTeam(player.team_id || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePlayer = async (id: string) => {
    if (confirm("Eliminare il giocatore?")) {
      await supabase.from('players').delete().eq('id', id);
      fetchData();
    }
  };

  const filteredPlayers = filterTeam 
    ? players.filter(p => p.team_id === filterTeam)
    : [];

  const selectedTeamData = teams.find(t => t.id === filterTeam);

  return (
    <div style={{ color: 'white' }}>
      <h2 style={{ marginBottom: '20px' }}>🏃 {editPlayerId ? "Modifica Tesserato" : "Gestione Tesserati"}</h2>

      <form onSubmit={handleSave} style={{ background: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '40px', border: editPlayerId ? '2px solid #28a745' : '1px solid #333' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#aaa' }}>Nome e Cognome</label>
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#aaa' }}>ID Tesserato</label>
            <input value={tesseratoId} onChange={e => setTesseratoId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#aaa' }}>Assegna al Club</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required>
              <option value="">Seleziona...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? "..." : editPlayerId ? "Salva" : "Aggiungi"}
            </button>
            {editPlayerId && (
              <button type="button" onClick={() => { setEditPlayerId(null); setPlayerName(""); setTesseratoId(""); }} style={{ padding: '12px', background: '#444', color: 'white', border: 'none', borderRadius: '8px' }}>Annulla</button>
            )}
          </div>
        </div>
      </form>

      <div style={{ background: '#111', padding: '25px', borderRadius: '15px', border: '1px solid #222' }}>
        <h3 style={{ marginBottom: '20px', color: '#007bff' }}>🔍 Visualizza Rosa Squadra</h3>
        <select 
          value={filterTeam} 
          onChange={e => setFilterTeam(e.target.value)} 
          style={{ width: '100%', maxWidth: '400px', padding: '12px', borderRadius: '8px', background: '#222', color: '#fff', border: '1px solid #444', marginBottom: '20px', fontSize: '16px' }}
        >
          <option value="">Scegli un Club...</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {filterTeam ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', borderBottom: '2px solid #333', marginBottom: '15px' }}>
              {selectedTeamData?.logo_url && <img src={selectedTeamData.logo_url} style={{ width: '40px', height: '40px', objectFit: 'contain' }} alt="" />}
              <h2 style={{ margin: 0 }}>Rosa {selectedTeamData?.name}</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
              {filteredPlayers.map(p => (
                <div key={p.id} style={{ background: '#222', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                    <div style={{ color: '#888', fontSize: '12px' }}>ID: {p.tesserato_id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => startEdit(p)} style={{ background: '#333', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => deletePlayer(p.id)} style={{ background: '#333', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: '#555' }}>
            Seleziona una squadra per visualizzare i tesserati
          </div>
        )}
      </div>
    </div>
  );
};
