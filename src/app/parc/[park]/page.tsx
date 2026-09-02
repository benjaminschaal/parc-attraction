import { notFound } from "next/navigation";
import { getPark, PARKS } from "@/lib/parks";
import { fetchParkSnapshot } from "@/lib/wartezeiten/server";
import ParkView from "@/components/ParkView";
import type { Metadata } from "next";

// Both parks are known ahead of time; the page is regenerated every two
// minutes so the first paint already carries near-live wait times.
export const revalidate = 120;

export function generateStaticParams() {
  return PARKS.map((p) => ({ park: p.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/parc/[park]">): Promise<Metadata> {
  const { park } = await params;
  const config = getPark(park);
  if (!config) return {};
  return {
    title: `${config.name} — temps d'attente en direct`,
    description: `Temps d'attente en direct, carte des attractions et historique pour ${config.name}.`,
  };
}

export default async function ParkPage({ params }: PageProps<"/parc/[park]">) {
  const { park } = await params;
  const config = getPark(park);
  if (!config) notFound();

  // A cold upstream (rate limit, outage) must not blank the page: the client
  // retries on mount and renders its own error state.
  const snapshot = await fetchParkSnapshot(config.id).catch(() => undefined);

  return <ParkView park={config} initialSnapshot={snapshot} />;
}
