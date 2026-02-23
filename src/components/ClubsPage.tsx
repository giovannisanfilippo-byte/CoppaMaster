import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase"; 
import { PlayersPage } from './PlayersPage'; 

export const ClubsPage = () => {
  const [showPlayers, setShowPlayers] = useState(false); 
  const [nomeSquadra, setNomeSquadra] = useState("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchClubs = async () => {
    const { data } = await supabase.from('teams').select('*').order('name', { ascending: true });
    if (data) setClubs(data);
  };

  useEffect(() => { fetchClubs(); }, []);

  // FUNZIONE PER TORNARE ALLA SCHERMATA CON LE CARD (MENU PRINCIPALE)
  const tornaAlMenuPrincipale = () => {
    window.location.reload(); 
  };

  const deleteClub = async (id: string) => {
    if (!confirm("Eliminare definitivamente questo club?")) return;
    await supabase.from('teams').delete().eq('id', id);
    fetchClubs();
  };

  const startEdit = (club: any) => {
    setEditId(club.id);
    setNomeSquadra(club.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- VISTA GIOCATORI ---
  if (showPlayers) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', color: 'white' }}>
        <button 
          onClick={() => setShowPlayers(false)} 
          style={{ marginBottom: '20px', padding: '10px 15px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ⬅️ Torna a Gestione Club
        </button>
        <PlayersPage />
      </div>
    );
  }

  // --- VISTA ANAGRAFICA CLUB ---
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', color: 'white' }}>
      
      {/* HEADER CON TASTO TORNA INDIETRO AL MENU */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={tornaAlMenuPrincipale}
            style={{ 
              background: '#444', 
              color: 'white', 
              border: 'none', 
              padding: '10px 15px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            ⬅️ MENU PRINCIPALE
          </button>
          <h1 style={{ fontSize: '24px', margin: 0 }}>🛡️ Anagrafica Club</h1>
        </div>

        <button 
          onClick={() => setShowPlayers(true)} 
          style={{ background: '#28a745', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🏃 GESTIONE GIOCATORI
        </button>
      </div>

      <form onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          const fileInput = (document.getElementById('logo-input') as HTMLInputElement);
          const file = fileInput?.files ? fileInput.files[0] : null;
          let publicUrl = clubs.find(c => c.id === editId)?.logo_url || "";

          if (file) {
            const fileName = `${Date.now()}-${file.name}`;
            await supabase.storage.from('club-logos').upload(fileName, file);
            const { data } = supabase.storage.from('club-logos').getPublicUrl(fileName);
            publicUrl = data.publicUrl;
          }

          if (editId) {
            await supabase.from('teams').update({ name: nomeSquadra, logo_url: publicUrl }).eq('id', editId);
          } else {
            await supabase.from('teams').insert([{ name: nomeSquadra, logo_url: publicUrl }]);
          }

          setNomeSquadra("");
          setEditId(null);
          if (fileInput) fileInput.value = "";
          fetchClubs();
        } catch (err: any) {
          alert("Errore: " + err.message);
        } finally {
          setLoading(false);
        }
      }} style={{ background: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: editId ? '2px solid #007bff' : '1px solid #333' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '14px', color: '#aaa' }}>Nome Squadra</label>
            <input 
              value={nomeSquadra} 
              onChange={e => setNomeSquadra(e.target.value)}
              style={{ width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #444', background: '#000', color: '#fff' }}
              required 
            />
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#aaa' }}>Logo</label>
            <input id="logo-input" type="file" accept="image/*" style={{ marginTop: '5px', display: 'block', color: '#aaa' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={loading} style={{ padding: '12px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {loading ? "..." : editId ? "Salva" : "Crea"}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setNomeSquadra(""); }} style={{ padding: '12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px' }}>X</button>
            )}
          </div>
        </div>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
        {clubs.map(c => (
          <div key={c.id} style={{ background: '#252525', padding: '15px', borderRadius: '12px', textAlign: 'center', position: 'relative', border: '1px solid #333' }}>
            <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '5px' }}>
              <button onClick={() => startEdit(c)} style={{ background: '#444', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px' }}>✏️</button>
              <button onClick={() => deleteClub(c.id)} style={{ background: '#444', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px' }}>🗑️</button>
            </div>
            <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c.logo_url ? <img src={c.logo_url} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} alt="logo" /> : "⚽"}
            </div>
            <h3 style={{ fontSize: '16px', marginTop: '12px' }}>{c.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};
