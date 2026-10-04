package art.yesulin.domain.auditionpost;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditionPostRepository extends JpaRepository<AuditionPost, Long> {

    String OPEN_CONDITION = "p.status = :status and (p.content.deadline is null or p.content.deadline >= :today)";

    Optional<AuditionPost> findBySourceAndExternalId(String source, String externalId);

    /** 원문 작성 시각이 최신인 순서. 작성 시각을 읽지 못한 공고는 MySQL 정렬 규칙상 뒤로 간다. */
    Page<AuditionPost> findAllByStatusOrderByContentSourcePostedAtDescIdDesc(
            AuditionPostStatus status,
            Pageable pageable
    );

    /** 모집 중인 공고만. 날짜가 아닌 마감(상시 등)은 모집 중으로 본다. */
    @Query(
            value = "select p from AuditionPost p where " + OPEN_CONDITION
                    + " order by p.content.sourcePostedAt desc, p.id desc",
            countQuery = "select count(p) from AuditionPost p where " + OPEN_CONDITION
    )
    Page<AuditionPost> findOpen(
            @Param("status") AuditionPostStatus status,
            @Param("today") LocalDate today,
            Pageable pageable
    );

    long countByStatus(AuditionPostStatus status);

    @Query("select count(p) from AuditionPost p where " + OPEN_CONDITION)
    long countOpen(@Param("status") AuditionPostStatus status, @Param("today") LocalDate today);

    List<AuditionPost> findAllByOrderByIdDesc(Pageable pageable);
}
