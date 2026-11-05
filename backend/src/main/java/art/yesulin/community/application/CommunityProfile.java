package art.yesulin.community.application;

public record CommunityProfile(String name, String photoUrl, String path) {
    public static CommunityProfile hidden() {
        return new CommunityProfile("프로필 비공개", null, null);
    }

    public static CommunityProfile missing() {
        return new CommunityProfile("알 수 없는 사용자", null, null);
    }

    public boolean available() {
        return path != null;
    }
}
