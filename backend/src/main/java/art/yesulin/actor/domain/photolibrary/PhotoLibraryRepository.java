package art.yesulin.actor.domain.photolibrary;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhotoLibraryRepository extends JpaRepository<PhotoLibrary, Long> {

    Optional<PhotoLibrary> findByOwnerId(long ownerId);

    /** 배우 목록 카드의 대표 사진을 고르려고 여러 배우의 사진을 한 번에 읽는다. */
    @Query("select distinct photoLibrary from PhotoLibrary photoLibrary left join fetch photoLibrary.items.values"
            + " where photoLibrary.ownerId in :ownerIds")
    List<PhotoLibrary> findAllWithPhotosByOwnerIdIn(@Param("ownerIds") Collection<Long> ownerIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select photoLibrary from PhotoLibrary photoLibrary where photoLibrary.ownerId = :ownerId")
    Optional<PhotoLibrary> findByOwnerIdForUpdate(@Param("ownerId") long ownerId);
}
