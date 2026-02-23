import React, { useState, useEffect } from 'react';
import { supabase } from "../utils/supabase";

export const GroupTournament = ({ onBack }: { onBack: () => void }) => {
  const [step, setStep] = useState(1); // 1: Setup, 2: Configurazione Gironi
  const [tournamentName, setTournamentName] = useState("");
  const [numGroups, setNumGroups] = useState(1);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [groups, setGroups] = useState<{ [key: string]: any[] }>({ "Girone A": [] });

  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from('teams').select('*').order('name');
      if (data) setAllClubs(data);
    };
    fetchClubs();
  }, []);

  const handleNextStep = () => {
    if (!tournamentName) return alert("Inserisci un nome per il torneo");
    const newGroups: any = {};
    for (let i = 0; i < numGroups; i++) {
      const letter = String.fromCharCode(65 + i);
      newGroups[`Girone ${letter}`] = [];
    }
    setGroups(newGroups);
    setStep(2);
  };

  const addTeamToGroup = (groupName: string, team: any) => {
    // Controlla se il team è già in qualche girone
    const isAlreadyAssigned = Object.values(groups).some(g => g.some(t => t.id === team.id));
    if (isAlreadyAssigned) return alert("Squadra già assegnata!");

    // Controlla il limite di 6 club
    if (groups[groupName].length >= 6) return alert("Massimo 6 club per girone!");

    setGroups({
      ...groups,
      [groupName]: [...groups[groupName], team]
    });
  };

  const removeTeamFromGroup = (groupName: string, teamId: string) => {
    setGroups({
      ...groups,
      [groupName]: groups[groupName].filter(t => t.id !== teamId)
    });
  };

  return (
    <div style={{ color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', padding: '10px', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        ⬅️ Torna al Menu
      </button>

      {step === 1 ? (
        <div style={{ background: '#1e1e1e', padding: '30px', borderRadius: '15px' }}>
          <h2>🏆 Nuovo Torneo a Gironi</h2>
          <div style={{ marginTop: '20px' }}>
            <label>Nome Torneo</label>
            <input 
              value={tournamentName} 
              onChange={e => setTournamentName(e.target.value)}
              style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #333' }}
              placeholder="Es. Champions League - Fase a Gironi"
            />
          </div>
          <div style={{ marginTop: '20px' }}>
            <label>Numero di Gironi</label>
            <select 
              value={numGroups} 
              onChange={e => setNumGroups(parseInt(e.target.value))}
              style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid #333' }}
            >
              {[1, 2, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button 
            onClick={handleNextStep}
            style={{ marginTop: '30px', width: '100%', padding: '15px', background: '#28a745', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Configura Squadre ➡️
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px' }}>
          {/* Colonna Club Disponibili */}
          <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '15px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3>Club Disponibili</h3>
            <p style={{ fontSize: '12px', color: '#aaa' }}>Clicca su una squadra per aggiungerla a un girone</p>
            {allClubs.map(club => {
              const assigned = Object.values(groups).some(g => g.some(t => t.id === club.id));
              return (
                <div 
                  key={club.id} 
                  style={{ 
                    padding: '10px', background: assigned ? '#111' : '#333', marginBottom: '8px', borderRadius: '8px', 
                    cursor: assigned ? 'not-allowed' : 'pointer', opacity: assigned ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '10px'
                  }}
                  onClick={() => !assigned && addTeamToGroup(Object.keys(groups)[0], club)}
                >
                  {club.logo_url && <img src={club.logo_url} width="25" />}
                  {club.name}
                </div>
              );
            })}
          </div>

          {/* Area Gironi */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {Object.keys(groups).map(groupName => (
              <div key={groupName} style={{ background: '#1e1e1e', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
                <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', color: '#007bff' }}>{groupName}</h3>
                <p style={{ fontSize: '11px', color: groups[groupName].length < 3 ? '#ff4444' : '#28a745' }}>
                   {groups[groupName].length} / 6 Squadre (Minimo 3)
                </p>
                <div style={{ marginTop: '15px' }}>
                  {groups[groupName].map(team => (
                    <div key={team.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#252525', marginBottom: '5px', borderRadius: '5px' }}>
                      <span>{team.name}</span>
                      <button onClick={() => removeTeamFromGroup(groupName, team.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}>✖</button>
                    </div>
                  ))}
                  {groups[groupName].length === 0 && <p style={{ color: '#555', fontSize: '13px' }}>Nessuna squadra assegnata</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
