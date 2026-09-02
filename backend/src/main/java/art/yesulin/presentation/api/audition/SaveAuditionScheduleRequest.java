package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.schedule.SaveAuditionScheduleCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record SaveAuditionScheduleRequest(
        @NotNull(message = "모집 종료 시각을 입력해 주세요.") Instant recruitmentEndAt,
        @NotNull(message = "전형 목록이 필요합니다.")
        @Size(min = 1, max = 5, message = "전형은 1개 이상 5개 이하로 등록해 주세요.")
        List<@NotNull @Valid SaveScreeningStageRequest> stages
) {

    SaveAuditionScheduleCommand toCommand() {
        return new SaveAuditionScheduleCommand(
                null,
                recruitmentEndAt,
                stages.stream().map(SaveScreeningStageRequest::toCommand).toList()
        );
    }
}
