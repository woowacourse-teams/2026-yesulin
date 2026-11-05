import { beforeEach,expect,it,vi } from 'vitest';
import { reportError } from '@/features/monitoring/report-error';
import { reportReviewError } from './report-review-error';
import { reportPdfError } from '../pdf-extractions/report-pdf-error';
vi.mock('@/features/monitoring/report-error',()=>({reportError:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
it('네트워크/서버 오류는 원문을 제거해 보고하고 4xx와 취소는 제외한다',()=>{
  reportReviewError(Object.assign(new Error('private memo'),{status:500}),'autosave');reportPdfError(new Error('https://s3.private/signed?secret=key'),'render_page');
  expect(reportError).toHaveBeenCalledTimes(2);expect(JSON.stringify(vi.mocked(reportError).mock.calls)).not.toMatch(/private|secret/);
  reportReviewError({status:401},'autosave');reportPdfError(Object.assign(new Error('cancel'),{name:'RenderingCancelledException'}),'render_page');
  expect(reportError).toHaveBeenCalledTimes(2);
});
