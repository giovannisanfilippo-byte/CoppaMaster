import React from 'react';
import { Award } from 'lucide-react';

interface ScorerTableProps {
  stats: any[];
}

export function ScorerTable({ stats }: ScorerTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <Award className="w-4 h-4 text-indigo-500" />
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Classifica Marcatori</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {stats.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">Nessun gol registrato per questo torneo.</div>}
        {stats.map((p, i) => (
          <div key={p.name} className="py-2 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
              <div>
                <div className="font-bold text-slate-800">{p.name}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">{p.team}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-black text-slate-300 uppercase">Gol</div>
              <div className="font-black text-indigo-600">{p.goals}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
