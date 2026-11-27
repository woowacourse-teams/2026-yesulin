package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.DocumentPreviewTransfers.Operation.INPUT_VERIFY;
import static art.yesulin.pdfextraction.application.DocumentPreviewTransfers.Operation.INPUT_WRITE;
import static art.yesulin.pdfextraction.application.DocumentPreviewTransfers.Operation.PREVIEW_READ;
import static art.yesulin.pdfextraction.application.DocumentPreviewTransfers.Operation.PREVIEW_RECOVER;
import static art.yesulin.pdfextraction.application.DocumentPreviewTransfers.Operation.PREVIEW_WRITE;
import static art.yesulin.pdfextraction.application.DocumentPreviewTransfers.Operation.SOURCE;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF_EXTRACTION_RESULT;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_UPLOAD_NOT_READY;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.storage.S3PrivateObjects;
import art.yesulin.pdfextraction.application.DocumentPreviewTransferStorage.Transfer;
import art.yesulin.pdfextraction.application.DocumentPreviewTransfers.Operation;
import art.yesulin.pdfextraction.application.DocumentPreviewTransfers.Request;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.infrastructure.PdfExtractionStorageService;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ChecksumMode;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

class DocumentPreviewTransfersTest {

    private static final Instant NOW = PdfExtractionFixtures.NOW;
    private static final String SOURCE_SHA = "a".repeat(64);
    private static final String PDF_SHA = "b".repeat(64);
    private static final String ETAG = "0123456789abcdef0123456789abcdef";
    private final UUID reviewId = UUID.randomUUID();
    private final PdfExtractionJob job = new PdfExtractionJob(1, "sample.docx", 100, NOW, NOW.plusSeconds(600),
            reviewId.toString());
    private final UUID id = UUID.fromString(job.getId());
    private final String root = "yesulin/prod/private/pdf-extractions/";
    private final String original = root + "originals/" + reviewId + "/" + id + "/source.docx";
    private final String preview = root + "previews/" + reviewId + "/" + id + "/preview.pdf";
    private final String input = root + "inputs/" + reviewId + "/" + id + "/source.pdf";
    private final Map<String, HeadObjectResponse> files = new HashMap<>();
    private final PdfExtractionJobRepository jobs = mock(PdfExtractionJobRepository.class);
    private final S3Client s3 = mock(S3Client.class);
    private final S3Presigner signer = S3Presigner.builder().region(Region.AP_NORTHEAST_2)
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test"))).build();
    private final DocumentPreviewTransfers transfers = new DocumentPreviewTransfers(jobs,
            new PdfExtractionStorageService(new S3PrivateObjects(s3, signer, "test-preview-bucket", "yesulin/prod",
                    Duration.ofMinutes(10), Duration.ofHours(1))));

    DocumentPreviewTransfersTest() {
        job.identifySource(original);
        job.identifySourceSha256(SOURCE_SHA);
        when(jobs.findForUpdate(job.getId())).thenReturn(Optional.of(job));
        when(s3.headObject(any(HeadObjectRequest.class))).thenAnswer(call -> {
            HeadObjectRequest request = call.getArgument(0);
            assertEquals(ChecksumMode.ENABLED, request.checksumMode());
            if (!files.containsKey(request.key())) {
                throw S3Exception.builder().statusCode(404).build();
            }
            return files.get(request.key());
        });
        files.put(original, file(job.getFileMetadata().getContentType(), 100, SOURCE_SHA));
    }

    @AfterEach
    void closeSigner() {
        signer.close();
    }

    @Test
    void bindsSourceToStoredFingerprintAndConditionalGetForBothEventTagFormats() {
        for (String tag : new String[]{ETAG, "\"" + ETAG + "\""}) {
            Transfer grant = transfers.prepare(new Request(id, original, tag, SOURCE, null, null)).orElseThrow();
            assertEquals(100, grant.size());
            assertEquals(SOURCE_SHA, grant.sha256());
            assertEquals(Map.of("If-Match", "\"" + ETAG + "\""), grant.headers());
            assertSignature(grant, original, "if-match");
        }
    }

