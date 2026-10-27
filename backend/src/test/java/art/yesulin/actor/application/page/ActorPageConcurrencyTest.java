package art.yesulin.actor.application.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageErrorCode;
import art.yesulin.actor.domain.page.ActorPagePhotoVisibility;
import art.yesulin.actor.domain.page.ActorPageStatus;
import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryRepository;
import art.yesulin.actor.domain.profile.ApplicantProfile;
import art.yesulin.actor.domain.profile.ApplicantProfileRepository;
import art.yesulin.actor.domain.profile.ProfileBasicInformation;
import art.yesulin.actor.domain.profile.ProfileGender;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.LocalDate;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:actor-page-concurrency;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class ActorPageConcurrencyTest {

    private static final long OWNER = 9_101L;

    @Autowired
    private ActorPageService pages;
    @Autowired
    private ApplicantProfileRepository profiles;
    @Autowired
    private PhotoLibraryRepository photos;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void publicationWaitsForProfileWriteAndUsesCommittedRequiredFields() throws Exception {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            ApplicantProfile profile = new ApplicantProfile(OWNER);
            profile.replaceBasicInformation(new ProfileBasicInformation(
                    "배우", null, null, LocalDate.of(2000, 1, 1), ProfileGender.FEMALE,
                    null, null, null, LocalDate.of(2026, 10, 27)
            ));
            profiles.saveAndFlush(profile);
            PhotoLibrary library = new PhotoLibrary(OWNER);
            library.addPhoto(1L);
            photos.saveAndFlush(library);
            library.changeVisibility(library.getPhotos().getFirst().getId(), ActorPagePhotoVisibility.PUBLIC);
            pages.changeHandle(OWNER, "concurrent_actor");
        });
        CountDownLatch changed = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> modification = executor.submit(() -> transaction.executeWithoutResult(status -> {
                ApplicantProfile profile = profiles.findByOwnerIdForUpdate(OWNER).orElseThrow();
                profile.replaceBasicInformation(ProfileBasicInformation.empty());
                profiles.flush();
                changed.countDown();
                await(release);
            }));
            try {
                assertTrue(changed.await(10, TimeUnit.SECONDS));
                Future<ActorPageErrorCode> publication = executor.submit(() -> {
                    BusinessException failure = assertThrows(BusinessException.class,
                            () -> pages.publish(OWNER, true, ActorPage.CONSENT_VERSION));
                    return (ActorPageErrorCode) failure.getErrorCode();
                });
                assertThrows(TimeoutException.class, () -> publication.get(200, TimeUnit.MILLISECONDS));
                release.countDown();
                modification.get(10, TimeUnit.SECONDS);
                assertEquals(ActorPageErrorCode.ACTOR_PAGE_NOT_READY, publication.get(10, TimeUnit.SECONDS));
                assertEquals(ActorPageStatus.PRIVATE, pages.find(OWNER).status());
            } finally {
                release.countDown();
            }
        }
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("동시성 검증 대기 시간이 초과되었습니다.");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
