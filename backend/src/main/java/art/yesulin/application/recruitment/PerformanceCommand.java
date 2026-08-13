package art.yesulin.application.recruitment;

import java.util.List;

public record PerformanceCommand(
        String title,
        String venue,
        String posterUrl,
        List<RoleTemplateCommand> roleTemplates) {

    public PerformanceCommand {
        roleTemplates = List.copyOf(roleTemplates);
    }
}