    @Test
    void refusesOtherJobKeyEvenWhenCallerKnowsTheTagAndChecksum() {
        assertEquals(INVALID_PDF_EXTRACTION_RESULT, assertThrows(BusinessException.class,
                () -> transfers.prepare(new Request(id, original.replace(reviewId.toString(),
                        UUID.randomUUID().toString()), ETAG, SOURCE, null, null))).getErrorCode());
        verifyNoInteractions(s3);
    }

    @Test
    void rejectsChangedTagSizeMimeOrChecksumWithoutGrant() {
        assertThrows(BusinessException.class,
                () -> transfers.prepare(new Request(id, original, "other", SOURCE, null, null)));
        for (HeadObjectResponse altered : new HeadObjectResponse[]{
                file(job.getFileMetadata().getContentType(), 101, SOURCE_SHA),
                file("application/pdf", 100, SOURCE_SHA), file(job.getFileMetadata().getContentType(), 100, PDF_SHA)}) {
            files.put(original, altered);
            assertThrows(BusinessException.class, () -> prepare(SOURCE, null, null));
        }
    }

    @Test
    void pendingPreviewIsImmutableAndOnlyConfirmedPreviewCanReachExtractor() {
        assertTrue(prepare(PREVIEW_READ, null, null).isEmpty());
        verify(s3, never()).headObject(HeadObjectRequest.builder().bucket("test-preview-bucket")
                .key(preview).checksumMode(ChecksumMode.ENABLED).build());
        assertThrows(BusinessException.class,
                () -> prepare(PREVIEW_WRITE, PdfExtractionJob.MAX_FILE_BYTES + 1, PDF_SHA));
        Transfer grant = prepare(PREVIEW_WRITE, 210L, PDF_SHA).orElseThrow();
        assertEquals(Map.of("Content-Type", "application/pdf", "If-None-Match", "*", "Content-Length", "210",
                "x-amz-checksum-sha256", checksum(PDF_SHA)), grant.headers());
        assertSignature(grant, preview, "content-length", "content-type", "if-none-match", "x-amz-checksum-sha256");
        files.put(preview, file("application/pdf", 210, PDF_SHA));
        // A simultaneous render can have different bytes. Its immutable PUT gets 412 and it reuses the winner.
        assertTrue(prepare(PREVIEW_WRITE, 200L, SOURCE_SHA).isPresent());
        assertTrue(prepare(PREVIEW_READ, null, null).isEmpty());
        assertEquals(PDF_SHA, prepare(PREVIEW_RECOVER, null, null).orElseThrow().sha256());
        assertThrows(BusinessException.class, () -> prepare(INPUT_WRITE, 210L, PDF_SHA));
    }

    @Test
    void collisionRecoveryRequiresAnExistingVerifiedPdfAndFailsClosedOnStorageError() {
        assertEquals(PDF_UPLOAD_NOT_READY,
                assertThrows(BusinessException.class, () -> prepare(PREVIEW_RECOVER, null, null)).getErrorCode());
        files.put(preview, file("application/octet-stream", 210, PDF_SHA));
        assertEquals(INVALID_PDF_EXTRACTION_RESULT,
                assertThrows(BusinessException.class, () -> prepare(PREVIEW_RECOVER, null, null)).getErrorCode());
        HeadObjectRequest head = HeadObjectRequest.builder().bucket("test-preview-bucket").key(preview)
                .checksumMode(ChecksumMode.ENABLED).build();
        org.mockito.Mockito.doThrow(S3Exception.builder().statusCode(403).build()).when(s3).headObject(head);
        assertTrue(prepare(PREVIEW_READ, null, null).isEmpty());
        assertThrows(S3Exception.class, () -> prepare(PREVIEW_RECOVER, null, null));
    }

