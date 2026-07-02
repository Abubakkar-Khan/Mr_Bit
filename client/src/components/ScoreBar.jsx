import React, { useEffect, useState } from 'react';

export default function ScoreBar({ score }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s) => {
    if (s >= 80) return 'bg-[#3b82f6]'; // Blue for high quality
    if (s >= 50) return 'bg-[#10b981]'; // Green for acceptable
    if (s >= 30) return 'bg-[#f59e0b]'; // Amber for borderline
    return 'bg-[#ef4444]'; // Red for low quality
  };

  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] mb-1.5 font-medium">
        <span className="text-[#a1a1aa]">Quality Score</span>
        <span className="text-[#f4f4f5]">{Math.round(score)}<span className="text-[#71717a]">/100</span></span>
      </div>
      <div className="h-1.5 w-full bg-[#27272a] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-700 ease-out ${getColor(score)}`}
          style={{ width: `${width}%` }}
        ></div>
      </div>
    </div>
  );
}
