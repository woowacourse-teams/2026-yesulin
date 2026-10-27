package art.yesulin.community.application;

public interface CommunityReportNotifier {

    boolean enabled();

    void send(CommunityReportNotice notice);
}
