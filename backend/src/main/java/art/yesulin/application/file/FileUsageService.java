package art.yesulin.application.file;

import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FileUsageService {

    private final FileAssetRepository fileAssetRepository;
    private final Clock clock;

    @Transactional(propagation = Propagation.MANDATORY)
    public void markReferencesRemoved(Collection<Long> fileIds) {
        Instant at = clock.instant();
        for (FileAsset file : fileAssetRepository.findAllById(fileIds)) {
            if (file.getStatus() == FileStatus.READY) {
                file.markUnreferenced(at);
            }
        }
    }
}
