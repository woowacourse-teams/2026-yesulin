package art.yesulin.domain.application;

import java.time.LocalDate;

public record BasicInformation(// no-excuse-ok: domain value object
        String name,
        int height,
        int weight,
        LocalDate birthDate,
        Gender gender,
        String phone,
        String email,
        String residence) {
}
