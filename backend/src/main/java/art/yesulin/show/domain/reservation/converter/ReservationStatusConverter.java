package art.yesulin.show.domain.reservation.converter;

import art.yesulin.global.persistence.StringEnumConverter;
import art.yesulin.show.domain.reservation.ReservationStatus;
import jakarta.persistence.Converter;

@Converter
public class ReservationStatusConverter extends StringEnumConverter<ReservationStatus> {

    public ReservationStatusConverter() {
        super(ReservationStatus.class);
    }
}
