package art.yesulin.actor.application.profileimport;

import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import art.yesulin.pdfextraction.application.PdfApplicantProfile;
import art.yesulin.pdfextraction.application.PdfExtractionResult;
import java.time.Instant;
import java.util.List;

/**
 * PDF로 프로필 채우기 한 건. 제안은 원문 문자열 그대로이며 날짜·단위를 바꾸거나 추정하지 않는다. 어떤 값을 입력란에 넣을지는
 * 배우가 고르고, 저장은 기존 프로필 저장으로 한다.
 *
 * @param status {@code UPLOADING}, {@code UPLOAD_EXPIRED}, {@code QUEUED}, {@code DELAYED}, {@code COMPLETED},
 *               {@code PARTIAL}, {@code FAILED}
 * @param deletesAt 원본·추출 결과를 지우는 시각. 결과가 나온 뒤 24시간, 결과가 없으면 올린 뒤 24시간이다.
 * @param analysisStatus 이름·프로필 정리 결과({@code COMPLETED}, {@code FAILED}, {@code SKIPPED}). 결과 전이면 null이다.
 * @param analysisReason 정리하지 못한 이유. 정리했거나 결과 전이면 빈 값 또는 null이다.
 * @param proposals 결과가 나왔을 때만 있다.
 */
public record ProfileImportResult(
        String jobId,
        String status,
        String originalFilename,
        Instant createdAt,
        Instant deletesAt,
        String analysisStatus,
        String analysisReason,
        Proposals proposals
) {

    static ProfileImportResult of(
            String jobId, String status, String filename, Instant createdAt, Instant deletesAt,
            PdfExtractionResult result
    ) {
        if (result == null) {
            return new ProfileImportResult(jobId, status, filename, createdAt, deletesAt, null, null, null);
        }
        PdfApplicantInfo info = result.applicantInfo();
        return new ProfileImportResult(
                jobId, status, filename, createdAt, deletesAt,
                info == null ? null : info.status(), info == null ? null : info.reason(), Proposals.of(result)
        );
    }

    /** 사진은 워커가 사진일 가능성이 높다고 분류한 후보만 담는다. */
    public record Proposals(
            Fact name,
            Fact birthDate,
            Fact age,
            Fact height,
            Fact education,
            List<Career> careers,
            List<Photo> photos
    ) {

        public Proposals {
            careers = List.copyOf(careers);
            photos = List.copyOf(photos);
        }

        static Proposals of(PdfExtractionResult result) {
            PdfApplicantInfo info = result.applicantInfo();
            PdfApplicantProfile profile = info == null ? null : info.profile();
            List<Photo> photos = result.pages().stream()
                    .flatMap(page -> page.images().stream())
                    .filter(image -> PdfExtractionResult.CANDIDATE.equals(image.classification()))
                    .map(image -> new Photo(image.fileKey(), image.url()))
                    .toList();
            if (profile == null) {
                Fact name = info == null ? null : Fact.of(info.applicantName(), info.applicantNameEvidence());
                return new Proposals(name, null, null, null, null, List.of(), photos);
            }
            return new Proposals(
                    Fact.of(info.applicantName(), info.applicantNameEvidence()), Fact.of(profile.birthDate()),
                    Fact.of(profile.age()), Fact.of(profile.height()), Fact.of(profile.education()),
                    profile.careers().stream().map(Career::of).toList(), photos
            );
        }
    }

    /** 원문에서 읽은 값과 그 근거 구절. */
    public record Fact(String value, String evidence) {

        static Fact of(String value, String evidence) {
            return value == null ? null : new Fact(value, evidence);
        }

        static Fact of(PdfApplicantProfile.Fact fact) {
            return fact == null ? null : of(fact.value(), fact.evidence());
        }
    }

    /** 경력 한 줄. 장르·기간은 원문 그대로라 화면이 정해진 장르·연도와 정확히 맞을 때만 채운다. */
    public record Career(
            String title,
            String part,
            String genre,
            String period,
            String venue,
            String company,
            String evidence
    ) {

        static Career of(PdfApplicantProfile.Career career) {
            return new Career(career.title(), career.part(), career.genre(), career.period(), career.venue(),
                    career.company(), career.evidence());
        }
    }

    /**
     * 보관함에 넣을 수 있는 사진 후보.
     *
     * @param url 잠시 동안만 쓸 수 있는 비공개 주소다.
     */
    public record Photo(String fileKey, String url) {
    }
}
