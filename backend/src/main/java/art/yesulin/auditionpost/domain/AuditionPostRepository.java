package art.yesulin.auditionpost.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    /** 동시 조회에도 빠짐없이 세도록 DB에서 1을 더한다. 공개 공고가 아니면 0을 돌려준다. */
    @Modifying(clearAutomatically = true)
    @Query("update AuditionPost p set p.viewCount = p.viewCount + 1 where p.id = :id and p.status = :status")
    int increaseViewCount(@Param("id") long id, @Param("status") AuditionPostStatus status);

    /** 원문 이동 수도 같은 방식으로 DB에서 1을 더한다. 상태가 다르면 0을 돌려준다. */
    @Modifying(clearAutomatically = true)
    @Query("update AuditionPost p set p.redirectCount = p.redirectCount + 1 where p.id = :id and p.status = :status")
    int increaseRedirectCount(@Param("id") long id, @Param("status") AuditionPostStatus status);
}
