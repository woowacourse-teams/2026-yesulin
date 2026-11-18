package art.yesulin.file.application.thumbnail;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.file.domain.thumbnail.PosterThumbnailRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:poster-thumbnails;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class PosterThumbnailWorkerTest {

    @Autowired
    private PosterThumbnails thumbnails;

    @Autowired
    private PosterThumbnailWorker worker;

    @Autowired
    private PosterThumbnailRepository jobs;

    @Autowired
    private FakeObjectStorage storage;

    @Autowired
    private PlatformTransactionManager transactions;

    @BeforeEach
    void clearJobs() {
        jobs.deleteAll();
    }

    @Test
    void switchesToReadyThumbnailOnlyAfterStorageAndSkipsRepeatedJobs() throws IOException {
        String key = "public/files/20261117/" + UUID.randomUUID();
        byte[] original = originalImage();
        store(key, original);
        thumbnails.enqueue(key);
        thumbnails.enqueue(key);
        assertEquals(1, jobs.count());
        assertEquals(storage.toPublicUrl(key), cardUrl(key));

        worker.runNext();
        thumbnails.enqueue(key);

        String thumbnail = PosterThumbnails.thumbnailKey(key);
        byte[] bytes = storage.read(thumbnail).orElseThrow().bytes();
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
        assertEquals(640, image.getWidth());
        assertEquals(960, image.getHeight());
        assertTrue(bytes.length < original.length);
        assertEquals("READY", thumbnails.stateOf(key));
        assertEquals(storage.toPublicUrl(thumbnail), cardUrl(key));
        assertTrue(storage.contains(key));
    }

    @Test
    void retiresReadyImageAndIgnoresStaleEnqueueAfterRemoval() throws IOException {
        String key = "public/audition-posts/20261117/" + UUID.randomUUID();
        store(key, originalImage());
        thumbnails.enqueue(key);
        worker.runNext();

        thumbnails.retire(key);
        assertEquals(storage.toPublicUrl(key), cardUrl(key));
        worker.runNext();
        thumbnails.enqueue(key);

        assertEquals("REMOVED", thumbnails.stateOf(key));
        assertFalse(storage.contains(PosterThumbnails.thumbnailKey(key)));
    }

    @Test
    void doesNotGenerateWhenFirstEnqueueArrivesAfterDeletionStarted() throws IOException {
        String key = "public/audition-posts/20261117/" + UUID.randomUUID();
        store(key, originalImage());
        thumbnails.retire(key);
        thumbnails.enqueue(key);

        worker.runNext();

        assertEquals("REMOVED", thumbnails.stateOf(key));
        assertFalse(storage.contains(PosterThumbnails.thumbnailKey(key)));
    }

    @Test
    void rollsBackEnqueueWithOriginalWriteAndSkipsMissingOriginal() {
        String key = "public/files/20261117/" + UUID.randomUUID();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            thumbnails.enqueue(key);
            status.setRollbackOnly();
        });
        assertEquals("UNQUEUED", thumbnails.stateOf(key));

        thumbnails.enqueue(key);
        worker.runNext();

        assertEquals("SKIPPED", thumbnails.stateOf(key));
        assertEquals(storage.toPublicUrl(key), cardUrl(key));
    }

    @Test
    void keepsCardWidthForLongAuditionImage() throws IOException {
        String key = "public/audition-posts/20261117/" + UUID.randomUUID();
        store(key, originalImage(900, 5400));
        thumbnails.enqueue(key);

        worker.runNext();

        byte[] thumbnail = storage.read(PosterThumbnails.thumbnailKey(key)).orElseThrow().bytes();
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(thumbnail));
        assertEquals(640, image.getWidth());
        assertEquals(1280, image.getHeight());
        Color bottom = new Color(image.getRGB(320, 1250));
        assertTrue(bottom.getRed() > bottom.getBlue());
    }

    @Test
    void retriesConversionFailureAndAllowsExplicitReplay() {
        String key = "public/files/20261117/" + UUID.randomUUID();
        store(key, new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
        thumbnails.enqueue(key);

        for (int attempt = 1; attempt <= 3; attempt++) {
            worker.runNext();
            jobs.changeState(key, "PENDING", "PENDING", attempt, Instant.EPOCH);
        }

        assertEquals("FAILED", thumbnails.stateOf(key));
        assertEquals(storage.toPublicUrl(key), cardUrl(key));
        thumbnails.retryFailed(key);
        assertEquals("PENDING", thumbnails.stateOf(key));
        assertEquals(0, jobs.findById(key).orElseThrow().getAttempts());
    }

    private String cardUrl(String key) {
        return thumbnails.publicUrls(List.of(key)).apply(key);
    }

    private void store(String key, byte[] content) {
        storage.put(key, new ObjectUpload("image/png", null, content.length, new ByteArrayInputStream(content)));
    }

    private byte[] originalImage() throws IOException {
        return originalImage(1600, 2400);
    }

    private byte[] originalImage(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        var graphics = image.createGraphics();
        try {
            graphics.setPaint(new java.awt.GradientPaint(0, 0, Color.ORANGE, width, height, Color.BLUE));
            graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
        } finally {
            graphics.dispose();
        }
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "png", bytes);
        return bytes.toByteArray();
    }
}
