"use client";

import { motion } from "framer-motion";
import {
  Soup, Candy, Cookie, Salad, Coffee, Bike, Pill, Flame,
  HeartHandshake, Users, CircleOff, Clapperboard, ListChecks,
  MessageCircleHeart, Sparkles, CheckCheck, Heart, VolumeX,
  MessageCircleQuestion, Lightbulb, CloudRain, AlertTriangle, XCircle,
  type LucideIcon,
} from "lucide-react";
import { CARE_GROUPS, type CareGroup } from "@/lib/careOptions";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Soup, Candy, Cookie, Salad, Coffee, Bike, Pill, Flame,
  HeartHandshake, Users, CircleOff, Clapperboard, ListChecks,
  MessageCircleHeart, Sparkles, CheckCheck, Heart, VolumeX,
  MessageCircleQuestion, Lightbulb, CloudRain, AlertTriangle, XCircle,
};

export function CarePicker({
  group,
  selected,
  onToggle,
  disabled,
}: {
  group: CareGroup;
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-[20px] font-extrabold text-ink leading-snug">{group.title}</h2>
        <p className="text-[14px] font-semibold text-muted mt-1">{group.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {group.options.map((opt, i) => {
          const Icon = ICONS[opt.icon] ?? Heart;
          const active = selected.includes(opt.id);
          return (
            <motion.button
              key={opt.id}
              type="button"
              disabled={disabled}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, type: "spring", stiffness: 300, damping: 24 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggle(opt.id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 h-[46px] text-[14px] font-bold transition-colors",
                active
                  ? "bg-gradient-to-br from-primary to-accent text-white shadow-[0_6px_18px_rgba(232,131,127,.35)]"
                  : "bg-surface border border-line text-ink hover:border-primary/40"
              )}
            >
              <Icon size={18} className={active ? "text-white" : "text-primary"} />
              {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export { CARE_GROUPS };
