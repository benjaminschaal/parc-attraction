import {
  Baby,
  Car,
  Clapperboard,
  Droplets,
  FerrisWheel,
  Fish,
  Flashlight,
  Kayak,
  RollerCoaster,
  Sailboat,
  Ship,
  Tent,
  TowerControl,
  TrainFront,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

/**
 * One drawn icon per OpenStreetMap `attraction=*` value, all from the same
 * stroke set, so the list no longer mixes emoji from whatever font the phone
 * happens to ship.
 */
const ICONS: Record<string, LucideIcon> = {
  roller_coaster: RollerCoaster,
  log_flume: Droplets,
  water_slide: Waves,
  river_rafting: Kayak,
  boat_ride: Sailboat,
  dark_ride: Flashlight,
  carousel: FerrisWheel,
  swing_carousel: Wind,
  swing_ride: Wind,
  pirate_ship: Ship,
  bumper_car: Car,
  drop_tower: TowerControl,
  train: TrainFront,
  amusement_ride: Tent,
  flying_theater: Clapperboard,
  playground: Baby,
  animal: Fish,
};

export default function KindIcon({
  kind,
  className = "size-4",
}: {
  kind?: string;
  className?: string;
}) {
  const Icon = (kind && ICONS[kind]) || Tent;
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}
