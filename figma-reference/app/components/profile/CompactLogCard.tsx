import React from 'react';
import { Music, Star } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LogEntry } from './types';

interface CompactLogCardProps {
  log: LogEntry;
}

export function CompactLogCard({ log }: CompactLogCardProps) {
  return (
    <div className="rounded-xl overflow-hidden bg-[#12132D]">
      {log.photos && log.photos[0] ? (
        <div className="relative h-32">
          <ImageWithFallback
            src={log.photos[0]}
            alt={log.artist}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-[#1A1B3D] to-[#12132D] flex items-center justify-center">
          <Music className="w-12 h-12 text-[#6B6B8D]" />
        </div>
      )}
      <div className="p-3">
        <h4 className="text-white font-bold text-[14px] mb-1 truncate">
          {log.artist}
        </h4>
        <p className="text-[#6B6B8D] text-[12px] mb-2 truncate">
          {log.venue} · {log.date.split(',')[0]}
        </p>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < log.rating
                  ? 'text-[#FFD700] fill-[#FFD700]'
                  : 'text-[#3D3D5C]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
