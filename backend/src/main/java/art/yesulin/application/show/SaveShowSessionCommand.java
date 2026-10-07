package art.yesulin.application.show;

import java.time.Instant;

public record SaveShowSessionCommand(Instant startsAt, int capacity) {

    /** 외부 링크 공연의 회차는 정원이 없다. 정원 값은 쓰지 않는다. */
    public static SaveShowSessionCommand withoutCapacity(Instant startsAt) {
        return new SaveShowSessionCommand(startsAt, 0);
    }
}
