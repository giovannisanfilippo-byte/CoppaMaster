import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase"; 

export const PlayersPage = () => {
  const [playerName, setPlayerName] = useState("");
  const [tesseratoId, setTesseratoId] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
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
        // MODIFICA GIOCATORE ESISTENTE
        await supabase.from('players').update({ 
          name: playerName, 
          tesserato_id: tesseratoId, 
          team_id: selectedTeam 
        }).eq('id', editPlayerId);
        setEditPlayerId(null);
      } else {
        // NUOVO INSERIMENTO
        await supabase.from('players').insert([
          { name: playerName, tesserato_id: tesseratoId, team_id: selectedTeam }
        ]);
      }
      setPlayerName("");
      setTesseratoId("");
      setSelectedTeam("");
      fetchData();
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

  return (
    <div style={{ color: 'white' }}>
      <h2 style={{ marginBottom: '20px' }}>🏃 {editPlayerId ? "Modifica Tesserato" : "Nuovo Tesserato"}</h2>

      {/* FORM DI INSERIMENTO / MODIFICA */}
      <form onSubmit={handleSave} style={{ background: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '40px', border: editPlayerId ? '2px solid #28a745' : '1px solid #333' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#aaa' }}>Nome e Cognome</label>
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#aaa' }}>ID Tesserato</label>
            <input value={tesseratoId} onChange={e => setTesseratoId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#aaa' }}>Sposta nel Club:</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444' }} required>
              <option value="">Seleziona Club...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? "..." : editPlayerId ? "Aggiorna" : "Aggiungi"}
            </button>
            {editPlayerId && (
              <button type="button" onClick={() => { setEditPlayerId(null); setPlayerName(""); setTesseratoId(""); }} style={{ padding: '12px', background: '#444', color: 'white', border: 'none', borderRadius: '8px' }}>X</button>
            )}
          </div>
        </div>
      </form>

      {/* LISTA GIOCATORI DIVISA PER CLUB */}
      <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Rose Squadre</h2>
      
      {teams.map(team => {
        const teamPlayers = players.filter(p => p.team_id === team.id);
        return (
          <div key={team.id} style={{ marginBottom: '30px', background: '#111', borderRadius: '12px', overflow: 'hidden', border: '1px solid #222' }}>
            <div style={{ background: '#222', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              {team.logo_url && <img src={team.logo_url} style={{ width: '30px', height: '30px', objectFit: 'contain' }} alt="" />}
              <h3 style={{ margin: 0, color: '#007bff' }}>{team.name} ({teamPlayers.length})</h3>
            </div>
            
            <div style={{ padding: '10px' }}>
              {teamPlayers.length === 0 ? (
                <p style={{ color: '#555', padding: '10px' }}>Nessun giocatore in questa rosa</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {teamPlayers.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '10px' }}>{p.name}</td>
                        <td style={{ padding: '10px', color: '#aaa', fontSize: '13px' }}>ID: {p.tesserato_id}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>✏️</button>
                          <button onClick={() => deletePlayer(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })}

      {/* GIOCATORI SENZA SQUADRA (OPZIONALE) */}
      {players.filter(p => !p.team_id).length > 0 && (
        <div style={{ marginTop: '20px', opacity: 0.6 }}>
          <h3>Svincolati</h3>
          <ul>
            {players.filter(p => !p.team_id).map(p => (
              <li key={p.id}>{p.name} <button onClick={() => startEdit(p)}>✏️</button></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
