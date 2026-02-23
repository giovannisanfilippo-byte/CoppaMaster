import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase"; 

export const ClubsPage = () => {
  const [nomeSquadra, setNomeSquadra] = useState("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // Per capire se stiamo modificando

  const fetchClubs = async () => {
    const { data } = await supabase.from('teams').select('*').order('name', { ascending: true });
    if (data) setClubs(data);
  };

  useEffect(() => { fetchClubs(); }, []);

  // Prepara il form con i dati del club da modificare
  const startEdit = (club: any) => {
    setEditId(club.id);
    setNomeSquadra(club.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fileInput = (document.getElementById('logo-input') as HTMLInputElement);
      const file = fileInput?.files ? fileInput.files[0] : null;
      let publicUrl = clubs.find(c => c.id === editId)?.logo_url || "";

      // Se viene caricato un nuovo file, lo carichiamo
      if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        await supabase.storage.from('club-logos').upload(fileName, file);
        const { data } = supabase.storage.from('club-logos').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      if (editId) {
        // AGGIORNAMENTO
        await supabase.from('teams').update({ name: nomeSquadra, logo_url: publicUrl }).eq('id', editId);
      } else {
        // NUOVO INSERIMENTO
        await supabase.from('teams').insert([{ name: nomeSquadra, logo_url: publicUrl }]);
      }

      setNomeSquadra("");
      setEditId(null);
      if (fileInput) fileInput.value = "";
      fetchClubs();
      alert(editId ? "Club aggiornato!" : "Club creato!");
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteClub = async (id: string) => {
    if (!confirm("Eliminare definitivamente questo club?")) return;
    await supabase.from('teams').delete().eq('id', id);
    fetchClubs();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>{editId ? "Modifica Club" : "Gestione Club"}</h1>
        <button onClick={() => window.location.href = '/'} style={{ background: '#444', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>Home</button>
      </div>

      <form onSubmit={handleSave} style={{ background: '#222', padding: '20px', borderRadius: '15px', marginBottom: '30px', border: editId ? '2px solid #007bff' : '1px solid #333' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
          <div>
            <label>Nome Squadra</label>
            <input 
              value={nomeSquadra} 
              onChange={e => setNomeSquadra(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #444', background: '#000', color: '#fff' }}
              required 
            />
          </div>
          <div>
            <label>Nuovo Logo (opzionale)</label>
            <input id="logo-input" type="file" accept="image/*" style={{ marginTop: '5px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {loading ? "..." : editId ? "Salva Modifiche" : "Aggiungi"}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setNomeSquad
