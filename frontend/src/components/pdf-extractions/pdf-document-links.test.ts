import { expect, it } from "vitest";
import type { PDFPageProxy } from "pdfjs-dist";
import { documentLink, embeddedDocumentLinks, safeDocumentUrl } from "./pdf-document-links";
it("문서 URI는 http(s)만 허용하고 실행·파일·상대경로·인증정보를 거부한다", () => {
  for (const url of ['javascript:alert(1)','data:text/html,hello','file:///secret','/relative','https://user:secret@example.test']) expect(safeDocumentUrl(url)).toBeNull();
  expect(safeDocumentUrl('https://example.test/video')).toBe('https://example.test/video');
  expect(documentLink('https://example.test',[NaN,1,4,5],100,100,'qr')).toBeNull();
  expect(documentLink('https://example.test',[-10,10,30,20],100,100,'qr')).toMatchObject({left:0,top:.1,width:.3,height:.1});
});
it("회전된 PDF 내장 링크를 화면 좌표로 바꾸고 렌더 크기와 독립인 비율로 유지한다", async () => {
  const page = {getViewport:()=>({width:200,height:100,convertToViewportPoint:(x:number,y:number)=>[y,100-x]}),getAnnotations:async()=>[
    {subtype:'Link',url:'https://example.test',rect:[10,20,30,60]},
    {subtype:'Link',url:'javascript:alert(1)',rect:[0,0,10,10]},
    {subtype:'Text',url:'https://example.test/ignore',rect:[0,0,10,10]},
  ]} as unknown as PDFPageProxy;
  expect(await embeddedDocumentLinks(page)).toEqual([{url:'https://example.test/',left:.1,top:.7,width:.19999999999999998,height:.20000000000000007,kind:'link'}]);
});
