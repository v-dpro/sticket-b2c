import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ShowData {
  artist: string;
  venue: string;
  date: string;
  artistImage?: string;
}

interface CelebrationScreenProps {
  show?: ShowData;
  onAddDetails?: () => void;
  onDone?: () => void;
}

// Generate confetti particles
const confettiColors = ['#00D4FF', '#8B5CF6', '#E879F9'];
const generateConfetti = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.5,
    duration: 3 + Math.random() * 2,
  }));
};

export function CelebrationScreen({
  show = {
    artist: 'The Weeknd',
    venue: 'SoFi Stadium',
    date: 'December 15, 2024',
    artistImage: 'https://images.unsplash.com/photo-1615748561835-cff146a0b3a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaW5nZXIlMjBwb3J0cmFpdCUyMG11c2ljfGVufDF8fHx8MTc2NjE2OTExNHww&ixlib=rb-4.1.0&q=80&w=300'
  },
  onAddDetails,
  onDone
}: CelebrationScreenProps) {
  const [confetti] = React.useState(() => generateConfetti(30));

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden relative flex flex-col">
      {/* Confetti Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            initial={{
              x: `${particle.x}vw`,
              y: `${particle.y}vh`,
              rotate: particle.rotation,
              opacity: 0,
            }}
            animate={{
              y: '120vh',
              rotate: particle.rotation + 360 * 3,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'linear',
              opacity: {
                times: [0, 0.1, 0.9, 1],
              },
            }}
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Animated Checkmark with Gradient Ring */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
          className="mb-8 relative"
        >
          {/* Glowing gradient ring */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #8B5CF6 50%, #E879F9 100%)',
            }}
          />
          
          {/* Gradient circle with checkmark */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] flex items-center justify-center shadow-2xl shadow-[#8B5CF6]/50">
            <motion.div
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Check className="w-12 h-12 text-white stroke-[3]" />
            </motion.div>
          </div>
        </motion.div>

        {/* Text Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-white text-[28px] font-bold mb-4">
            You were there!
          </h1>
          <h2 className="text-white text-[20px] font-bold mb-2">
            {show.artist}
          </h2>
          <p className="text-[#A1A1C7] text-[18px] mb-1">
            at {show.venue}
          </p>
          <p className="text-[#6B6B8D] text-[16px]">
            {show.date}
          </p>
        </motion.div>

        {/* Artist Image with Gradient Border */}
        {show.artistImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="relative"
          >
            <div className="w-[104px] h-[104px] rounded-full bg-gradient-to-br from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] p-[2px]">
              <div className="w-full h-full rounded-full bg-[#0A0B1E] p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <ImageWithFallback
                    src={show.artistImage}
                    alt={show.artist}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="px-6 pb-8 space-y-3"
      >
        <button
          onClick={onAddDetails}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#E879F9] text-white font-semibold shadow-lg shadow-[#8B5CF6]/30 active:scale-[0.98] transition-transform"
        >
          Add Details
        </button>
        <button
          onClick={onDone}
          className="w-full py-4 rounded-xl border border-[#2A2B4D] text-white font-semibold active:scale-[0.98] transition-transform"
        >
          Done
        </button>
      </motion.div>
    </div>
  );
}
