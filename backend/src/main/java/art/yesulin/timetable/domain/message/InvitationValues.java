package art.yesulin.timetable.domain.message;

public record InvitationValues(
        String actorName,
        String title,
        String organizerName,
        String schedule,
        String location,
        String guide
) {
}
