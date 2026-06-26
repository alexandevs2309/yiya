"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TabOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SlidingTabsProps {
  options: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function SlidingTabs({
  options,
  activeId,
  onChange,
  className,
}: SlidingTabsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "flex p-1.5 rounded-xl bg-bg-base/40 border border-border/80 backdrop-blur-md relative",
        className
      )}
      onMouseLeave={() => setHoveredId(null)}
    >
      {options.map((option) => {
        const isActive = option.id === activeId;
        const isHovered = option.id === hoveredId;

        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            onMouseEnter={() => setHoveredId(option.id)}
            className={cn(
              "flex-1 relative py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors duration-200 flex items-center justify-center gap-2.5 z-10 focus:outline-none",
              isActive
                ? "text-sky-400 dark:text-sky-400"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            {/* Active Pill Background */}
            {isActive && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 rounded-lg bg-sky-500/10 border border-sky-500/20 shadow-[0_2px_10px_rgba(14,165,233,0.15)] z-[-1]"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}

            {/* Hover Background Preview */}
            {isHovered && !isActive && (
              <motion.div
                layoutId="hover-tab-indicator"
                className="absolute inset-0 rounded-lg bg-neutral-500/5 dark:bg-white/5 z-[-1]"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 35,
                }}
              />
            )}

            {/* Icon Anim */}
            <motion.div
              animate={{
                scale: isActive ? 1.05 : 1,
                y: isActive ? -1 : 0,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {option.icon}
            </motion.div>

            {/* Label */}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
