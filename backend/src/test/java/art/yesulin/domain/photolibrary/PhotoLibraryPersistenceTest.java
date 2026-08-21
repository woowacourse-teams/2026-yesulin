package art.yesulin.domain.photolibrary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:photo-library;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class PhotoLibraryPersistenceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private PhotoLibraryRepository photoLibraryRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persistsOrderChangesAndSoftDeletion() {
        PhotoLibrary library = new PhotoLibrary(OWNER_ID);
        library.addPhoto(createFile("first.jpg"));
        library.addPhoto(createFile("second.jpg"));
        library.addPhoto(createFile("third.jpg"));
        photoLibraryRepository.saveAndFlush(library);

        List<PhotoLibraryItem> created = library.getPhotos();
        long firstPhotoId = created.getFirst().getId();
        long thirdPhotoId = created.getLast().getId();
        library.movePhotoToFront(thirdPhotoId);
        library.deletePhoto(firstPhotoId, Instant.parse("2026-08-21T08:00:00Z"));
        photoLibraryRepository.flush();
        entityManager.clear();

        PhotoLibrary found = photoLibraryRepository.findByOwnerId(OWNER_ID).orElseThrow();
        List<PhotoLibraryItem> activePhotos = found.getPhotos();
        assertEquals(2, activePhotos.size());
        assertEquals(thirdPhotoId, activePhotos.getFirst().getId());
        assertTrue(activePhotos.getFirst().isRepresentative());
        assertFalse(activePhotos.getLast().isRepresentative());
        assertEquals(1, activePhotos.getLast().getDisplayOrder());
    }

    private long createFile(String filename) {
        FileMetadata metadata = new FileMetadata(filename, "image/jpeg", 1_024L);
        FileAsset file = new FileAsset("files/20260821/" + filename, OWNER_ID, metadata);
        return fileAssetRepository.saveAndFlush(file).getId();
    }
}
