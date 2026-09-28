import { http, passthrough } from "msw";

// 실제 관리자 권한과 S3 삭제를 확인하도록 MSW에서도 서버에 전달한다.
export const adminFileHandlers = [
  http.get("/api/v1/admin/files/unreferenced", () => passthrough()),
  http.delete("/api/v1/admin/files/:fileId", () => passthrough()),
  http.post("/api/v1/admin/files/deletions", () => passthrough()),
];
