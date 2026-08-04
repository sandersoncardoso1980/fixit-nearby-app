import { Suspense, lazy } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/lib/types";

const MapView = lazy(() => import("./MapView"));

export function ProviderMap(props: {
  center: { lat: number; lng: number };
  radiusKm: number;
  providers: Profile[];
  onSelect: (id: string) => void;
}) {
  return (
    <ClientOnly fallback={<Skeleton className="h-full w-full" />}>
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <MapView {...props} />
      </Suspense>
    </ClientOnly>
  );
}
