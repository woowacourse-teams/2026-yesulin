package art.yesulin.application.screening;

import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.screening.AuditionScreening;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import art.yesulin.domain.screening.ScreeningRound;
import art.yesulin.domain.submission.ApplicantSnapshot;
import art.yesulin.domain.submission.SelectedRole;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionEducationLevel;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ScreeningApplicantResult(
        UUID id,
        String name,
        String gender,
        Integer age,
        Integer height,
        Integer weight,
        long roleId,
        String roleName,
        LocalDate birth,
        String phone,
        String email,
        String address,
        SubmissionEducationLevel educationLevel,
        String school,
        String major,
        List<String> links,
        String nationality,
        String specialty,
        String hobbies,
        String militaryServiceStatus,
        Instant submittedAt,
        List<Career> career,
        String coverLetter,
        List<Question> questions,
        List<Photo> photos,
        List<Video> videos,
        Review review,
        Map<Integer, Review> reviewHistory,
        List<String> mismatchReasons
) {

    public ScreeningApplicantResult {
        links = List.copyOf(links);
        career = List.copyOf(career);
        questions = List.copyOf(questions);
        photos = List.copyOf(photos);
        videos = List.copyOf(videos);
        reviewHistory = Collections.unmodifiableMap(new LinkedHashMap<>(reviewHistory));
        mismatchReasons = List.copyOf(mismatchReasons);
    }

    static ScreeningApplicantResult from(
            Submission submission,
            long roleId,
            String fallbackRoleName,
            AuditionScreening screening,
            ScreeningRound round,
            AuditionRoleCondition condition,
            Map<Long, String> photoUrls
    ) {
        ApplicantSnapshot applicant = submission.getApplicantSnapshot();
        SubmissionBasicInformation basic = applicant.getBasicInformation();
        SubmissionAdditionalInformation additional = applicant.getAdditionalInformation();
        SubmissionFormAnswers answers = submission.getFormAnswers();
        Integer age = applicant.getAgeAtRecruitmentDeadline();
        return new ScreeningApplicantResult(
                submission.getSubmissionId(), basic.name(), enumName(basic.gender()), age, basic.height(),
                basic.weight(), roleId, selectedRoleName(submission, roleId, fallbackRoleName), basic.birthDate(),
                basic.phone(), basic.email(), basic.address(),
                additional.educationLevel(), additional.school(), additional.major(), additional.links(),
                additional.nationality(), additional.specialty(), additional.hobbies(), enumName(additional.military()),
                submission.getSubmittedAt(),
                additional.careers().stream().map(career -> new Career(
                        career.year(), career.title(), career.roleName()
                )).toList(),
                additional.coverLetter(),
                answers.questionAnswers().values().stream()
                        .map(answer -> new Question(answer.question(), answer.answer()))
                        .toList(),
                answers.photoRequirementAnswers().values().stream()
                        .map(answer -> new Photo(answer.requirementDescription(), photoUrl(photoUrls, answer.fileId())))
                        .toList(),
                answers.videoRequirementAnswers().values().stream()
                        .map(answer -> new Video(answer.requirementDescription(), answer.url()))
                        .toList(),
                review(screening.reviewOf(submission.getSubmissionId(), round).orElse(null)),
                reviewHistory(submission.getSubmissionId(), screening),
                mismatchReasons(enumName(basic.gender()), age, condition)
        );
    }

    private static Map<Integer, Review> reviewHistory(UUID submissionId, AuditionScreening screening) {
        Map<Integer, Review> history = new LinkedHashMap<>();
        for (int value = 1; value <= screening.roundCount(); value++) {
            ScreeningRound round = new ScreeningRound(value);
            history.put(
                    value,
                    screening.isEligible(submissionId, round)
                            ? review(screening.reviewOf(submissionId, round).orElse(null))
                            : null
            );
        }
        return history;
    }

    private static Review review(ScreeningReview review) {
        if (review == null) {
            return new Review(ScreeningReviewStatus.PENDING.name(), "", "");
        }
        return new Review(review.getStatus().name(), review.getOtherReason(), review.getInternalMemo());
    }

    private static List<String> mismatchReasons(String gender, Integer age, AuditionRoleCondition condition) {
        List<String> reasons = new java.util.ArrayList<>(2);
        if (gender != null && condition.getGender() != RoleGender.ANY && !condition.getGender().name().equals(gender)) {
            reasons.add("GENDER");
        }
        if (age != null && (age < condition.getMinimumAge() || age > condition.getMaximumAge())) {
            reasons.add("AGE");
        }
        return List.copyOf(reasons);
    }

    private static String selectedRoleName(Submission submission, long roleId, String fallbackRoleName) {
        return submission.getSelectedRoles().values().stream()
                .filter(selectedRole -> selectedRole.auditionRoleId() == roleId)
                .map(SelectedRole::roleName)
                .findFirst()
                .orElse(fallbackRoleName);
    }

    private static String photoUrl(Map<Long, String> photoUrls, long fileId) {
        String url = photoUrls.get(fileId);
        if (url == null) {
            throw new IllegalStateException("제출 지원서 사진 URL을 만들 수 없습니다.");
        }
        return url;
    }

    private static String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }

    public record Career(int year, String title, String part) {
    }

    public record Question(String question, String answer) {
    }

    public record Photo(String label, String url) {
    }

    public record Video(String label, String url) {
    }

    public record Review(String status, String memo, String note) {
    }
}
