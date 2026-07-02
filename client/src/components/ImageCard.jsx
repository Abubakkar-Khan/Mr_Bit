import React from 'react';
import StatusBadge from './StatusBadge';
import ScoreBar from './ScoreBar';
import { ExternalLink, Check, X } from 'lucide-react';

export default function ImageCard({ candidate, onSelect, onReject, isSelected }) {
  return (
    <div className={`card-hover group relative overflow-hidden flex flex-col
      ${isSelected ? 'border-[#3b82f6] ring-1 ring-[#3b82f6]/50 shadow-sm' : ''}
    `}>
      {isSelected && (
        <div className="absolute top-3 right-3 z-20 bg-[#3b82f6] text-white rounded-full p-1 shadow-sm">
          <Check size={14} strokeWidth={3} />
        </div>
      )}
      
      <div className="h-48 relative bg-[#09090b] border-b border-[#27272a] overflow-hidden">
        <img 
          src={candidate.thumbnail_path ? `/temp/${candidate.thumbnail_path.split(/[\\/]/).pop()}` : candidate.image_url} 
          alt={candidate.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute bottom-3 left-3 z-10">
          <StatusBadge status={candidate.status} />
        </div>
        <a 
          href={candidate.image_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute top-3 right-3 p-1.5 bg-[#18181b]/80 backdrop-blur-md rounded-md text-[#f4f4f5] opacity-0 group-hover:opacity-100 transition-opacity border border-[#27272a] hover:bg-[#27272a] z-10"
        >
          <ExternalLink size={14} />
        </a>
      </div>
      
      <div className="p-4 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="text-[13px] font-medium text-[#f4f4f5] line-clamp-1 mb-1" title={candidate.title}>
            {candidate.title || 'Untitled Archive'}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#a1a1aa] font-medium">{candidate.source_name}</span>
            <span className="px-1.5 py-0.5 rounded border border-[#27272a] bg-[#18181b] text-[10px] text-[#a1a1aa] uppercase tracking-wider">{candidate.category}</span>
          </div>
        </div>
        
        <ScoreBar score={candidate.quality_score} />
        
        {candidate.status === 'candidate' && (
          <div className="flex gap-2 mt-auto pt-2 border-t border-[#27272a]/50">
            <button 
              onClick={() => onSelect(candidate.id)}
              className="flex-1 py-1.5 bg-[#f4f4f5] text-[#09090b] rounded text-xs font-medium hover:bg-white transition-colors"
            >
              Select
            </button>
            <button 
              onClick={() => onReject(candidate.id)}
              className="px-2.5 py-1.5 text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#ef4444] rounded transition-colors"
              title="Reject"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
