package art.yesulin.application.recruitment;

import java.time.LocalDate;

public record ScreeningRoundCommand(int round, String name, LocalDate date, String note) {
}
