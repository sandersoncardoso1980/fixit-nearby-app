import {
  Zap,
  Droplets,
  PaintRoller,
  KeyRound,
  Sparkles,
  Wind,
  Wrench,
  Hammer,
  HardHat,
  Grid3x3,
  Layers,
  PanelsTopLeft,
  Ruler,
  Armchair,
  Fence,
  Flame,
  Home,
  CloudRain,
  Umbrella,
  LayoutGrid,
  Hand,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Zap,
  Droplets,
  PaintRoller,
  KeyRound,
  Sparkles,
  Wind,
  Wrench,
  Hammer,
  HardHat,
  Grid3x3,
  Layers,
  PanelsTopLeft,
  Ruler,
  Armchair,
  Fence,
  Flame,
  Home,
  CloudRain,
  Umbrella,
  LayoutGrid,
  Hand,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Wrench;
  return <Icon className={className} />;
}