    @Test
    void replayAfterExtractionRequiresSameApprovedPreviewAndExistingInput() {
        files.put(preview, file("application/pdf", 210, PDF_SHA));
        job.acceptPreview(PDF_SHA, NOW);
        job.receiveResult("COMPLETED", NOW);
        assertEquals(PDF_SHA, prepare(PREVIEW_READ, null, null).orElseThrow().sha256());
        assertTrue(prepare(PREVIEW_WRITE, 210L, PDF_SHA).isPresent());
        assertThrows(BusinessException.class, () -> prepare(PREVIEW_WRITE, 211L, PDF_SHA));
        assertThrows(BusinessException.class, () -> prepare(INPUT_WRITE, 210L, SOURCE_SHA));
        assertSignature(prepare(INPUT_WRITE, 210L, PDF_SHA).orElseThrow(), input, "if-none-match");
        assertEquals(PDF_UPLOAD_NOT_READY,
                assertThrows(BusinessException.class, () -> prepare(INPUT_VERIFY, 210L, PDF_SHA)).getErrorCode());
        files.put(input, file("application/pdf", 210, SOURCE_SHA));
        assertEquals(PDF_UPLOAD_NOT_READY,
                assertThrows(BusinessException.class, () -> prepare(INPUT_VERIFY, 210L, PDF_SHA)).getErrorCode());
        files.put(input, files.get(preview));
        assertTrue(prepare(INPUT_VERIFY, 210L, PDF_SHA).isEmpty());
        files.put(preview, file("application/pdf", 210, SOURCE_SHA));
        assertThrows(BusinessException.class, () -> prepare(INPUT_WRITE, 210L, PDF_SHA));
    }

    @Test
    void deletedOrUnknownIsNotFoundButNativePdfAndFailedPreviewCannotAcquireWriteAccess() {
        job.receiveResult("FAILED", NOW);
        assertThrows(BusinessException.class, () -> prepare(PREVIEW_WRITE, 100L, PDF_SHA));
        job.markDeleted(NOW);
        assertEquals(PDF_EXTRACTION_NOT_FOUND,
                assertThrows(BusinessException.class, () -> prepare(SOURCE, null, null)).getErrorCode());
        assertEquals(PDF_EXTRACTION_NOT_FOUND, assertThrows(BusinessException.class,
                () -> transfers.prepare(new Request(UUID.randomUUID(), original, ETAG, SOURCE, null, null)))
                .getErrorCode());
        when(jobs.findForUpdate(job.getId())).thenReturn(Optional.of(PdfExtractionFixtures.job(1)));
        assertEquals(INVALID_PDF_EXTRACTION_RESULT,
                assertThrows(BusinessException.class, () -> prepare(SOURCE, null, null)).getErrorCode());
    }

    private Optional<Transfer> prepare(Operation operation, Long size, String sha256) {
        return transfers.prepare(new Request(id, original, ETAG, operation, size, sha256));
    }

    private HeadObjectResponse file(String type, long size, String sha256) {
        return HeadObjectResponse.builder().contentType(type).contentLength(size).eTag("\"" + ETAG + "\"")
                .checksumSHA256(checksum(sha256)).build();
    }

    private String checksum(String hex) {
        return Base64.getEncoder().encodeToString(HexFormat.of().parseHex(hex));
    }

    private void assertSignature(Transfer transfer, String key, String... signedHeaders) {
        URI url = URI.create(transfer.url());
        assertEquals("/" + key, url.getPath());
        String query = URLDecoder.decode(url.getRawQuery(), StandardCharsets.UTF_8);
        assertTrue(query.contains("X-Amz-Expires=300"));
        String headerParameter = java.util.Arrays.stream(query.split("&"))
                .filter(value -> value.startsWith("X-Amz-SignedHeaders=")).findFirst().orElseThrow();
        for (String header : signedHeaders) {
            assertTrue(headerParameter.contains(header), "missing signed header: " + header);
        }
        assertFalse(transfer.toString().contains("Signature"));
    }
}
