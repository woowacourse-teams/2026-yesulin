import { expect, it } from 'vitest';
import { matchesFilter, type ReviewEntry } from './types';
const entry: ReviewEntry = { id:'a',jobId:'job',originalFilename:'a.pdf',applicantName:null,roleId:null,matchStatus:'WAITING',matchEvidence:null,memo:'',decision:'PENDING' };
it.each(['WAITING','MATCHED','NEEDS_CHECK'] as const)('배역 ID가 없으면 추출 상태 %s와 관계없이 미배정이다',matchStatus=>{
  expect(matchesFilter({...entry,matchStatus},'NEEDS_CHECK')).toBe(true);
});
it('배역 필터는 수동 배정 ID를 기준으로 현재 항목을 분류한다',()=>{
  const assigned={...entry,roleId:'lead'};
  expect(matchesFilter(assigned,'NEEDS_CHECK')).toBe(false);
  expect(matchesFilter(assigned,{roleId:'lead'})).toBe(true);
  expect(matchesFilter(assigned,{roleId:'other'})).toBe(false);
});
