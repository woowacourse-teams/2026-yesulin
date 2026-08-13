package art.yesulin.application.recruitment;

public record RoleTemplateResult(
        long id,
        String name,
        String description,
        String genderCondition,
        int ageMin,
        int ageMax) {
}
