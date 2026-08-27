import type { AdminLog } from "@/features/admin/types";

type Props = {
  readonly log: AdminLog;
  readonly keyword: string;
};

/** 검색어와 일치하는 부분만 표시로 강조한다. 대소문자는 구분하지 않는다. */
function highlight(line: string, keyword: string) {
  if (!keyword) return line;
  const lowerLine = line.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (let found = lowerLine.indexOf(lowerKeyword); found !== -1; found = lowerLine.indexOf(lowerKeyword, cursor)) {
    if (found > cursor) parts.push(line.slice(cursor, found));
    parts.push(
      <mark key={`${found}`} className="bg-amber-200 text-neutral-900">
        {line.slice(found, found + keyword.length)}
      </mark>,
    );
    cursor = found + keyword.length;
  }
  parts.push(line.slice(cursor));
  return parts;
}

export function AdminLogLines({ log, keyword }: Props) {
  if (!log.available) {
    return (
      <p className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        로그 파일을 읽을 수 없습니다. 서버의 <code>logging.file.name</code> 설정과 파일 권한을 확인하세요.
      </p>
    );
  }

  if (log.lines.length === 0) {
    return (
      <p className="rounded border border-neutral-200 bg-white px-4 py-6 text-center text-sm text-neutral-400">
        {keyword ? `"${keyword}"와 일치하는 줄이 없습니다.` : "로그가 비어 있습니다."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-neutral-200 bg-neutral-900">
      <pre className="max-h-[60vh] overflow-y-auto px-4 py-3 text-xs leading-relaxed text-neutral-100">
        {log.lines.map((line, index) => (
          <div key={`${index}-${line.slice(0, 24)}`} className="whitespace-pre-wrap break-all">
            {highlight(line, keyword)}
          </div>
        ))}
      </pre>
    </div>
  );
}
