package art.yesulin.domain.applicant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.domain.common.DomainException;
import java.net.URI;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ApplicantProfileTest {

    @Test
    @DisplayName("프로필에는 활동명 하나와 사진 열 장까지 저장할 수 있다")
    void acceptsTenProfilePhotos() {
        // given
        List<ProfilePhoto> photos = IntStream.range(0, 10)
                .mapToObj(index -> new ProfilePhoto(URI.create("https://example.com/" + index + ".jpg")))
                .toList();

        // when
        ApplicantProfile profile = ApplicantProfile.create("무대이름", photos);

        // then
        assertThat(profile.activityName()).isEqualTo("무대이름");
        assertThat(profile.photos()).hasSize(10);
    }

    @Test
    @DisplayName("프로필 사진이 열 장을 넘으면 저장할 수 없다")
    void rejectsMoreThanTenProfilePhotos() {
        // given
        List<ProfilePhoto> photos = IntStream.range(0, 11)
                .mapToObj(index -> new ProfilePhoto(URI.create("https://example.com/" + index + ".jpg")))
                .toList();

        // when & then
        assertThatThrownBy(() -> ApplicantProfile.create("무대이름", photos))
                .isInstanceOf(DomainException.class);
    }
}
