package art.yesulin.actor.domain.page;

import art.yesulin.actor.domain.profile.ProfileBasicInformation;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public record ActorPageReadiness(
        boolean ready,
        List<ActorPageMissingField> missing,
        boolean underAge,
        boolean locked
) {

    public ActorPageReadiness {
        missing = List.copyOf(missing);
    }

    public static ActorPageReadiness assess(
            String handle,
            ProfileBasicInformation basic,
            boolean hasPublicPhoto,
            boolean locked,
            LocalDate today
    ) {
        ProfileBasicInformation information = basic == null ? ProfileBasicInformation.empty() : basic;
        List<ActorPageMissingField> missing = new ArrayList<>();
        if (handle == null) {
            missing.add(ActorPageMissingField.HANDLE);
        }
        if (information.name() == null || information.name().isBlank()) {
            missing.add(ActorPageMissingField.NAME);
        }
        if (information.gender() == null) {
            missing.add(ActorPageMissingField.GENDER);
        }
        if (information.birthDate() == null) {
            missing.add(ActorPageMissingField.BIRTH_DATE);
        }
        if (!hasPublicPhoto) {
            missing.add(ActorPageMissingField.PUBLIC_PHOTO);
        }
        boolean underAge = information.birthDate() != null
                && Period.between(information.birthDate(), today).getYears() < 14;
        return new ActorPageReadiness(missing.isEmpty() && !underAge && !locked, missing, underAge, locked);
    }

    public String message() {
        String missingLabels = missing.stream().map(ActorPageMissingField::label).collect(Collectors.joining(", "));
        if (underAge) {
            return "만 14세 미만은 배우 페이지를 공개할 수 없습니다.";
        }
        return "배우 페이지 공개에 필요한 항목을 입력해 주세요: " + missingLabels;
    }
}
