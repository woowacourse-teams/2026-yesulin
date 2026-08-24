package art.yesulin.domain.profile;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.profile.ProfileErrorCode.INVALID_PROFILE;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.profile.converter.ProfileMilitaryServiceStatusConverter;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProfileAdditionalInformation {

    public static final int MAX_LINK_COUNT = 5;
    public static final int MAX_CAREER_COUNT = 10;
    public static final int MAX_SCHOOL_LENGTH = 255;
    public static final int MAX_LINK_LENGTH = 255;
    public static final int MAX_NATIONALITY_LENGTH = 100;
    public static final int MAX_COVER_LETTER_LENGTH = 2_000;
    public static final int MAX_SPECIALTY_LENGTH = 255;
    public static final int MAX_HOBBIES_LENGTH = 255;

    @Column(name = "school", length = MAX_SCHOOL_LENGTH)
    private String school;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "applicant_profile_links", joinColumns = @JoinColumn(name = "applicant_profile_id"))
    @OrderColumn(name = "link_order")
    @Column(name = "url", nullable = false, length = MAX_LINK_LENGTH)
    private List<String> links = new ArrayList<>();

    @Column(name = "nationality", length = MAX_NATIONALITY_LENGTH)
    private String nationality;

    @Column(name = "cover_letter", length = MAX_COVER_LETTER_LENGTH)
    private String coverLetter;

    @Column(name = "specialty", length = MAX_SPECIALTY_LENGTH)
    private String specialty;

    @Column(name = "hobbies", length = MAX_HOBBIES_LENGTH)
    private String hobbies;

    @Convert(converter = ProfileMilitaryServiceStatusConverter.class)
    @Column(name = "military_service_status", length = 20)
    private ProfileMilitaryServiceStatus militaryServiceStatus;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "applicant_profile_careers", joinColumns = @JoinColumn(name = "applicant_profile_id"))
    @OrderColumn(name = "career_order")
    private List<ProfileCareer> careers = new ArrayList<>();

    public ProfileAdditionalInformation(
            String school,
            List<String> links,
            String nationality,
            String coverLetter,
            String specialty,
            String hobbies,
            ProfileMilitaryServiceStatus militaryServiceStatus,
            List<ProfileCareer> careers
    ) {
        this.school = normalizeNullable(school, MAX_SCHOOL_LENGTH, "학력은 255자를 넘을 수 없습니다.");
        this.links = new ArrayList<>(copyLinks(links));
        this.nationality = normalizeNullable(
                nationality, MAX_NATIONALITY_LENGTH, "국적은 100자를 넘을 수 없습니다."
        );
        this.coverLetter = normalizeNullable(
                coverLetter, MAX_COVER_LETTER_LENGTH, "자기소개는 2,000자를 넘을 수 없습니다."
        );
        this.specialty = normalizeNullable(specialty, MAX_SPECIALTY_LENGTH, "특기는 255자를 넘을 수 없습니다.");
        this.hobbies = normalizeNullable(hobbies, MAX_HOBBIES_LENGTH, "취미는 255자를 넘을 수 없습니다.");
        this.militaryServiceStatus = militaryServiceStatus;
        this.careers = new ArrayList<>(copyCareers(careers));
    }

    public static ProfileAdditionalInformation empty() {
        return new ProfileAdditionalInformation();
    }

    private static List<String> copyLinks(List<String> links) {
        List<String> safeLinks = requireNonNull(links, "외부 링크 목록은 필수입니다.");
        if (safeLinks.size() > MAX_LINK_COUNT) {
            throw new BusinessException(INVALID_PROFILE, "외부 링크는 최대 5개까지 저장할 수 있습니다.");
        }
        List<String> normalizedLinks = new ArrayList<>(safeLinks.size());
        for (String link : safeLinks) {
            String normalizedLink = requireText(link, "외부 링크는 비어 있을 수 없습니다.");
            if (normalizedLink.length() > MAX_LINK_LENGTH) {
                throw new BusinessException(INVALID_PROFILE, "외부 링크는 255자를 넘을 수 없습니다.");
            }
            normalizedLinks.add(normalizedLink);
        }
        return List.copyOf(normalizedLinks);
    }

    private static List<ProfileCareer> copyCareers(List<ProfileCareer> careers) {
        List<ProfileCareer> safeCareers = requireNonNull(careers, "경력 목록은 필수입니다.");
        if (safeCareers.size() > MAX_CAREER_COUNT) {
            throw new BusinessException(INVALID_PROFILE, "경력은 최대 10개까지 저장할 수 있습니다.");
        }
        safeCareers.forEach(career -> requireNonNull(career, "경력은 비어 있을 수 없습니다."));
        return List.copyOf(safeCareers);
    }

    private static String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String normalizeNullable(String value, int maxLength, String message) {
        String normalizedValue = normalizeNullable(value);
        if (normalizedValue != null && normalizedValue.length() > maxLength) {
            throw new BusinessException(INVALID_PROFILE, message);
        }
        return normalizedValue;
    }

    public String school() {
        return school;
    }

    public List<String> links() {
        return List.copyOf(links);
    }

    public String nationality() {
        return nationality;
    }

    public String coverLetter() {
        return coverLetter;
    }

    public String specialty() {
        return specialty;
    }

    public String hobbies() {
        return hobbies;
    }

    public ProfileMilitaryServiceStatus militaryServiceStatus() {
        return militaryServiceStatus;
    }

    public List<ProfileCareer> careers() {
        return List.copyOf(careers);
    }
}
