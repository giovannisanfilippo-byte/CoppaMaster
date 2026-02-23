import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase"; 
import { Trash2, Upload, Plus } from 'lucide-react'; // Assicurati di avere lucide-react o rimuovi queste icone

export const ClubsPage = () => {
  const [nomeSquadra, setNomeSquadra] = useState("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });
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
      
      setNomeSquadra("");
      if (fileInput) fileInput.value = "";
      fetchClubs();
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteClub = async (id: string, logoUrl: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo club?")) return;

    try {
      // 1. Elimina dal database
      await supabase.from('teams').delete().eq('id', id);
      
      // 2. Opzionale: elimina l'immagine dallo storage se vuoi pulire tutto
      if (logoUrl) {
        const filePath = logoUrl.split('/').pop();
        if (filePath) {
          await supabase.storage.from('club-logos').remove([filePath]);
        }
      }
      
      fetchClubs();
    } catch (err: any) {
      alert("Errore durante l'eliminazione");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#fff', fontSize: '2rem' }}>Gestione Club</h1>
        <button onClick={() => window.location.href = '/'} style={{ padding: '8px 15px', background: '#444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Torna alla Home
        </button>
      </div>

      {/* Form di inserimento elegante */}
      <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '15px', border: '1px solid #333', marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ color: '#aaa', display: 'block', marginBottom: '8px' }}>Nome Squadra</label>
            <input 
              placeholder="Esempio: Inter" 
              value={nomeSquadra} 
              onChange={e => setNomeSquadra(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#111', color: '#fff' }}
              required 
            />
          </div>
          <div>
            <label style={{ color: '#aaa', display: 'block', marginBottom: '8px' }}>Logo (Immagine)</label>
            <input id="logo-input" type="file" accept="image/*" style={{ color: '#aaa' }} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '12px 25px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? "Caricamento..." : "Aggiungi Club"}
          </button>
        </div>
      </form>

      {/* Griglia Club */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {clubs.map(c => (
          <div key={c.id} style={{ position: 'relative', background: '#1e1e1e', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #333' }}>
            <button 
              onClick={() => deleteClub(c.id, c.logo_url)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '18px' }}
              title="Elimina"
            >
              🗑️
            </button>
            
            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              {c.logo_url ? (
                <img src={c.logo_url} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} alt="logo" />
              ) : (
                <div style={{ width: '60px', height: '60px', background: '#333', borderRadius: '50%' }}></div>
              )}
            </div>
            <h3 style={{ color: '#fff', margin: '0' }}>{c.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};
