package art.yesulin.dormant.application.submission;

import art.yesulin.file.domain.FileAssetRepository;
import art.yesulin.file.domain.FileReference;
import art.yesulin.file.domain.FileReferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SubmissionPosterReferenceWriter {

    static final String FILE_REFERENCE_TYPE = "SUBMISSION_POSTER";

    private final FileReferenceRepository fileReferenceRepository;
    private final FileAssetRepository fileAssetRepository;

    void save(long submissionInternalId, long posterFileId) {
        fileAssetRepository.findByIdForUpdate(posterFileId).orElseThrow().ensureUsable();
        fileReferenceRepository.saveAndFlush(new FileReference(
                FILE_REFERENCE_TYPE, submissionInternalId, posterFileId
        ));
    }
}
