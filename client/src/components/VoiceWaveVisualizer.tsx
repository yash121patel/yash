import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface VoiceWaveVisualizerProps {
  isListening: boolean;
  className?: string;
}

export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({ isListening, className }) => {
  const bars = 5;

  return (
    <div className={cn("flex items-center justify-center gap-1 h-8", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-gold-400 rounded-full"
          initial={{ height: '20%', opacity: 0.3 }}
          animate={{
            height: isListening ? ['20%', '100%', '20%'] : '20%',
            opacity: isListening ? 1 : 0.3,
          }}
          transition={{
            duration: 0.8,
            repeat: isListening ? Infinity : 0,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};
