import Dashboard from "@/components/Dashboard";
import { network } from "@/lib/verify";

export default function Page() {
  return <Dashboard network={network()} />;
}
