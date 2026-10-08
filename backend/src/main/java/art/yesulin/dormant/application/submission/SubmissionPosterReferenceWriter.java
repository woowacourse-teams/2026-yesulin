package art.yesulin.dormant.application.submission;

import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
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
