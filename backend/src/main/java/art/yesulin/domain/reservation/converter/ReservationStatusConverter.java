package art.yesulin.domain.reservation.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.reservation.ReservationStatus;
import jakarta.persistence.Converter;

@Converter
public class ReservationStatusConverter extends StringEnumConverter<ReservationStatus> {

    public ReservationStatusConverter() {
        super(ReservationStatus.class);
    }
}
