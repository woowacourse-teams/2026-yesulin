import { producerRequest } from "@/features/auditions/api-client";
import type { CreateOtrAudition, OtrAudition } from "./types";

export async function getOtrAuditions(): Promise<readonly OtrAudition[]> {
  const response = await producerRequest<{ readonly auditions: readonly OtrAudition[] }>("/v1/otr-auditions");
  return response.auditions;
}

export function createOtrAudition(input: CreateOtrAudition): Promise<OtrAudition> {
  return producerRequest<OtrAudition>("/v1/otr-auditions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
