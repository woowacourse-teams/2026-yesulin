import { expect,it } from 'vitest';
import { reviewEntryName } from './types';
import { screeningApplicant } from './screening-adapter';
import type { ReviewEntry } from './types';
it('명시적으로 지운 배우 이름은 심사 카드/표에서 자동 이름으로 복원되지 않는다',()=>{
  const entry:ReviewEntry={id:'entry',jobId:'job',originalFilename:'test.pdf',title:'',applicantName:'자동 추출 이름',roleId:null,matchStatus:'WAITING',matchEvidence:null,memo:'',decision:'PENDING'};
  expect(reviewEntryName(entry)).toBe('');
  expect(reviewEntryName({applicantName:'기존 응답 이름'})).toBe('기존 응답 이름');
  expect(screeningApplicant({id:'review',title:'심사',createdAt:'2026-11-05',roles:[],entries:[entry]},entry).name).toBe('이름 미입력');
});
