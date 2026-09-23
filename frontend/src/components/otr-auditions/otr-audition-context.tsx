"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { createOtrAudition, getOtrAuditions } from "@/features/otr-auditions/api";
import type { CreateOtrAudition, OtrAudition } from "@/features/otr-auditions/types";

type OtrAuditionContextValue = {
  readonly auditions: readonly OtrAudition[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
  readonly create: (input: CreateOtrAudition) => Promise<OtrAudition>;
};

const OtrAuditionContext = createContext<OtrAuditionContextValue | null>(null);

export function OtrAuditionProvider({ children }: { readonly children: React.ReactNode }) {
  const [auditions, setAuditions] = useState<readonly OtrAudition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const creationVersion = useRef(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const requestCreationVersion = creationVersion.current;
    getOtrAuditions().then((result) => {
      if (active) {
        setAuditions((current) => {
          if (creationVersion.current === requestCreationVersion) return result;
          const serverIds = new Set(result.map((audition) => audition.id));
          return [...current.filter((audition) => !serverIds.has(audition.id)), ...result];
        });
        setError(null);
        setLoading(false);
      }
    }).catch((cause: unknown) => {
      if (active) {
        setError(cause instanceof Error ? cause.message : "OTR 공고를 불러오지 못했습니다.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [reloadToken]);

  const create = useCallback(async (input: CreateOtrAudition) => {
    const created = await createOtrAudition(input);
    creationVersion.current += 1;
    setAuditions((current) => [created, ...current]);
    return created;
  }, []);

  return <OtrAuditionContext value={{ auditions, loading, error, reload, create }}>{children}</OtrAuditionContext>;
}

export function useOtrAuditions() {
  const context = use(OtrAuditionContext);
  if (!context) throw new Error("OtrAuditionProvider 안에서 사용해야 합니다.");
  return context;
}
