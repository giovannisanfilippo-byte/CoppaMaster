import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase"; 
import { PlayersPage } from './PlayersPage'; // Importiamo la pagina giocatori qui!

export const ClubsPage = () => {
  const [showPlayers, setShowPlayers] = useState(false); // Stato per cambiare vista
  const [nomeSquadra, setNomeSquadra] = useState("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const fetchClubs = async () => {
    const { data } = await supabase.from('teams').select('*').order('name', { ascending: true });
    if (data) setClubs(data);
  };

  useEffect(() => { fetchClubs(); }, []);

  // SE L'UTENTE CLICCA IL TASTO, MOSTRIAMO I GIOCATORI
  if (showPlayers) {
    return (
      <div>
        <button 
          onClick={() => setShowPlayers(false)} 
          style={{ marginBottom: '20px', padding: '10px', background: '#444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          ⬅️ Torna a Gestione Club
        </button>
        <PlayersPage />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
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
      fetchClubs();
      alert("Operazione completata!");
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>🛡️ Gestione Club</h1>
        <button 
          onClick={() => setShowPlayers(true)} 
          style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🏃 VAI A GESTIONE GIOCATORI
        </button>
      </div>

      {/* ... (resto del codice del form e della lista club che avevamo già) */}
      <form onSubmit={handleSave} style={{ background: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: '1px solid #333' }}>
        <input 
          value={nomeSquadra} 
          onChange={e => setNomeSquadra(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #444', marginRight: '10px' }}
          placeholder="Nome Club"
          required 
        />
        <input id="logo-input" type="file" accept="image/*" />
        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
          {loading ? "..." : "Salva Club"}
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
        {clubs.map(c => (
          <div key={c.id} style={{ background: '#252525', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
            <img src={c.logo_url} style={{ width: '50px', height: '50px', objectFit: 'contain' }} alt="" />
            <p>{c.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
