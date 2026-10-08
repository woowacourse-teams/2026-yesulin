package art.yesulin.support;

import art.yesulin.file.domain.FileAsset;
import art.yesulin.file.domain.FileAssetRepository;
import art.yesulin.file.domain.FileMetadata;
import art.yesulin.file.domain.FileReferenceRepository;
import art.yesulin.show.domain.Show;
import art.yesulin.show.domain.ShowGenre;
import art.yesulin.show.domain.ShowRepository;
import art.yesulin.show.domain.ShowSession;
import art.yesulin.show.domain.ShowSessionRepository;
import art.yesulin.show.domain.performance.PerformanceVenue;
import art.yesulin.show.domain.reservation.ReservationRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** 무료 공연 테스트가 공통으로 쓰는 업로드 완료 파일, 공연, 회차 준비와 정리. */
public class ShowTestFixture {

    public static final Instant NOW = Instant.parse("2026-09-27T00:00:00Z");
    public static final Instant STARTS_AT = Instant.parse("2026-10-01T10:00:00Z");

    private final ShowRepository showRepository;
    private final ShowSessionRepository sessionRepository;
    private final ReservationRepository reservationRepository;
    private final FileAssetRepository fileAssetRepository;
    private final FileReferenceRepository fileReferenceRepository;

    public ShowTestFixture(
            ShowRepository showRepository,
            ShowSessionRepository sessionRepository,
            ReservationRepository reservationRepository,
            FileAssetRepository fileAssetRepository,
            FileReferenceRepository fileReferenceRepository
    ) {
        this.showRepository = showRepository;
        this.sessionRepository = sessionRepository;
        this.reservationRepository = reservationRepository;
        this.fileAssetRepository = fileAssetRepository;
        this.fileReferenceRepository = fileReferenceRepository;
    }

    public void cleanUp() {
        reservationRepository.deleteAll();
        sessionRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        showRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    public long readyImage(long ownerId) {
        FileAsset asset = new FileAsset(
                "public/files/20260927/" + UUID.randomUUID(), ownerId, new FileMetadata("poster.png", "image/png", 100)
        );
        asset.completeUpload("image/png", 100, java.time.Instant.now());
        return fileAssetRepository.save(asset).getId();
    }

    public Show show(long ownerId) {
        return showRepository.save(new Show(
                ownerId, "햄릿", ShowGenre.PLAY, "무료 공연입니다.", venue(), 120, "8세 이상", "02-123-4567",
                readyImage(ownerId), List.of()
        ));
    }

    public Show openShow(long ownerId, int capacity) {
        Show show = show(ownerId);
        ShowSession session = session(show, capacity);
        show.open(NOW, List.of(session));
        return showRepository.save(show);
    }

    public ShowSession session(Show show, int capacity) {
        return sessionRepository.save(new ShowSession(show.getId(), STARTS_AT, capacity));
    }

    public ShowSession firstSession(Show show) {
        return sessionRepository.findAllByShowIdOrderByStartsAtAscIdAsc(show.getId()).getFirst();
    }

    public static PerformanceVenue venue() {
        return new PerformanceVenue("예술인 소극장", "서울특별시 종로구 대학로 12", "", "", null, null);
    }
}
