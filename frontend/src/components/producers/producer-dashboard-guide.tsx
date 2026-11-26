import Link from "next/link";
import { PiBookOpen, PiBookmarkSimple, PiCaretDown, PiFileText, PiTicket, PiTray } from "react-icons/pi";
import { actorBookmarkRoutes } from "@/features/actor-pages/bookmark-api";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";
import { PDF_REVIEW_LIST_PATH } from "@/features/producer-dashboard/activity";
import { showRoutes } from "@/features/shows/types";
import styles from "./producer-dashboard.module.css";

const guideItems = [
  {
    title: "오디션 공고 올리기", icon: PiFileText,
    description: "공고를 작성하면 바로 공개돼요. 직접 올리거나 운영팀이 연결해 준 공고는 내 오디션 공고에서 수정할 수 있어요.",
    href: producerAuditionPostRoutes.create, action: "새 공고 작성하기",
  },
  {
    title: "받아둔 PDF 지원서 심사하기", icon: PiTray,
    description: "심사함을 만든 뒤 받은 PDF를 올리세요. 원본을 보며 합격, 보류, 불합격을 기록할 수 있어요.",
    href: PDF_REVIEW_LIST_PATH, action: "PDF 지원자 심사 열기",
  },
  {
    title: "무료 공연 예매 열기", icon: PiTicket,
    description: "공연과 회차를 등록해 공개하세요. 이후 회차마다 예매 현황과 예매자 명단을 확인할 수 있어요.",
    href: showRoutes.manageList, action: "무료 공연 관리 열기",
  },
  {
    title: "저장한 배우 보기", icon: PiBookmarkSimple,
    description: "배우 목록이나 프로필에서 저장해 둔 배우를 모아 볼 수 있어요.",
    href: actorBookmarkRoutes.list(), action: "관심 배우 열기",
  },
];

export function ProducerDashboardGuide() {
  return (
    <section className={`${styles.guide} min-w-0 rounded-card border border-border bg-card`} aria-labelledby="dashboard-guide">
      <h2 id="dashboard-guide" tabIndex={-1} className="flex scroll-mt-20 items-center gap-2 border-b border-border px-5 py-4 text-lg font-bold">
        <PiBookOpen aria-hidden="true" className="shrink-0 text-brand-pressed" /> 기능 가이드
      </h2>
      <div className="divide-y divide-border-soft px-3 py-2">
        {guideItems.map((item) => <GuideItem key={item.title} item={item} />)}
      </div>
    </section>
  );
}

function GuideItem({ item }: { readonly item: typeof guideItems[number] }) {
  const { icon: Icon, title, description, href, action } = item;
  return (
    <details name="producer-dashboard-guide" className="group rounded-control open:bg-brand-soft">
      <summary className="flex min-h-13 cursor-pointer list-none items-center gap-2.5 rounded-control px-2.5 py-2 text-sm font-semibold hover:bg-surface [&::-webkit-details-marker]:hidden">
        <Icon aria-hidden="true" className="size-[18px] shrink-0 text-brand-pressed" /><span>{title}</span>
        <PiCaretDown aria-hidden="true" className="ml-auto shrink-0 text-muted group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-2 pl-10 text-sm text-muted-strong">
        <p>{description}</p>
        <Link href={href} className="inline-flex min-h-11 items-center font-semibold text-brand-pressed hover:underline">{action}</Link>
      </div>
    </details>
  );
}
