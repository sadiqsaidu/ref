import Landing from "@/components/Landing";
import { getMatchSummary } from "@/lib/matchSummary";

export const dynamic = "force-dynamic";

const HERO_FIXTURE = "18222446";

export default async function Page() {
  const summary = await getMatchSummary(HERO_FIXTURE);
  return <Landing summary={summary} />;
}
