package art.yesulin.auditionpost.domain;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditionPostRepository extends JpaRepository<AuditionPost, Long> {

    String CATEGORY_CONDITION = "(:category is null or p.content.category = :category)";

    Optional<AuditionPost> findBySourceAndExternalId(String source, String externalId);

    /**
     * 공고 내용·파일을 바꾸는 작업(수정, 다시 가져오기)을 한 번에 하나씩 처리하도록 잠근다. 먼저 끝난 작업이 뺀 파일을 지우므로,
     * 나중 작업은 그 결과를 보고 판단해야 한다. 이어지는 파일 조회도 최신 상태를 보도록 트랜잭션의 첫 조회로 부른다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from AuditionPost p where p.id = :id")
    Optional<AuditionPost> findByIdForUpdate(@Param("id") long id);

    /** {@link #findByIdForUpdate(long)}와 같은 잠금을 원문 번호로 건다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from AuditionPost p where p.source = :source and p.externalId = :externalId")
    Optional<AuditionPost> findBySourceAndExternalIdForUpdate(
            @Param("source") String source,
            @Param("externalId") String externalId
    );

    /** 분야와 마감 조건을 먼저 적용한 뒤 원문 작성 최신순으로 페이지를 나눈다. */
    @Query(
            value = "select p from AuditionPost p where p.status = :status and " + CATEGORY_CONDITION
                    + " and (:includeClosed = true or p.content.deadline is null or p.content.deadline >= :today)"
                    + " order by p.content.sourcePostedAt desc, p.id desc"
    )
    List<AuditionPost> findPublished(
            @Param("status") AuditionPostStatus status,
            @Param("today") LocalDate today,
            @Param("includeClosed") boolean includeClosed,
            @Param("category") String category,
            Pageable pageable
    );

    default AuditionPostCounts countPublishedPosts(AuditionPostStatus status, LocalDate today, String category) {
        PublishedPostCounts counts = countPublishedPostValues(status.name(), today, category);
        return new AuditionPostCounts(counts.getAllCount().longValue(), counts.getOpenCount().longValue());
    }

    /** COUNT는 deadline까지 인덱스에서 읽고, 목록 정렬용 인덱스는 목록 쿼리에 맡긴다. */
    @Query(value = """
            select /*+ INDEX(p idx_audition_posts_status_category_deadline) */
                   count(p.id) as allCount,
                   coalesce(sum(case when p.deadline is null or p.deadline >= :today then 1 else 0 end), 0)
                       as openCount
            from audition_posts p
            where p.status = :status and (:category is null or p.category = :category)
            """, nativeQuery = true)
    PublishedPostCounts countPublishedPostValues(
            @Param("status") String status,
            @Param("today") LocalDate today,
            @Param("category") String category
    );

    interface PublishedPostCounts {

        Number getAllCount();

        Number getOpenCount();
    }

    List<AuditionPost> findAllByOrderByIdDesc(Pageable pageable);

    List<AuditionPost> findAllByOwnerIdOrderByIdDesc(long ownerId, Pageable pageable);

    Optional<AuditionPost> findFirstBySourceAndSourceAuthorIdOrderByIdDesc(String source, String sourceAuthorId);

    /** 원문 작성자 번호를 아직 읽지 않은 원문 공고를 최근 순서로. {@code beforeId}보다 작은 ID만 본다. */
    @Query("select p from AuditionPost p where p.source = :source and p.externalId is not null"
            + " and p.sourceAuthorId is null and p.id < :beforeId order by p.id desc")
    List<AuditionPost> findMissingSourceAuthor(
            @Param("source") String source,
            @Param("beforeId") long beforeId,
            Pageable pageable
    );

    long countBySourceAndExternalIdIsNotNullAndSourceAuthorIdIsNull(String source);

    /**
     * 같은 원문 작성자의 공고 중 아직 기획사에 연결되지 않은 공고를 연결한다. 이미 연결된 공고와 다른 칸은 건드리지 않으므로
     * 고치는 중인 공고와 겹쳐도 그 공고의 수정 내용을 덮어쓰지 않는다.
     */
    @Modifying(clearAutomatically = true)
    @Query("update AuditionPost p set p.ownerId = :ownerId"
            + " where p.source = :source and p.sourceAuthorId = :authorId and p.ownerId is null")
    int connectUnownedBySourceAuthor(
            @Param("source") String source,
            @Param("authorId") String authorId,
            @Param("ownerId") long ownerId
    );

    /** 나중에 읽은 원문 작성자 번호를 채운다. 그 사이 다른 작업이 채웠으면 0을 돌려준다. */
    @Modifying(clearAutomatically = true)
    @Query("update AuditionPost p set p.sourceAuthorId = :authorId where p.id = :id and p.sourceAuthorId is null")
    int fillSourceAuthor(@Param("id") long id, @Param("authorId") String authorId);

    /** 기획사별·공개 상태별 공고 수와 최근 등록 시각. */
    @Query("select new art.yesulin.auditionpost.domain.AuditionPostOwnerCount("
            + "p.ownerId, p.status, count(p), max(p.createdAt))"
            + " from AuditionPost p where p.ownerId is not null group by p.ownerId, p.status")
    List<AuditionPostOwnerCount> countByOwner();

    /** 기획사에 연결되지 않은 원문 공고를 원문 작성자 번호·닉네임별로 센다. 번호가 없는 공고는 닉네임으로만 묶인다. */
    @Query("select new art.yesulin.auditionpost.domain.AuditionPostAuthorCount("
            + "p.source, p.sourceAuthorId, p.content.authorName, count(p), max(p.createdAt))"
            + " from AuditionPost p where p.ownerId is null and p.externalId is not null"
            + " group by p.source, p.sourceAuthorId, p.content.authorName")
    List<AuditionPostAuthorCount> countUnownedBySourceAuthor();

    /** 동시 조회에도 빠짐없이 세도록 DB에서 1을 더한다. 공개 공고가 아니면 0을 돌려준다. */
    @Modifying(clearAutomatically = true)
    @Query("update AuditionPost p set p.viewCount = p.viewCount + 1 where p.id = :id and p.status = :status")
    int increaseViewCount(@Param("id") long id, @Param("status") AuditionPostStatus status);

    /** 원문 이동 수도 같은 방식으로 DB에서 1을 더한다. 공개 중이면 원문으로 보내지 않으므로 0을 돌려준다. */
    @Modifying(clearAutomatically = true)
    @Query("update AuditionPost p set p.redirectCount = p.redirectCount + 1"
            + " where p.id = :id and p.status <> :published")
    int increaseRedirectCountUnlessPublished(@Param("id") long id, @Param("published") AuditionPostStatus published);
}
