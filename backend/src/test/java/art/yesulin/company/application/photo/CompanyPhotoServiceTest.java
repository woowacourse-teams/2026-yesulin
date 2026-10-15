package art.yesulin.company.application.photo;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.application.CompanyService;
import art.yesulin.company.application.editrequest.AdminCompanyEditRequestResult;
import art.yesulin.company.application.editrequest.CompanyEditRequestService;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.company.domain.CompanyStatus;
import art.yesulin.company.domain.editrequest.CompanyEditRequestRepository;
import art.yesulin.company.domain.editrequest.CompanyField;
import art.yesulin.company.domain.photo.CompanyPhotoUploadRepository;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:company-photo;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class CompanyPhotoServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final long OTHER_ADMIN_ID = 2L;
    private static final byte[] JPEG = {
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0, 1, 1, 0
    };
    private static final String UPLOAD_URL_PREFIX = "https://storage.test/uploads/";

    @Autowired
    private CompanyPhotoService photoService;

    @Autowired
    private CompanyService companyService;

    @Autowired
    private CompanyEditRequestService editRequestService;

    @Autowired
    private CompanyPhotoUploadRepository uploadRepository;

    @Autowired
    private CompanyEditRequestRepository editRequestRepository;

    @Autowired
    private FakeObjectStorage storage;

    @BeforeEach
    void setUp() {
        uploadRepository.deleteAll();
        editRequestRepository.deleteAll();
    }

    @Test
    void adminUploadBecomesCompanyPhotoAndOldPhotoIsDeletedWhenReplaced() {
        CompanyPhotoUploadResult first = photoService.prepareForAdmin(ADMIN_ID, "image/jpeg", JPEG.length);
        putJpeg(first);
        AdminCompanyResult created = companyService.create(ADMIN_ID, CompanyProfile.named("극단"), first.photoUrl());
        String firstKey = keyOf(first);

        assertEquals(first.photoUrl(), created.photoUrl());
        assertTrue(uploadRepository.findByObjectKey(firstKey).isEmpty());

        AdminCompanyResult kept = companyService.update(
                ADMIN_ID, created.id(), CompanyProfile.named("극단"), created.photoUrl()
        );
        assertEquals(first.photoUrl(), kept.photoUrl());

        CompanyPhotoUploadResult second = photoService.prepareForAdmin(ADMIN_ID, "image/jpeg", JPEG.length);
        putJpeg(second);
        AdminCompanyResult replaced = companyService.update(
                ADMIN_ID, created.id(), CompanyProfile.named("극단"), second.photoUrl()
        );
        assertEquals(second.photoUrl(), replaced.photoUrl());
        assertFalse(storage.contains(firstKey));

        AdminCompanyResult cleared = companyService.update(ADMIN_ID, created.id(), CompanyProfile.named("극단"), null);
        assertNull(cleared.photoUrl());
        assertFalse(storage.contains(keyOf(second)));
    }

    @Test
    void rejectsUploadThatIsNotTheDeclaredImage() {
        CompanyPhotoUploadResult upload = photoService.prepareForAdmin(ADMIN_ID, "image/png", 12);
        storage.put(keyOf(upload), new ObjectUpload(
                "image/png", null, 12, new ByteArrayInputStream("<html>evil!!".getBytes())
        ));

        assertThrows(BusinessException.class, () ->
                companyService.create(ADMIN_ID, CompanyProfile.named("극단"), upload.photoUrl()));
    }

    @Test
    void rejectsPhotoUploadedByAnotherAdminOrUnknownAddress() {
        CompanyPhotoUploadResult upload = photoService.prepareForAdmin(OTHER_ADMIN_ID, "image/jpeg", JPEG.length);
        putJpeg(upload);

        assertThrows(BusinessException.class, () ->
                companyService.create(ADMIN_ID, CompanyProfile.named("극단"), upload.photoUrl()));
        assertThrows(BusinessException.class, () ->
                companyService.create(ADMIN_ID, CompanyProfile.named("극단"), "https://evil.test/a.jpg"));
    }

    @Test
    void rejectsUnsupportedTypeAndOversizedPhoto() {
        assertThrows(BusinessException.class, () -> photoService.prepareForAdmin(ADMIN_ID, "image/svg+xml", 100));
        assertThrows(BusinessException.class, () -> photoService.prepareForAdmin(ADMIN_ID, "image/heic", 100));
        assertThrows(BusinessException.class, () ->
                photoService.prepareForAdmin(ADMIN_ID, "image/jpeg", 10L * 1024 * 1024 + 1));
    }

    @Test
    void requestedPhotoStaysPrivateUntilAdminAppliesIt() {
        long companyId = publishedCompany();
        CompanyPhotoUploadResult upload = editRequestService.preparePhotoUpload(companyId, "image/jpeg", JPEG.length);
        assertNull(upload.photoUrl());
        assertTrue(upload.uploadKey().startsWith("private/company-photos/"));
        putJpeg(upload);

        long requestId = requestWithPhoto(companyId, upload.uploadKey());
        AdminCompanyEditRequestResult pending = editRequestService.findPending().getFirst();
        assertTrue(pending.proposal().photoAttached());
        assertArrayEquals(JPEG, editRequestService.findPhoto(requestId).bytes());

        AdminCompanyResult applied = editRequestService.apply(
                ADMIN_ID, requestId, CompanyProfile.named("극단 예술in"), null, true,
                companyService.findForAdmin(companyId).updatedAt()
        );

        assertNotNull(applied.photoUrl());
        assertTrue(applied.photoUrl().contains("files/companies/"));
        assertFalse(storage.contains(upload.uploadKey()));
        assertThrows(BusinessException.class, () -> editRequestService.findPhoto(requestId));
    }

    @Test
    void rejectingRequestDeletesItsPhoto() {
        long companyId = publishedCompany();
        CompanyPhotoUploadResult upload = editRequestService.preparePhotoUpload(companyId, "image/jpeg", JPEG.length);
        putJpeg(upload);
        long requestId = requestWithPhoto(companyId, upload.uploadKey());

        editRequestService.reject(ADMIN_ID, requestId);

        assertFalse(storage.contains(upload.uploadKey()));
        assertNull(companyService.findForAdmin(companyId).photoUrl());
    }

    @Test
    void requestPhotoUploadNeedsPublishedCompany() {
        long companyId = companyService.create(ADMIN_ID, CompanyProfile.named("공개 전")).id();

        assertThrows(BusinessException.class, () ->
                editRequestService.preparePhotoUpload(companyId, "image/jpeg", JPEG.length));
    }

    private long publishedCompany() {
        long companyId = companyService.create(ADMIN_ID, CompanyProfile.named("극단 예술in")).id();
        companyService.changeStatus(ADMIN_ID, companyId, CompanyStatus.PUBLISHED);
        return companyId;
    }

    private long requestWithPhoto(long companyId, String uploadKey) {
        return editRequestService.request(
                companyId, new CompanyProfile(
                        "극단 예술in", null, false, List.of(), null, null, false, null, null, null, null, null
                ),
                Set.of(CompanyField.PHOTO), "로고를 바꿔 주세요.", null, uploadKey
        );
    }

    private void putJpeg(CompanyPhotoUploadResult upload) {
        storage.put(keyOf(upload), new ObjectUpload("image/jpeg", null, JPEG.length, new ByteArrayInputStream(JPEG)));
    }

    private static String keyOf(CompanyPhotoUploadResult upload) {
        return upload.url().substring(UPLOAD_URL_PREFIX.length());
    }
}
