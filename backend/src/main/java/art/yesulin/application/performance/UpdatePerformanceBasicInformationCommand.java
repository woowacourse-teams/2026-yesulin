package art.yesulin.application.performance;

public record UpdatePerformanceBasicInformationCommand(String title, PerformanceVenueCommand venue) {

    public UpdatePerformanceBasicInformationCommand(String title, String roadAddress) {
        this(title, new PerformanceVenueCommand(roadAddress, roadAddress, "", "", null, null));
    }
}
