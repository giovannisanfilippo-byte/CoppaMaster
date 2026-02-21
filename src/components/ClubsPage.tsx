import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase";

const ClubsPage = () => {
  const [nomeSquadra, setNomeSquadra] = useState("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FUNZIONE PER CARICARE I DATI
  const fetchClubs = async () => {
    setLoading(true);
    console.log("Sto provando a leggere dalla tabella 'teams'...");
    
    const { data, error } = await supabase
      .from('teams') // Assicurati che su Supabase si chiami 'teams'
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Errore di lettura:", error.message);
    } else {
      console.log("Dati ricevuti dal DB:", data);
      setClubs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  // FUNZIONE PER SALVARE
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeSquadra) return;

    const { error } = await supabase
      .from('teams')
      .insert([{ name: nomeSquadra }]);

    if (error) {
      alert("Errore salvataggio: " + error.message);
    } else {
      setNomeSquadra("");
      fetchClubs(); // Ricarica la lista dopo il salvataggio
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Anagrafica Club</h2>
      <form onSubmit={handleSave} style={{ marginBottom: '20px' }}>
        <input 
          value={nomeSquadra} 
          onChange={(e) => setNomeSquadra(e.target.value)}
          placeholder="Nome del club..."
          style={{ padding: '8px', color: 'black' }}
        />
        <button type="submit" style={{ marginLeft: '10px', padding: '8px' }}>Salva</button>
      </form>

      {loading ? (
        <p>Caricamento in corso...</p>
      ) : (
        <ul>
          {clubs.length === 0 && <p>Nessun club trovato nel database.</p>}
          {clubs.map((club) => (
            <li key={club.id} style={{ marginBottom: '5px' }}>
              {club.name} <small>(ID: {club.id.substring(0,5)}...)</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClubsPage;
