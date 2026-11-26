package art.yesulin.file.domain.thumbnail;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface PosterThumbnailRepository extends JpaRepository<PosterThumbnailJob, String> {

    @Transactional
    @Modifying
    @Query(value = """
            insert into poster_thumbnails (source_key, state, attempts, available_at)
            values (:key, 'PENDING', 0, :now)
            on duplicate key update source_key = source_key
            """, nativeQuery = true)
    void enqueue(@Param("key") String key, @Param("now") Instant now);

    @Transactional
    @Modifying
    @Query(value = """
            insert into poster_thumbnails (source_key, state, attempts, available_at)
            values (:key, 'REMOVED', 0, :now)
            on duplicate key update attempts = 0, available_at = :now,
                state = case when state = 'REMOVED' then 'REMOVED' else 'REMOVING' end
            """, nativeQuery = true)
    void retire(@Param("key") String key, @Param("now") Instant now);

    @Query("""
            select job.sourceKey from PosterThumbnailJob job
            where job.state = 'READY' and job.sourceKey in :keys
            """)
    List<String> readyKeys(@Param("keys") Collection<String> keys);

    Optional<PosterThumbnailJob> findFirstByStateInAndAvailableAtLessThanEqualOrderByAvailableAtAscSourceKeyAsc(
            Collection<String> states, Instant now
    );

    @Transactional
    @Modifying
    @Query("""
            update PosterThumbnailJob job set job.state = :state, job.attempts = :attempts,
                job.availableAt = :availableAt
            where job.sourceKey = :key and job.state = :previous
            """)
    void changeState(
            @Param("key") String key,
            @Param("previous") String previous,
            @Param("state") String state,
            @Param("attempts") int attempts,
            @Param("availableAt") Instant availableAt
    );

    @Query("select job.state from PosterThumbnailJob job where job.sourceKey = :key")
    Optional<String> stateOf(@Param("key") String key);
}
