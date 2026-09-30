package art.yesulin.domain.admin.query;

import java.time.Instant;

/** 일별 활동을 세기 위한 발생 시각과 수량이다. 수량은 예매 매수에만 쓰고 나머지는 1이다. */
public record AdminActivityEvent(Instant occurredAt, long quantity) {
}
