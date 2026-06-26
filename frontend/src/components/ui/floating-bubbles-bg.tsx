"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

const BUBBLE_COLORS = [
  "bg-sky-500/10 dark:bg-sky-500/20", // Caribe
  "bg-emerald-500/10 dark:bg-emerald-500/20", // Samaná
  "bg-orange-500/10 dark:bg-orange-500/20", // Sol
  "bg-rose-500/10 dark:bg-rose-500/20", // Coral
  "bg-amber-400/10 dark:bg-amber-400/20", // Arena/Sol2
];

export default function FloatingBubblesBackground() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // Generate bubbles once on the client to avoid hydration mismatch
    const newBubbles = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage of screen width
      y: Math.random() * 100, // percentage of screen height
      size: Math.random() * 120 + 60, // 60px to 180px
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      delay: Math.random() * 5,
      duration: Math.random() * 20 + 20, // 20s to 40s
    }));
    setBubbles(newBubbles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-sky-500/5 blur-[160px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {bubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className={`absolute rounded-full blur-[40px] ${bubble.color}`}
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
          }}
          animate={{
            y: ["0vh", "-100vh"],
            x: ["0vw", `${Math.sin(bubble.id) * 15}vw`],
            scale: [1, 1.15, 0.9, 1],
            rotate: [0, 360],
          }}
          transition={{
            duration: bubble.duration,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            delay: -bubble.delay, // negative delay starts animation midway
          }}
        />
      ))}
    </div>
  );
}
