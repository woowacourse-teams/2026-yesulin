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
    void legacyThreeArgumentConstructorKeepsGenreUnclassified() {
        assertNull(new ProfileCareer(2026, "작품", "배역").genre());
    }

    @ParameterizedTest
    @EnumSource(ProfileCareerGenre.class)
    void acceptsEveryOptionalGenre(ProfileCareerGenre genre) {
        assertEquals(genre, new ProfileCareer(2026, "작품", "배역", genre).genre());
    }

    private ProfileAdditionalInformation information(int count) {
        return new ProfileAdditionalInformation(
                null, null, null, List.of(), null, null, null, null, null,
                IntStream.range(0, count).mapToObj(index -> new ProfileCareer(2026, "작품 " + index, "배역")).toList()
        );
    }
}
