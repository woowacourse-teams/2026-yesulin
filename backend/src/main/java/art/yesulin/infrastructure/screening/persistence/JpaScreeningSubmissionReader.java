package art.yesulin.infrastructure.screening.persistence;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.application.screening.ScreeningSubmissionReader;
import art.yesulin.application.screening.ScreeningSubmissionView;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class JpaScreeningSubmissionReader implements ScreeningSubmissionReader {

    private final ScreeningSubmissionJpaRepository submissionRepository;
    private final FileAssetRepository fileAssetRepository;
    private final ObjectStorage objectStorage;

    @Override
    public List<ScreeningSubmissionView> findAll(long auditionId, long roleId) {
        List<ScreeningSubmissionEntity> submissions = submissionRepository.findAll(auditionId, roleId);
        Map<Long, FileAsset> files = findFiles(submissions);
        return submissions.stream().map(submission -> toView(submission, files)).toList();
    }

    private Map<Long, FileAsset> findFiles(List<ScreeningSubmissionEntity> submissions) {
        List<Long> fileIds = submissions.stream()
                .flatMap(submission -> submission.getPhotos().stream())
                .map(ScreeningSubmissionPhotoEntity::getFileId)
                .distinct()
                .toList();
        return fileAssetRepository.findAllById(fileIds).stream()
                .collect(Collectors.toMap(FileAsset::getId, Function.identity()));
    }

    private ScreeningSubmissionView toView(ScreeningSubmissionEntity submission, Map<Long, FileAsset> files) {
        return new ScreeningSubmissionView(
                submission.getPublicId(),
                submission.getName(),
                submission.getGender(),
                submission.getBirthDate(),
                submission.getHeight(),
                submission.getWeight(),
                submission.getPhone(),
                submission.getEmail(),
                submission.getSchool(),
                submission.getSubmittedAt(),
                submission.getCareer().stream()
                        .map(career -> new ScreeningSubmissionView.Career(
                                career.getYear(), career.getTitle(), career.getPart()
                        ))
                        .toList(),
                submission.getCoverLetter(),
                submission.getMotivation(),
                submission.getPhotos().stream()
                        .map(photo -> new ScreeningSubmissionView.Photo(photo.getLabel(), fileUrl(files, photo)))
                        .toList(),
                submission.getVideos().stream()
                        .map(video -> new ScreeningSubmissionView.Video(video.getLabel(), video.getUrl()))
                        .toList()
        );
    }

    private String fileUrl(Map<Long, FileAsset> files, ScreeningSubmissionPhotoEntity photo) {
        FileAsset fileAsset = Optional.ofNullable(files.get(photo.getFileId()))
                .orElseThrow(() -> new IllegalStateException("지원서 사진 파일을 찾을 수 없습니다."));
        fileAsset.ensureUsable();
        return objectStorage.createDownloadUrl(fileAsset.getObjectKey());
    }
}
