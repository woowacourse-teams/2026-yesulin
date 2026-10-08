package art.yesulin.show.application.reservation;

public record ReserveCommand(String bookerName, String bookerPhone, int ticketCount, boolean privacyAgreed) {
}
