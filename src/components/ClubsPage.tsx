import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase";

const ClubsPage = () => {
  const [nomeSquadra, setNomeSquadra] = useState("");
  const [immagineFile, setImmagineFile] = useState<File | null>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Funzione per caricare la lista dei club esistenti
  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setClubs(data);
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  // 2. Funzione per gestire il salvataggio (Immagine + Database)
  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeSquadra) return;
    setLoading(true);

    try {
      let urlLogo = "";

      // Caricamento immagine su Supabase Storage
      if (immagineFile) {
        const nomeFile = `${Date.now()}-${immagineFile.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('club-logos') // Il tuo bucket
          .upload(nomeFile, immagineFile);

        if (uploadError) throw uploadError;

        // Ottieni l'URL pubblico dell'immagine
        const { data: publicUrlData } = supabase.storage
          .from('club-logos')
          .getPublicUrl(nomeFile);
        
        urlLogo = publicUrlData.publicUrl;
      }

      // Salvataggio dati nel database
      const { error: dbError } = await supabase
        .from('teams')
        .insert([{ 
          name: nomeSquadra, 
          logo_url: urlLogo // Salva l'URL dell'immagine caricata
        }]);

      if (dbError) throw dbError;

      alert("Club creato con successo!");
      setNomeSquadra("");
      setImmagineFile(null);
      fetchClubs(); // Aggiorna la lista

    } catch (error: any) {
      alert("Errore: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h1>Anagrafica Club</h1>
      
      <form onSubmit={handleSaveClub} style={{ marginBottom: '30px', background: '#222', padding: '20px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Nome Club:</label><br/>
          <input 
            type="text" 
            value={nomeSquadra}
            onChange={(e) => setNomeSquadra(e.target.value)}
            style={{ padding: '8px', width: '100%', color: 'black' }}
            placeholder="Es: AC Milan"
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Logo Squadra (Immagine):</label><br/>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setImmagineFile(e.target.files ? e.target.files[0] : null)}
            style={{ marginTop: '5px' }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          {loading ? "Salvataggio in corso..." : "Crea Club"}
        </button>
      </form>

      <h2>Lista Club</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
        {clubs.map((club) => (
          <div key={club.id} style={{ textAlign: 'center', border: '1px solid #444', padding: '10px' }}>
            {club.logo_url && (
              <img src={club.logo_url} alt={club.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            )}
            <p>{club.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClubsPage;
