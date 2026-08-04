import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = 14,
  className,
  onChange,
}: {
  value: number;
  size?: number;
  className?: string;
  onChange?: (v: number) => void;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={cn("leading-none", onChange ? "cursor-pointer" : "cursor-default")}
          aria-label={`${i} estrelas`}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              i <= Math.round(value) ? "fill-brand text-brand" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
