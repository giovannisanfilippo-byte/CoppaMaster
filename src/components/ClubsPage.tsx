import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase"; 

// Usiamo "export const" per combaciare con l'import di App.tsx
export const ClubsPage = () => {
  const [nomeSquadra, setNomeSquadra] = useState("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClubs = async () => {
    const { data } = await supabase.from('teams').select('*');
    if (data) setClubs(data);
  };

  useEffect(() => { fetchClubs(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fileInput = (document.getElementById('logo-input') as HTMLInputElement);
      const file = fileInput?.files ? fileInput.files[0] : null;
      let publicUrl = "";

      if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('club-logos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('club-logos').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('teams')
        .insert([{ name: nomeSquadra, logo_url: publicUrl }]);

      if (dbError) throw dbError;

      alert("Club salvato correttamente!");
      setNomeSquadra("");
      fetchClubs();
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2>Gestione Club</h2>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', background: '#222', padding: '20px', borderRadius: '10px' }}>
        <input 
          placeholder="Nome Squadra" 
          value={nomeSquadra} 
          onChange={e => setNomeSquadra(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', border: 'none' }}
          required 
        />
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Logo (Immagine):</label>
          <input id="logo-input" type="file" accept="image/*" />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {loading ? "Caricamento..." : "Crea Club"}
        </button>
      </form>

      <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '20px' }}>
        {clubs.map(c => (
          <div key={c.id} style={{ textAlign: 'center', background: '#333', padding: '10px', borderRadius: '8px' }}>
            {c.logo_url ? (
              <img src={c.logo_url} width="80" height="80" style={{ objectFit: 'contain' }} alt="logo" />
            ) : (
              <div style={{ width: '80px', height: '80px', background: '#555', margin: '0 auto' }}></div>
            )}
            <p style={{ marginTop: '10px', fontSize: '14px' }}>{c.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ClubsPage;
