package art.yesulin.application.submission;

import static art.yesulin.domain.file.FileErrorCode.NOT_FOUND;
import static art.yesulin.domain.file.FileErrorCode.UNSUPPORTED_CONTENT_TYPE;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileType;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SubmissionPhotoFileValidator {

    private final FileAssetRepository fileAssetRepository;

    void validate(long applicantId, PhotoRequirementAnswers answers) {
        Set<Long> fileIds = answers.values().stream()
                .map(answer -> answer.fileId())
                .collect(Collectors.toSet());
        if (fileIds.isEmpty()) {
            return;
        }

        List<FileAsset> files = fileAssetRepository.findAllByIdInAndOwnerId(fileIds, applicantId);
        Set<Long> foundFileIds = files.stream().map(FileAsset::getId).collect(Collectors.toSet());
        if (!foundFileIds.equals(fileIds)) {
            throw new BusinessException(NOT_FOUND, "제출할 사진 파일을 찾을 수 없습니다.");
        }
        files.forEach(this::validateFile);
    }

    private void validateFile(FileAsset file) {
        file.ensureUsable();
        if (file.getMetadata().getType() != FileType.IMAGE) {
            throw new BusinessException(UNSUPPORTED_CONTENT_TYPE, "이미지 파일만 지원서 사진으로 제출할 수 있습니다.");
        }
    }
}
