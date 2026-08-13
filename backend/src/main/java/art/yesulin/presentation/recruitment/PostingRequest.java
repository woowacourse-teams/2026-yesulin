package art.yesulin.presentation.recruitment;

import art.yesulin.application.recruitment.PostingCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import tools.jackson.databind.JsonNode;

public record PostingRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Pattern(regexp = "UPCOMING|OPEN|CLOSED") String status,
        boolean allowsMultipleRoles,
        @NotNull OffsetDateTime recruitmentStartsAt,
        @NotNull OffsetDateTime recruitmentEndsAt,
        String applicationGuide,
        List<RoleSelection> roles,
        List<Round> rounds,
        List<Field> applicationFields) {

    public PostingRequest {
        roles = roles == null ? List.of() : List.copyOf(roles);
        rounds = rounds == null ? List.of() : List.copyOf(rounds);
        applicationFields = applicationFields == null ? List.of() : List.copyOf(applicationFields);
    }

    public record RoleSelection(long templateId, int quota) {
        art.yesulin.application.recruitment.PostingRoleSelection toCommand() {
            return new art.yesulin.application.recruitment.PostingRoleSelection(templateId, quota);
        }
    }

    public record Round(int round, String name, LocalDate date, String note) {
        art.yesulin.application.recruitment.ScreeningRoundCommand toCommand() {
            return new art.yesulin.application.recruitment.ScreeningRoundCommand(
                    round, name, date, note);
        }
    }

    public record Field(
            String key,
            String label,
            boolean required,
            boolean custom,
            String section,
            String inputType,
            int order,
            JsonNode config) {

        art.yesulin.application.recruitment.PostingFieldCommand toCommand() {
            return new art.yesulin.application.recruitment.PostingFieldCommand(
                    key, label, required, custom, section, inputType, order,
                    config == null ? "{}" : config.toString());
        }
    }

    PostingCommand toCommand() {
        return new PostingCommand(
                title,
                status,
                allowsMultipleRoles,
                recruitmentStartsAt.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(),
                recruitmentEndsAt.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(),
                applicationGuide,
                roles.stream().map(RoleSelection::toCommand).toList(),
                rounds.stream().map(Round::toCommand).toList(),
                applicationFields.stream().map(Field::toCommand).toList());
    }
}
