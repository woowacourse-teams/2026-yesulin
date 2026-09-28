import { describe, expect, it } from "vitest";
import { buildXlsx, crc32 } from "./xlsx";

/** 테스트용: 압축하지 않은(STORE) zip의 로컬 파일들을 읽는다. */
function readStoredZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    expect(view.getUint16(offset + 8, true)).toBe(0);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const data = bytes.subarray(offset + 30 + nameLength, offset + 30 + nameLength + size);
    expect(view.getUint32(offset + 14, true)).toBe(crc32(data));
    files.set(name, decoder.decode(data));
    offset += 30 + nameLength + size;
  }
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  expect(view.getUint16(end + 10, true)).toBe(files.size);
  return files;
}

describe("xlsx", () => {
  it("CRC-32는 표준 값과 같다", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("시트·머리글·행을 OOXML 파트로 묶는다", () => {
    const files = readStoredZip(buildXlsx({
      name: "예매자명단",
      columns: [{ header: "이름", width: 14 }, { header: "매수", width: 8 }],
      rows: [["홍길동", 3], ["=HYPERLINK(\"x\") & <b>", 1]],
    }));

    expect([...files.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(files.get("xl/workbook.xml")).toContain('<sheet name="예매자명단" sheetId="1" r:id="rId1"/>');
    const sheet = files.get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">이름</t></is></c>');
    expect(sheet).toContain('<c r="B2"><v>3</v></c>');
    // 수식처럼 보이는 글자도 글자 칸으로 들어가고 XML 특수 문자는 escape된다.
    expect(sheet).toContain("<t xml:space=\"preserve\">=HYPERLINK(&quot;x&quot;) &amp; &lt;b&gt;</t>");
    expect(sheet).not.toContain("<f>");
  });

  it("시트 이름에서 Excel이 막는 글자를 빼고 31자로 자른다", () => {
    const files = readStoredZip(buildXlsx({ name: `a/b:${"가".repeat(40)}`, columns: [], rows: [] }));
    expect(files.get("xl/workbook.xml")).toContain(`<sheet name="a b ${"가".repeat(27)}"`);
  });
});
