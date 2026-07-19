import { readdir } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const files = await readdir(path.join(process.cwd(), "data", "replays")).catch(
    () => [] as string[],
  );
  return Response.json(
    files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)),
  );
}
