-- 이벤트 개요(body)와 상세 설명(detail_body)은 2,000자면 충분하다. 5,000자 VARCHAR 두 개가 events 한 행 한도(65,535바이트)를
-- 대부분 차지해 열을 더할 때마다 1118 오류 위험이 있어 줄인다. 두 환경 모두 2,000자를 넘는 행이 없다.
-- contract: 운영자만 쓰는 길이 축소이고 기존 데이터가 2,000자 이하라, 배포 중 옛 서버가 2,000자 넘게 저장하는 경우만 실패한다
ALTER TABLE events MODIFY COLUMN body VARCHAR(2000) NOT NULL;
ALTER TABLE events MODIFY COLUMN detail_body VARCHAR(2000) NULL;
