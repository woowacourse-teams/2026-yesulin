import "server-only";
import { communityPath } from "./types";

export async function communityPostExists(id: number): Promise<boolean | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  try {
    const response = await fetch(new URL(`/api${communityPath}/${id}`, origin), { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (response.status === 404) return false;
    if (response.ok) return true;
    return null;
  } catch { return null; }
}
