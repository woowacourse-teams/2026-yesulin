import type { IconType } from "react-icons";
import { PiCaretLeft, PiCaretRight, PiInfo, PiList, PiMagnifyingGlass, PiMaskHappy, PiTicket, PiX } from "react-icons/pi";

const icons = {
  menu: PiList, close: PiX, search: PiMagnifyingGlass,
  previous: PiCaretLeft, next: PiCaretRight, auditions: PiMaskHappy,
  shows: PiTicket, about: PiInfo,
} satisfies Record<string, IconType>;

/** 공개 화면은 Phosphor의 기본 선 아이콘을 사용한다. */
export function SiteIcon({ name, className = "", size = 20 }: {
  readonly name: keyof typeof icons;
  readonly className?: string;
  readonly size?: number;
}) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" focusable="false" size={size} className={className} />;
}
