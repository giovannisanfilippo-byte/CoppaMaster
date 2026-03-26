import React from 'react';
import { motion } from 'motion/react';

interface StandingsTableProps {
  standings: any[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-3 py-2">Pos</th>
<th className="px-3 py-2">Squadra</th>
<th className="px-3 py-2 text-center" title="Punti">PT</th>
<th className="px-3 py-2 text-center" title="Partite giocate">P</th>
<th className="px-3 py-2 text-center" title="Vittorie">V</th>
<th className="px-3 py-2 text-center" title="Pareggi">N</th>
<th className="px-3 py-2 text-center" title="Sconfitte">S</th>
<th className="px-3 py-2 text-center" title="Gol Fatti">GF</th>
<th className="px-3 py-2 text-center" title="Gol Subiti">GS</th>
<th className="px-3 py-2 text-center" title="Differenza Reti">DR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map((s, i) => (
              <tr key={s.name} className="hover:bg-slate-50/50">
                <td className="px-4 py-4 font-black text-slate-300">{i + 1}</td>
                <td className="px-4 py-4">
  <div className="flex items-center gap-2">
    {s.logoUrl && <img src={s.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0 border border-slate-100" />}
    <span className="font-bold text-slate-700">{s.name}</span>
  </div>
</td>
                <td className="px-4 py-4 text-center font-medium">{s.p}</td>
                <td className="px-4 py-4 text-center font-medium text-emerald-600">{s.w}</td>
                <td className="px-4 py-4 text-center font-medium text-slate-400">{s.d}</td>
                <td className="px-4 py-4 text-center font-medium text-red-400">{s.l}</td>
                <td className="px-4 py-4 text-center font-medium">{s.gf}</td>
                <td className="px-4 py-4 text-center font-medium">{s.ga}</td>
                <td className="px-4 py-4 text-center font-medium text-slate-400">{s.gf - s.ga}</td>
                <td className="px-4 py-4 text-center font-black text-indigo-600">{s.pts}</td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
                  Nessun dato disponibile per la classifica.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
