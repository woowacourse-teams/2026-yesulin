package art.yesulin.application.submission;

import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SubmissionPosterReferenceWriter {

    static final String FILE_REFERENCE_TYPE = "SUBMISSION_POSTER";

    private final FileReferenceRepository fileReferenceRepository;

    void save(long submissionInternalId, long posterFileId) {
        fileReferenceRepository.saveAndFlush(new FileReference(
                FILE_REFERENCE_TYPE, submissionInternalId, posterFileId
        ));
    }
}
