package art.yesulin.application.recruitment;

public record RoleCommand(
        String name,
        String description,
        Integer quota,
        String genderCondition,
        Integer ageMin,
        Integer ageMax) {
}
