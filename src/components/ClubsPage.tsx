import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 

const ClubsPage = () => {
  const [nomeSquadra, setNomeSquadra] = useState('');
  const [listaSquadre, setListaSquadre] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  // Carica le squadre
  const caricaSquadre = async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setListaSquadre(data || []);
    } catch (err) {
      console.error("Errore nel caricamento:", err.message);
    } finally {
      setCaricamento(false);
    }
  };

  useEffect(() => {
    caricaSquadre();
  }, []);

  // Salva una nuova squadra
  const salvaSquadra = async (e) => {
    e.preventDefault();
    if (!nomeSquadra.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Devi essere loggato!");
        return;
      }

      const { error } = await supabase
        .from('clubs')
        .insert([{ name: nomeSquadra, user_id: user.id }]);

      if (error) throw error;

      setNomeSquadra('');
      caricaSquadre();
      alert("Squadra salvata!");
    } catch (err) {
      alert("Errore durante il salvataggio: " + err.message);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Anagrafica Club</h1>
      
      <form onSubmit={salvaSquadra} style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={nomeSquadra} 
          onChange={(e) => setNomeSquadra(e.target.value)}
          placeholder="Inserisci nome squadra (es. Real Madrid)"
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Salva
        </button>
      </form>

      <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Squadre registrate:</h2>
      {caricamento ? <p>Caricamento in corso...</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {listaSquadre.map(squadra => (
            <li key={squadra.id} style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <strong>{squadra.name}</strong>
            </li>
          ))}
          {listaSquadre.length === 0 && <p>Nessuna squadra trovata. Aggiungine una!</p>}
        </ul>
      )}
    </div>
  );
};

export default ClubsPage;