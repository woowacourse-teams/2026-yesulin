/**
 * 시트 하나짜리 .xlsx를 브라우저에서 만든다. 라이브러리 없이 필요한 최소 OOXML 파트만 압축하지 않은 zip(STORE)으로 묶는다.
 * 글자 칸은 inline string으로 넣어 `=`로 시작하는 값도 수식이 아니라 글자로 남고, 휴대폰 번호 앞의 0도 지켜진다.
 */

export type XlsxCell = string | number;

export type XlsxColumn = {
  readonly header: string;
  /** Excel 열 너비(대략 글자 수). */
  readonly width: number;
};

export type XlsxSheet = {
  readonly name: string;
  readonly columns: readonly XlsxColumn[];
  readonly rows: readonly (readonly XlsxCell[])[];
  /** 표 아래에 한 행 띄우고 A열에 굵게 적는 안내 문구. 한 줄에 한 행씩. */
  readonly notes?: readonly string[];
};

export const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_SHEET_NAME_LENGTH = 31;
// XML 1.0에서 쓸 수 없는 제어 문자. 사용자가 붙여넣은 이름에 섞여 있으면 파일이 깨지므로 뺀다.
const INVALID_XML_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export function createXlsxBlob(sheet: XlsxSheet): Blob {
  return new Blob([buildXlsx(sheet)], { type: XLSX_MIME_TYPE });
}

export function buildXlsx(sheet: XlsxSheet): Uint8Array<ArrayBuffer> {
  return zipStored([
    ["[Content_Types].xml", CONTENT_TYPES],
    ["_rels/.rels", ROOT_RELATIONSHIPS],
    ["xl/workbook.xml", workbookXml(sheet.name)],
    ["xl/_rels/workbook.xml.rels", WORKBOOK_RELATIONSHIPS],
    ["xl/styles.xml", STYLES],
    ["xl/worksheets/sheet1.xml", worksheetXml(sheet)],
  ]);
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELATIONSHIP_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_RELATIONSHIP = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const CONTENT_TYPES = `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  + "</Types>";

const ROOT_RELATIONSHIPS = `${XML_HEADER}<Relationships xmlns="${RELATIONSHIP_NS}">`
  + `<Relationship Id="rId1" Type="${OFFICE_RELATIONSHIP}/officeDocument" Target="xl/workbook.xml"/>`
  + "</Relationships>";

const WORKBOOK_RELATIONSHIPS = `${XML_HEADER}<Relationships xmlns="${RELATIONSHIP_NS}">`
  + `<Relationship Id="rId1" Type="${OFFICE_RELATIONSHIP}/worksheet" Target="worksheets/sheet1.xml"/>`
  + `<Relationship Id="rId2" Type="${OFFICE_RELATIONSHIP}/styles" Target="styles.xml"/>`
  + "</Relationships>";

/** 스타일 0은 기본, 1은 머리글(굵게). */
const STYLES = `${XML_HEADER}<styleSheet xmlns="${SPREADSHEET_NS}">`
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + "</styleSheet>";

function workbookXml(name: string) {
  return `${XML_HEADER}<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${OFFICE_RELATIONSHIP}">`
    + `<sheets><sheet name="${escapeXml(sheetName(name))}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

/** Excel 시트 이름은 31자 이하이고 : \ / ? * [ ]를 쓸 수 없다. */
function sheetName(name: string) {
  const cleaned = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, MAX_SHEET_NAME_LENGTH);
  return cleaned || "Sheet1";
}

function worksheetXml(sheet: XlsxSheet) {
  const cols = sheet.columns
    .map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`)
    .join("");
  const header = rowXml(1, sheet.columns.map((column) => column.header), 1);
  const body = sheet.rows.map((row, index) => rowXml(index + 2, row, 0)).join("");
  const firstNoteRow = sheet.rows.length + 3;
  const notes = (sheet.notes ?? []).map((note, index) => rowXml(firstNoteRow + index, [note], 1)).join("");
  // 머리글 행을 고정해 명단이 길어도 열 이름이 보이게 한다.
  return `${XML_HEADER}<worksheet xmlns="${SPREADSHEET_NS}">`
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${cols}</cols><sheetData>${header}${body}${notes}</sheetData></worksheet>`;
}

function rowXml(rowNumber: number, cells: readonly XlsxCell[], style: number) {
  const styleAttribute = style ? ` s="${style}"` : "";
  const content = cells.map((cell, index) => {
    const reference = `${columnName(index)}${rowNumber}`;
    if (typeof cell === "number" && Number.isFinite(cell)) {
      return `<c r="${reference}"${styleAttribute}><v>${cell}</v></c>`;
    }
    return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(String(cell))}</t></is></c>`;
  }).join("");
  return `<row r="${rowNumber}">${content}</row>`;
}

/** 0 → A, 25 → Z, 26 → AA */
function columnName(index: number): string {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function escapeXml(value: string) {
  return value
    .replace(INVALID_XML_CHARACTERS, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/* ---------- zip (STORE) ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** 1980-01-01 00:00 (DOS 시각의 최솟값). 내용이 같으면 같은 파일이 나오도록 수정 시각을 고정한다. */
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
const UTF8_FLAG = 0x0800;

function zipStored(files: readonly (readonly [string, string])[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const entries = files.map(([name, content]) => {
    const data = encoder.encode(content);
    return { name: encoder.encode(name), data, crc: crc32(data) };
  });
  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.data.length, 0);
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0);
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  let offset = 0;
  const offsets: number[] = [];

  for (const entry of entries) {
    offsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, UTF8_FLAG, true);
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, DOS_TIME, true);
    view.setUint16(offset + 12, DOS_DATE, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.data.length, true);
    view.setUint32(offset + 22, entry.data.length, true);
    view.setUint16(offset + 26, entry.name.length, true);
    view.setUint16(offset + 28, 0, true);
    output.set(entry.name, offset + 30);
    output.set(entry.data, offset + 30 + entry.name.length);
    offset += 30 + entry.name.length + entry.data.length;
  }

  const centralOffset = offset;
  entries.forEach((entry, index) => {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, UTF8_FLAG, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, DOS_TIME, true);
    view.setUint16(offset + 14, DOS_DATE, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.data.length, true);
    view.setUint32(offset + 24, entry.data.length, true);
    view.setUint16(offset + 28, entry.name.length, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, offsets[index]!, true);
    output.set(entry.name, offset + 46);
    offset += 46 + entry.name.length;
  });

  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, offset - centralOffset, true);
  view.setUint32(offset + 16, centralOffset, true);
  view.setUint16(offset + 20, 0, true);
  return output;
}
