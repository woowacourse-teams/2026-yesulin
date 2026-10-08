package art.yesulin.dormant.application.submission;

import static art.yesulin.file.domain.FileErrorCode.NOT_FOUND;
import static art.yesulin.file.domain.FileErrorCode.UNSUPPORTED_CONTENT_TYPE;

import art.yesulin.dormant.domain.submission.PhotoRequirementAnswers;
import art.yesulin.file.domain.FileAsset;
import art.yesulin.file.domain.FileAssetRepository;
import art.yesulin.file.domain.FileType;
import art.yesulin.global.exception.BusinessException;
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

        List<FileAsset> files = fileAssetRepository.findAllByIdInAndOwnerIdForUpdate(fileIds, applicantId);
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
