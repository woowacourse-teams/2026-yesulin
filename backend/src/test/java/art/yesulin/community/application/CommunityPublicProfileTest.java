package art.yesulin.community.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.actor.application.page.ActorPageService;
import art.yesulin.actor.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyService;
import art.yesulin.actor.application.profile.ApplicantProfileService;
import art.yesulin.actor.application.profile.UpdateApplicantProfileCommand;
import art.yesulin.actor.application.profile.UpdateProfileBasicInformationCommand;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.profile.ProfileGender;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.community.domain.CommunityAuthorMode;
import art.yesulin.file.application.FileService;
import art.yesulin.file.application.FileUploadCommand;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:community-public-profile;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class CommunityPublicProfileTest {
    @Autowired
    private CommunityMembershipService community;
    @Autowired
    private CommunityProfiles communityProfiles;
    @Autowired
    private MemberRepository members;
    @Autowired
    private ActorPageService pages;
    @Autowired
    private ApplicantProfileService profiles;
    @Autowired
    private PhotoLibraryService photos;
    @Autowired
    private PhotoPublicCopyService copies;
    @Autowired
    private FileService files;
    @Autowired
    private FakeObjectStorage storage;

    @Test
    void realPublicPageControlsCommunityIdentityWithoutContactExposure() {
        MemberPrincipal actor = MemberPrincipal.from(members.saveAndFlush(Member.ofApplicant()));
        long owner = actor.memberId();
        profiles.update(owner, basic("처음 이름"));
        addPublicPhoto(owner);
        pages.changeHandle(owner, "community.actor");
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        EntryResult post = community.createPost(actor, UUID.randomUUID(), "공개", "내용", CommunityAuthorMode.PROFILE);
        assertEquals("처음 이름", post.author());
        assertEquals("/actors/@community.actor", post.authorPath());
        profiles.update(owner, basic("변경 이름"));
        assertEquals("변경 이름", community.post(post.id(), null, null).author());
        pages.unpublish(owner);
        EntryResult hidden = community.post(post.id(), null, null);
        assertEquals("프로필 비공개", hidden.author());
        assertNull(hidden.authorPath());
        assertNull(hidden.authorPhotoUrl());
        assertThrows(BusinessException.class, () -> community.createPost(actor, UUID.randomUUID(),
                "공개", "내용", CommunityAuthorMode.PROFILE));
        addPublicPhoto(owner);
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        assertEquals("변경 이름", community.post(post.id(), null, null).author());
        assertEquals("알 수 없는 사용자", communityProfiles.find(Long.MAX_VALUE).name());
    }

    private void addPublicPhoto(long owner) {
        var upload = files.requestPrivateActorPhotoUpload(owner, new FileUploadCommand("photo.png",
                "image/png", 1024L));
        storage.upload(upload.uploadUrl(), "image/png", 1024L);
        files.completeUpload(owner, upload.fileId());
        long id = photos.addPhoto(owner, new AddPhotoToLibraryCommand(upload.fileId())).id();
        photos.changeVisibility(owner, id, PhotoVisibility.PUBLIC);
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};
        var copy = copies.prepareUpload(owner, id, "image/jpeg", jpeg.length);
        storage.upload(copy.url(), "image/jpeg", jpeg);
        copies.complete(owner, id, copy.uploadKey());
    }

    private UpdateApplicantProfileCommand basic(String name) {
        return new UpdateApplicantProfileCommand(new UpdateProfileBasicInformationCommand(
                name, 170, null, LocalDate.of(2000, 1, 1), ProfileGender.FEMALE,
                "010-1234-5678", "private@example.test", "서울"), null);
    }
}
