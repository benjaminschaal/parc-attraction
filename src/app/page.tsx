import { redirect } from "next/navigation";
import { DEFAULT_PARK } from "@/lib/parks";

export default function Home() {
  redirect(`/parc/${DEFAULT_PARK}`);
}
