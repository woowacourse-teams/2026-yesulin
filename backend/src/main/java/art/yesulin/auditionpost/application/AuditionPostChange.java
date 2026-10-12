package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** 공고를 고칠 때 바뀐 항목. 운영자 알림에는 무엇이 바뀌었는지만 담고 고친 내용은 담지 않는다. */
public enum AuditionPostChange {

    CATEGORY("분류"),
    TITLE("제목"),
    PAY("페이"),
    DEADLINE("마감"),
    BODY("본문"),
    TAGS("태그"),
    ATTACHMENTS("첨부");

    private final String label;

    AuditionPostChange(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** 고치기 전 상태. 공고의 태그·파일 목록은 고칠 때 비우고 다시 채우므로 복사해 둔다. */
    record Before(AuditionPostContent content, List<String> tags, List<AuditionPostFile> files) {

        static Before of(AuditionPost post) {
            return new Before(post.getContent(), List.copyOf(post.getTags()), List.copyOf(post.getFiles()));
        }

        List<AuditionPostChange> changesTo(AuditionPost after) {
            AuditionPostContent next = after.getContent();
            List<AuditionPostChange> changes = new ArrayList<>();
            addIf(changes, CATEGORY, !Objects.equals(content.getCategory(), next.getCategory()));
            addIf(changes, TITLE, !Objects.equals(content.getTitle(), next.getTitle()));
            addIf(changes, PAY, !Objects.equals(content.getPay(), next.getPay()));
            addIf(changes, DEADLINE, !Objects.equals(content.getDeadlineText(), next.getDeadlineText()));
            addIf(changes, BODY, !Objects.equals(content.getBodyHtml(), next.getBodyHtml())
                    || !images(files).equals(after.images()));
            addIf(changes, TAGS, !tags.equals(after.getTags()));
            addIf(changes, ATTACHMENTS, !attachments(files).equals(after.attachments()));
            return List.copyOf(changes);
        }

        private static void addIf(List<AuditionPostChange> changes, AuditionPostChange change, boolean changed) {
            if (changed) {
                changes.add(change);
            }
        }

        private static List<AuditionPostFile> images(List<AuditionPostFile> files) {
            return files.stream().filter(AuditionPostFile::isImage).toList();
        }

        private static List<AuditionPostFile> attachments(List<AuditionPostFile> files) {
            return files.stream().filter(file -> !file.isImage()).toList();
        }
    }
}
