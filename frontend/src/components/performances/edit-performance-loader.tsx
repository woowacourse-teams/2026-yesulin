"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPerformance } from "@/features/performance/api";
import type { Performance } from "@/features/performance/types";
import { EditPerformanceForm } from "./performance-form";

export function EditPerformanceLoader({ performanceId }: { performanceId: string }) {
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPerformance(performanceId)
      .then((response) => {
        if (active) setPerformance(response);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "공연을 불러오지 못했습니다.");
      });
    return () => {
      active = false;
    };
  }, [performanceId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-black">공연을 불러오지 못했습니다.</h1>
        <p className="mt-2 text-sm text-danger">{error}</p>
        <Link href="/producers/performances" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-white">공연 관리로 돌아가기</Link>
      </div>
    );
  }

  return performance ? <EditPerformanceForm performance={performance} /> : <EditFormSkeleton />;
}

function EditFormSkeleton() {
  return (
    <div className="animate-pulse" aria-label="공연 정보를 불러오는 중">
      <div className="h-10 w-56 rounded-xl bg-surface" />
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="h-[620px] rounded-[22px] bg-white" />
        <div className="h-[430px] rounded-[22px] bg-white" />
      </div>
    </div>
  );
}
