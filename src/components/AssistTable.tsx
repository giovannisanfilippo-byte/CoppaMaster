import React from 'react';
import { Award } from 'lucide-react';
interface AssistTableProps {
  stats: any[];
}
export function AssistTable({ stats }: AssistTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <Award className="w-4 h-4 text-blue-500" />
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Classifica Assist</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {stats.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">Nessun assist registrato per questo torneo.</div>}
        {stats.map((p, i) => (
          <div key={p.name} className="py-1.5 px-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
              {p.logoUrl && <img src={p.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0 border border-slate-100" />}
              <div>
                <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">{p.team}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-black text-slate-300 uppercase">Assist</div>
              <div className="font-black text-blue-600">{p.assists}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
