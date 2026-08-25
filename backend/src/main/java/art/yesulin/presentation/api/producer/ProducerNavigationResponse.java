package art.yesulin.presentation.api.producer;

import art.yesulin.domain.audition.query.AuditionManagementResult;
import art.yesulin.domain.audition.query.PerformanceManagementResult;
import java.util.List;
import java.util.UUID;
import java.util.function.LongFunction;

public record ProducerNavigationResponse(List<PerformanceNode> performances) {

    public ProducerNavigationResponse {
        performances = List.copyOf(performances);
    }

    public static ProducerNavigationResponse from(
            List<PerformanceManagementResult> performances,
            LongFunction<String> posterUrlReader
    ) {
        return new ProducerNavigationResponse(performances.stream()
                .map(performance -> PerformanceNode.from(
                        performance, posterUrlReader.apply(performance.posterFileId())
                ))
                .toList());
    }

    public record PerformanceNode(long id, String posterUrl, String title, List<AuditionNode> postings) {

        public PerformanceNode {
            postings = List.copyOf(postings);
        }

        static PerformanceNode from(PerformanceManagementResult performance, String posterUrl) {
            return new PerformanceNode(
                    performance.id(),
                    posterUrl,
                    performance.title(),
                    performance.postings().stream().map(AuditionNode::from).toList()
            );
        }
    }

    public record AuditionNode(
            UUID id,
            String title,
            String phase,
            int applicantCount,
            List<Long> roleIds
    ) {

        public AuditionNode {
            roleIds = List.copyOf(roleIds);
        }

        static AuditionNode from(AuditionManagementResult audition) {
            return new AuditionNode(
                    audition.id(),
                    audition.title(),
                    audition.phase(),
                    audition.applicantCount(),
                    audition.roles().stream().map(role -> role.id()).toList()
            );
        }
    }
}
