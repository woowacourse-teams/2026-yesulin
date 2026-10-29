# 공용 AI 작업

1. 추출 결과를 저장한 트랜잭션에서 jobId당 PdfAiJob을 한 번 만든다. 심사는 배역 스냅샷,
   배우 가져오기는 reviewId=null·roles=[]다. 추출 실패·비활성·본문 없음/초과·레거시 완료는 SKIPPED다.
2. Scheduler가 Worker를 실행하고 QueueService.claim이 DB Gate를 잠가 전역 상한·호출 간격·lease를 획득한다.
3. DB 트랜잭션 밖에서 모델을 호출하고 응답 형식·원문 근거를 검사한다.
4. 성공은 AI resultJson 저장과 동기 이벤트 반영을 같은 트랜잭션으로 커밋한다.
   심사는 이름·배역·READY 반영(수동 배역·메모·판정 보호), 배우는 최종 완료 시각과 제안 유무에 따른 일일 집계를 반영한다.
5. 일시 실패는 PENDING+백오프, 영구 실패/시도 소진은 FAILED다. 심사는 NEEDS_REVIEW,
   배우는 원본 추출 상태를 최종 확정하고 유효 제안이 없으면 일일 성공 집계에 포함하지 않는다.
6. 만료 lease를 복구하고 오래된 응답은 무시한다. 배우 닫기·TTL 삭제에서는 AI 결과도 지워 개인정보를 남기지 않는다.

일반 추출 payload는 AI 결과로 덮어쓰지 않는다. 실패해도 심사의 원문·사진과 담당자 입력은 유지한다.
정책: [상한·재시도](../policies/ai-processing.md), [근거·프로필](../policies/profile-contract.md).
