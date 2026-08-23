package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import java.util.ArrayList;
import java.util.List;

public record SubmissionAdditionalInformation(
        String school,
        List<String> links,
        String nationality,
        String coverLetter,
        String specialty,
        String hobbies,
        String military,
        List<SubmissionCareer> careers
) {

    public static final int MAX_LINK_COUNT = 5;
    public static final int MAX_CAREER_COUNT = 10;

    public SubmissionAdditionalInformation {
        school = normalizeNullable(school);
        links = copyLinks(links);
        nationality = normalizeNullable(nationality);
        coverLetter = normalizeNullable(coverLetter);
        specialty = normalizeNullable(specialty);
        hobbies = normalizeNullable(hobbies);
        military = normalizeNullable(military);
        careers = copyCareers(careers);
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
}
