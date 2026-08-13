package art.yesulin.application.recruitment;

public record RoleTemplateCommand(
        String name,
        String description,
        String genderCondition,
        int ageMin,
        int ageMax) {
}
