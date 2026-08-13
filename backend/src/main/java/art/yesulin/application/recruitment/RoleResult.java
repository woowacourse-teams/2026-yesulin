package art.yesulin.application.recruitment;

public record RoleResult(
        long id,
        long postingId,
        Long templateId,
        String name,
        String description,
        Integer quota,
        String genderCondition,
        Integer ageMin,
        Integer ageMax) {
}
