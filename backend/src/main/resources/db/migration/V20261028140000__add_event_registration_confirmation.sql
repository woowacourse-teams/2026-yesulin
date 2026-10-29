ALTER TABLE events
    ADD COLUMN registration_confirmation_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- events 행은 VARCHAR 열 합계가 MySQL 한 행 한도(65,535바이트)에 가까워 VARCHAR(2000)을 더하면 1118 오류가 난다.
-- TEXT는 한 행 한도에 거의 포함되지 않는다. 길이 2,000자 제한은 도메인에서 한다.
ALTER TABLE events
    ADD COLUMN registration_confirmation_message TEXT NULL;
