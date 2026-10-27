package art.yesulin.actor.application.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import art.yesulin.actor.domain.profile.ProfileCareerGenre;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:profile-career-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class ProfileCareerServiceTest {

    @Autowired
    private ApplicantProfileService profiles;
    @Autowired
    private MemberRepository members;
    @Autowired
    private EntityManager entityManager;

    @ParameterizedTest
    @EnumSource(ProfileCareerGenre.class)
    @NullSource
    void savesAndReloadsNullableGenreThroughConverter(ProfileCareerGenre genre) {
        long owner = members.saveAndFlush(Member.ofApplicant()).getId();
        profiles.update(owner, command(List.of(new UpdateProfileCareerCommand(2026, "작품", "배역", genre))));
        entityManager.clear();
        assertEquals(genre, profiles.find(owner).additionalInformation().careers().getFirst().genre());
    }

    @Test
    void savesThirtyCareersAndPreservesLegacyGenreDefault() {
        long owner = members.saveAndFlush(Member.ofApplicant()).getId();
        List<UpdateProfileCareerCommand> careers = IntStream.range(0, 30)
                .mapToObj(index -> new UpdateProfileCareerCommand(2026, "작품 " + index, "배역")).toList();
        profiles.update(owner, command(careers));
        entityManager.clear();
        List<ProfileCareerResult> result = profiles.find(owner).additionalInformation().careers();
        assertEquals(30, result.size());
        assertNull(result.getFirst().genre());
    }

    private UpdateApplicantProfileCommand command(List<UpdateProfileCareerCommand> careers) {
        return new UpdateApplicantProfileCommand(
                new UpdateProfileBasicInformationCommand("배우", null, null, null, null, null, null, null),
                new UpdateProfileAdditionalInformationCommand(
                        null, null, null, List.of(), null, null, null, null, null, careers
                )
        );
    }
}
