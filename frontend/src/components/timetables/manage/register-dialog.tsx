"use client";

import { TIMETABLE_LIMITS, type ActorContact } from "@/features/timetables/types";
import { RegisterActorsForm } from "./register-actors-form";
import { SheetDialog } from "./sheet-dialog";

export function RegisterDialog({ actorCount, busy, onRegister, onClose }: {
  readonly actorCount: number;
  readonly busy: boolean;
  readonly onRegister: (contacts: readonly ActorContact[]) => Promise<boolean>;
  readonly onClose: () => void;
}) {
  return (
    <SheetDialog title="합격자 추가" busy={busy} onClose={onClose}>
      <RegisterActorsForm
        busy={busy}
        remaining={TIMETABLE_LIMITS.maxActors - actorCount}
        defaultMode="bulk"
        onRegister={async (contacts) => {
          const registered = await onRegister(contacts);
          if (registered) onClose();
          return registered;
        }}
      />
    </SheetDialog>
  );
}
