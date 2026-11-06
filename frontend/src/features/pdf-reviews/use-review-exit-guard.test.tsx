// @vitest-environment jsdom
import { act } from 'react';
import Link from 'next/link';
import { createRoot } from 'react-dom/client';
import { expect,it,vi } from 'vitest';
import { useReviewExitGuard } from './use-review-exit-guard';
import { ReviewAutosave } from './review-autosave';
it('모바일 홈 같은 내부 링크는 진행 중 저장과 다음 메모 저장까지 기다린다',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);const previous=window.location.href;window.history.replaceState({},'', '/producers/pdf-reviews');
  const pending: ((value:string)=>void)[]=[];const save=vi.fn(()=>new Promise<string>(r=>pending.push(r)));
  const store=new ReviewAutosave({initial:{title:'',memo:''},save,onDirty:()=>{}});const push=vi.fn();
  function Harness(){useReviewExitGuard(true,action=>{void store.flush().then(ok=>{if(ok)action();});},push);return <Link href="/">예술in 홈</Link>;}
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try {
    await act(async()=>root.render(<Harness/>));store.change('title','이름');const saving=store.flush();await Promise.resolve();store.change('memo','마지막 메모');
    await act(async()=>host.querySelector('a')!.click());expect(push).not.toHaveBeenCalled();
    await act(async()=>pending[0]('이름'));expect(save).toHaveBeenLastCalledWith('memo','마지막 메모');expect(push).not.toHaveBeenCalled();
    await act(async()=>pending[1]('마지막 메모'));await saving;expect(push).toHaveBeenCalledExactlyOnceWith('/');
  } finally {act(()=>root.unmount());host.remove();store.dispose();window.history.replaceState({},'',previous);vi.unstubAllGlobals();}
});
