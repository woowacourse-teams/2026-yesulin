package art.yesulin.show.presentation.api;

import art.yesulin.show.application.SaveShowSessionCommand;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/** 운영자 공연은 외부 링크로 예매받아 회차에 정원이 없고 시작 시각만 받는다. */
public record AdminSaveShowSessionRequest(@NotNull Instant startsAt) {

    SaveShowSessionCommand toCommand() {
        return SaveShowSessionCommand.withoutCapacity(startsAt);
    }
}
