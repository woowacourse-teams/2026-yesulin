import Link from "next/link";
import type { IconType } from "react-icons";
import { PiBuildings, PiMaskHappy, PiMusicNotes, PiPersonSimpleRun, PiUsersThree } from "react-icons/pi";
import { auditionPostRoutes } from "@/features/audition-posts/types";

const shortcuts: readonly { readonly label: string; readonly href: string; readonly icon: IconType }[] = [
  { label: "뮤지컬", href: auditionPostRoutes.list({ category: "뮤지컬" }), icon: PiMusicNotes },
  { label: "연극", href: auditionPostRoutes.list({ category: "연극" }), icon: PiMaskHappy },
  { label: "퍼포먼스", href: auditionPostRoutes.list({ category: "퍼포먼스" }), icon: PiPersonSimpleRun },
  { label: "단원", href: auditionPostRoutes.list({ category: "단원" }), icon: PiUsersThree },
  { label: "기획사", href: auditionPostRoutes.list({ category: "기획사" }), icon: PiBuildings },
];

/** 오디션 분야별 목록으로 바로 가는 아이콘 줄. 헤더 메뉴(무료 공연·이벤트)는 반복하지 않는다. */
export function CategoryShortcuts() {
  return <nav aria-label="분야 바로가기" className="home-shortcuts">
    {shortcuts.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="home-shortcut">
      <span className="home-shortcut-icon"><Icon aria-hidden="true" focusable="false" size={26} /></span>
      <span>{label}</span>
    </Link>)}
  </nav>;
}
