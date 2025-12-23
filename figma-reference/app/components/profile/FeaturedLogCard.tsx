import React from 'react';
import { MapPin, Star } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LogEntry } from './types';

interface FeaturedLogCardProps {
  log: LogEntry;
}

export function FeaturedLogCard({ log }: FeaturedLogCardProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#12132D] shadow-lg shadow-[#8B5CF6]/20">
      {/* Photo */}
      {log.photos && log.photos[0] && (
        <div className="relative h-64">
          <ImageWithFallback
            src={log.photos[0]}
            alt={log.artist}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white text-[24px] font-bold mb-1">
              {log.artist}
            </h3>
            {log.tour && (
              <p className="text-white/90 text-[16px]">{log.tour}</p>
            )}
          </div>
          {log.photos.length > 1 && (
            <div className="absolute bottom-4 right-4 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[12px]">
              1 / {log.photos.length}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Venue & Date */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1B3D] border border-[#2A2B4D] mb-3">
          <MapPin className="w-3.5 h-3.5 text-[#6B6B8D]" />
          <span className="text-[#A1A1C7] text-[13px]">
            {log.venue} · {log.date}
          </span>
        </div>

        {/* Rating */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < log.rating
                  ? 'text-[#FFD700] fill-[#FFD700]'
                  : 'text-[#3D3D5C]'
              }`}
            />
          ))}
        </div>

        {/* Note */}
        {log.note && (
          <p className="text-white text-[14px] italic mb-3">"{log.note}"</p>
        )}

        {/* Badges & Friends */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {log.badges?.map((badge) => (
              <div
                key={badge.id}
                className="px-3 py-1 rounded-full bg-[#1A1B3D] border border-[#8B5CF6]/30 text-[11px] font-medium text-[#8B5CF6] flex items-center gap-1"
              >
                <span>{badge.icon}</span>
                <span>{badge.name}</span>
              </div>
            ))}
          </div>
          {log.friends && log.friends.length > 0 && (
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {log.friends.slice(0, 3).map((friend) => (
                  <div
                    key={friend.id}
                    className="w-6 h-6 rounded-full border-2 border-[#12132D] overflow-hidden"
                  >
                    <ImageWithFallback
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {log.friends.length > 3 && (
                <span className="ml-2 text-[#6B6B8D] text-[12px]">
                  +{log.friends.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
