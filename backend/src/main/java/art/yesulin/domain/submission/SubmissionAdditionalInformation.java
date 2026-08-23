package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.converter.MilitaryServiceStatusConverter;
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
public class SubmissionAdditionalInformation {

    public static final int MAX_LINK_COUNT = 5;
    public static final int MAX_CAREER_COUNT = 10;

    @Column(name = "additional_information_present", nullable = false, updatable = false)
    private boolean present = true;

    @Column(name = "school", updatable = false, columnDefinition = "text")
    private String school;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "submission_links", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "link_order")
    @Column(name = "url", nullable = false, length = 2_048)
    private List<String> links = new ArrayList<>();

    @Column(name = "nationality", updatable = false, columnDefinition = "text")
    private String nationality;

    @Column(name = "cover_letter", updatable = false, columnDefinition = "text")
    private String coverLetter;

    @Column(name = "specialty", updatable = false, columnDefinition = "text")
    private String specialty;

    @Column(name = "hobbies", updatable = false, columnDefinition = "text")
    private String hobbies;

    @Convert(converter = MilitaryServiceStatusConverter.class)
    @Column(name = "military_service_status", updatable = false, length = 20)
    private MilitaryServiceStatus military;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "submission_careers", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "career_order")
    private List<SubmissionCareer> careers = new ArrayList<>();

    public SubmissionAdditionalInformation(
            String school,
            List<String> links,
            String nationality,
            String coverLetter,
            String specialty,
            String hobbies,
            MilitaryServiceStatus military,
            List<SubmissionCareer> careers
    ) {
        this.school = normalizeNullable(school);
        this.links = new ArrayList<>(copyLinks(links));
        this.nationality = normalizeNullable(nationality);
        this.coverLetter = normalizeNullable(coverLetter);
        this.specialty = normalizeNullable(specialty);
        this.hobbies = normalizeNullable(hobbies);
        this.military = military;
        this.careers = new ArrayList<>(copyCareers(careers));
    }

    private static List<String> copyLinks(List<String> links) {
        List<String> safeLinks = requireNonNull(links, "외부 링크 목록은 필수입니다.");
        if (safeLinks.size() > MAX_LINK_COUNT) {
            throw new BusinessException(INVALID_SUBMISSION, "외부 링크는 최대 5개까지 저장할 수 있습니다.");
        }
        List<String> normalizedLinks = new ArrayList<>(safeLinks.size());
        for (String link : safeLinks) {
            normalizedLinks.add(requireText(link, "외부 링크는 비어 있을 수 없습니다."));
        }
        return List.copyOf(normalizedLinks);
    }

    private static List<SubmissionCareer> copyCareers(List<SubmissionCareer> careers) {
        List<SubmissionCareer> safeCareers = requireNonNull(careers, "경력 목록은 필수입니다.");
        if (safeCareers.size() > MAX_CAREER_COUNT) {
            throw new BusinessException(INVALID_SUBMISSION, "경력은 최대 10개까지 저장할 수 있습니다.");
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

    public MilitaryServiceStatus military() {
        return military;
    }

    public List<SubmissionCareer> careers() {
        return List.copyOf(careers);
    }
}
