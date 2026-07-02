import React from 'react';

export default function StatusBadge({ status }) {
  const config = {
    posted: { color: 'text-[#10b981]', bg: 'bg-[#10b981]/10', border: 'border-[#10b981]/20', label: 'Posted' },
    pending: { color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10', border: 'border-[#f59e0b]/20', label: 'Pending' },
    failed: { color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/20', label: 'Failed' },
    selected: { color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/20', label: 'Selected' },
    candidate: { color: 'text-[#a1a1aa]', bg: 'bg-[#27272a]/50', border: 'border-[#27272a]', label: 'Candidate' },
    rejected: { color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/20', label: 'Rejected' },
  };

  const style = config[status?.toLowerCase()] || config.candidate;

  return (
    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md border ${style.bg} ${style.color} ${style.border} flex items-center w-fit`}>
      {style.label}
    </span>
  );
}
