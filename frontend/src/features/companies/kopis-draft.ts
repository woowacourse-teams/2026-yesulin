import type { KopisCompany } from "@/features/admin/types";
import { emptyDraft, type CompanyDraft } from "./profile-draft";

const PHONE = /^[0-9][0-9 ()+-]{6,29}$/;

/**
 * KOPIS 기획제작사 정보로 공연사 정보 처음 값을 만든다. KOPIS가 주는 이름·연락처·홈페이지·장르·최근 작품만 쓰고,
 * 나머지 항목은 운영자가 값을 적거나 비공개를 체크하도록 비워 둔다. 정보 출처 메모에 KOPIS ID와 조회일을 남긴다.
 */
export function draftFromKopis(company: KopisCompany, today: string): CompanyDraft {
  const phone = company.phone?.trim() ?? "";
  const homepage = webAddress(company.homepage);
  return {
    ...emptyDraft(company.name),
    phone: PHONE.test(phone) ? phone : "",
    links: homepage ? [homepage] : [""],
    description: description(company),
    sourceNote: `KOPIS 기획제작사${company.kopisId ? ` ${company.kopisId}` : ""} (${today} 조회)`,
  };
}

function description(company: KopisCompany): string {
  const lines = [
    company.genre ? `${company.genre} 공연을 만드는 공연사예요.` : "",
    company.recentWorks.length ? `KOPIS 등록 작품: ${company.recentWorks.join(", ")}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

/** `www.example.com`처럼 프로토콜이 빠진 주소는 https를 붙인다. 주소가 아니면 null이다. */
function webAddress(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/[^/\s]+/i.test(trimmed)) return trimmed;
  if (/^[^\s/]+\.[^\s/]+/.test(trimmed)) return `https://${trimmed}`;
  return null;
}
