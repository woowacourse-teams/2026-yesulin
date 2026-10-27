package art.yesulin.actor.domain.page;

public enum ActorPageMissingField {

    HANDLE("아이디"),
    NAME("이름"),
    GENDER("성별"),
    BIRTH_DATE("생년월일"),
    PUBLIC_PHOTO("공개 사진");

    private final String label;

    ActorPageMissingField(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
