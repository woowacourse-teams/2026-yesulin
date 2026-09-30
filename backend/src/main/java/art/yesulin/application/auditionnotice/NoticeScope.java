package art.yesulin.application.auditionnotice;

import java.util.UUID;

/** Identifies either a standard role or a role order within an OTR audition. */
public record NoticeScope(long roleId, UUID otrAuditionId) {

    public NoticeScope {
        if (roleId <= 0) {
            throw new IllegalArgumentException("배역을 확인해 주세요.");
        }
    }

    public static NoticeScope standard(long roleId) {
        return new NoticeScope(roleId, null);
    }

    public String key() {
        return otrAuditionId == null ? "STANDARD" : "OTR:" + otrAuditionId;
    }

    public static NoticeScope restore(long roleId, String key) {
        if ("STANDARD".equals(key)) {
            return standard(roleId);
        }
        if (key != null && key.startsWith("OTR:")) {
            return new NoticeScope(roleId, UUID.fromString(key.substring(4)));
        }
        throw new IllegalArgumentException("알 수 없는 문자 발송 출처입니다.");
    }
}
