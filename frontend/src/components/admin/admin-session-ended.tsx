"use client";

import { useEffect } from "react";

/** 만료·로그아웃 때 서버 접근 검사를 다시 거쳐 운영 화면을 닫는다. 로그인 폼은 공개 로그인 화면에만 둔다. */
export function AdminSessionEnded() {
  useEffect(() => { window.location.reload(); }, []);
  return null;
}
