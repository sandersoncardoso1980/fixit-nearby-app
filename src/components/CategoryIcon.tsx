import {
  Zap,
  Droplets,
  PaintRoller,
  KeyRound,
  Sparkles,
  Wind,
  Wrench,
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
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Wrench;
  return <Icon className={className} />;
}
