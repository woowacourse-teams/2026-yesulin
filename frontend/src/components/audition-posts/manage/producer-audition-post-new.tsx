"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useToast } from "@/components/auditions/toast";
import { AuditionPostForm } from "@/components/audition-posts/editor/audition-post-form";
import { getProducerProfile } from "@/features/auditions/api";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import type { AuditionPostWrite } from "@/features/audition-posts/editing";
import { publishAuditionPost, uploadMyAuditionPostFile } from "@/features/audition-posts/producer-api";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";
import { ProducerAuditionPostFrame } from "./producer-audition-post-frame";

/** 기획사가 공고를 올린다. 올리면 바로 공개되고, 작성자는 기획사 이름으로 표시된다. */
export function ProducerAuditionPostNew() {
  const router = useRouter();
  const toast = useToast();
  // 서버가 작성자로 정할 기획사 이름을 미리 보여 준다. 사이드바 계정 정보와 같은 조회다.
  const profile = useAuditionQuery("producer-sidebar-profile", getProducerProfile, "").data;

  const publish = useCallback(async (write: AuditionPostWrite) => {
    await publishAuditionPost(write);
    toast("공고를 올렸어요. 예술in 메인에 바로 공개됐어요.", { type: "success" });
    router.push(producerAuditionPostRoutes.list);
  }, [router, toast]);

  return (
    <ProducerAuditionPostFrame
      title="공고 올리기"
      description="올리면 예술in 메인에 바로 공개돼요. 지원 방법(이메일·링크·연락처)을 본문에 꼭 적어 주세요. 허위·부적절한 공고는 운영자가 숨길 수 있어요."
    >
      <AuditionPostForm
        post={null}
        submitLabel="공고 올리기"
        createHint="분류와 제목, 본문을 쓰고 올려 주세요."
        authorEditable={false}
        fixedAuthorName={profile?.companyName}
        uploadFile={uploadMyAuditionPostFile}
        onSubmit={publish}
      />
    </ProducerAuditionPostFrame>
  );
}
