import { STATUS_LABEL, STATUS_STEPS, type RequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function StatusTimeline({ status }: { status: RequestStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        Solicitação cancelada
      </div>
    );
  }
  const current = STATUS_STEPS.indexOf(status);
  return (
    <ol className="flex items-start gap-1">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span
                className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-primary" : "bg-border")}
              />
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "h-0.5 flex-1",
                  i === STATUS_STEPS.length - 1 ? "bg-transparent" : i < current ? "bg-primary" : "bg-border",
                )}
              />
            </div>
            <span
              className={cn(
                "text-[10px] leading-tight sm:text-xs",
                done ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
