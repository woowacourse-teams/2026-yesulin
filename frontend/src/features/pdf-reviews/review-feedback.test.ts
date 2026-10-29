// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { extractedSocialLinks, socialLink } from "./social-links";
import { matchesDecision, type ReviewDecision } from "./types";
import { collectDroppedPdfs, folderPdfs } from "./upload-selection";

describe("PDF 심사 피드백", () => {
  it("대기와 보류를 겹치지 않는 네 분류로 나눈다", () => {
    const decisions: ReviewDecision[] = ['PENDING', 'PASS', 'FAIL', 'HOLD'];
    for (const decision of decisions) {
      expect(decisions.filter(filter => matchesDecision({ decision }, filter))).toEqual([decision]);
    }
  });

  it("본문에 명시된 SNS 주소만 연결하고 위험한 주소와 유사 도메인은 제외한다", () => {
    const text = 'Instagram: (https://www.instagram.com/sample.actor/).\n영상: https://youtu.be/demo?t=12\nhttps://instagram.com.evil.test/no https://evilinstagram.com/no\nhttps://user:password@instagram.com/no javascript:alert(1)';
    expect(extractedSocialLinks(text).map(link => link.url)).toEqual([
      'https://www.instagram.com/sample.actor/', 'https://youtu.be/demo?t=12',
    ]);
    expect(socialLink('javascript:alert(1)')).toBeNull();
    expect(extractedSocialLinks('@sample.actor QR 코드')).toEqual([]);
  });

  it("폴더 안의 PDF만 300개까지 선택하고 301개는 부분 접수하지 않는다", () => {
    const files = Array.from({ length: 300 }, (_, i) => new File(['fixture'], `synthetic-${i}.pdf`));
    expect(folderPdfs([...files, new File(['fixture'], 'photo.png')])).toHaveLength(300);
    expect(() => folderPdfs([...files, new File(['fixture'], 'overflow.pdf')])).toThrow('300개');
  });

  it("폴더의 첫 묶음 이후 PDF도 빈 묶음이 나올 때까지 읽는다", async () => {
    let batch = 0;
    const children = Array.from({ length: 205 }, (_, i) => ({
      isFile: true, isDirectory: false,
      file: (resolve: (file: File) => void) => resolve(new File(['fixture'], `synthetic-${i}.pdf`)),
    }));
    const directory = { isDirectory: true, isFile: false,
      createReader: () => ({ readEntries: (resolve: (entries: unknown[]) => void) => {
        resolve(children.slice(batch * 100, ++batch * 100));
      } }),
    };
    const transfer = { items: [{ kind: 'file', webkitGetAsEntry: () => directory }], files: [] } as unknown as DataTransfer;
    expect(await collectDroppedPdfs(transfer)).toHaveLength(205);
    expect(batch).toBe(4);
  });
});
