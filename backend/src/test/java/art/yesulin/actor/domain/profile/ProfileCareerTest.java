package art.yesulin.actor.domain.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class ProfileCareerTest {

    @Test
    void acceptsThirtyCareersAndRejectsThirtyOne() {
        assertEquals(30, information(30).careers().size());
        BusinessException exception = assertThrows(BusinessException.class, () -> information(31));
        assertTrue(exception.getMessage().contains("30개"));
    }

    @Test
    void fourArgumentConstructorKeepsGenreUnclassified() {
        assertNull(new ProfileCareer(2026, 3, "작품", "배역").genre());
    }

    @ParameterizedTest
    @EnumSource(ProfileCareerGenre.class)
    void acceptsEveryOptionalGenre(ProfileCareerGenre genre) {
        assertEquals(genre, new ProfileCareer(2026, 3, "작품", "배역", genre).genre());
    }

    @Test
    void newOrChangedCareersRequireMonthButRetainedLegacyRowsDoNot() {
        ProfileCareer legacy = new ProfileCareer(2024, null, "기존 작품", "주연");
        ProfileAdditionalInformation retained = information(List.of(legacy));
        retained.validateCareerMonths(List.of(legacy));
        assertThrows(BusinessException.class, () -> retained.validateCareerMonths(List.of()));
        assertThrows(BusinessException.class, () -> information(List.of(
                new ProfileCareer(2024, null, "수정한 작품", "주연"))).validateCareerMonths(List.of(legacy)));
        assertThrows(BusinessException.class, () -> information(List.of(legacy, legacy))
                .validateCareerMonths(List.of(legacy)));
        information(List.of(new ProfileCareer(2024, 5, "수정한 작품", "주연")))
                .validateCareerMonths(List.of(legacy));
    }

    @Test
    void rejectsOutOfRangeMonthsAndRetainsUnknownLegacyMonth() {
        assertNull(new ProfileCareer(2024, null, "기존 작품", "주연").month());
        for (int month : List.of(0, 13)) {
            assertThrows(BusinessException.class, () -> new ProfileCareer(2024, month, "작품", "주연"));
        }
    }

    private ProfileAdditionalInformation information(List<ProfileCareer> careers) {
        return new ProfileAdditionalInformation(
                null, null, null, List.of(), null, null, null, null, null, careers);
    }

    private ProfileAdditionalInformation information(int count) {
        return new ProfileAdditionalInformation(
                null, null, null, List.of(), null, null, null, null, null,
                IntStream.range(0, count).mapToObj(index -> new ProfileCareer(2026, 3, "작품 " + index, "배역")).toList()
        );
    }
}
