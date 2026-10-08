package art.yesulin.dormant.application.submission;

import art.yesulin.dormant.domain.submission.PhotoRequirementAnswers;
import art.yesulin.file.domain.FileReference;
import art.yesulin.file.domain.FileReferenceRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SubmissionPhotoReferenceWriter {

    static final String FILE_REFERENCE_TYPE = "SUBMISSION_PHOTO";

    private final FileReferenceRepository fileReferenceRepository;

    void save(long submissionInternalId, PhotoRequirementAnswers answers) {
        List<FileReference> references = answers.values().stream()
                .map(answer -> answer.fileId())
                .distinct()
                .map(fileId -> new FileReference(FILE_REFERENCE_TYPE, submissionInternalId, fileId))
                .toList();
        fileReferenceRepository.saveAllAndFlush(references);
    }
}
