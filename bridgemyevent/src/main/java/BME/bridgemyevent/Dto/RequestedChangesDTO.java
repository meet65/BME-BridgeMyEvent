package BME.bridgemyevent.Dto;

import java.util.List;
import BME.bridgemyevent.Model.BookingDateTime;
import lombok.Data;

@Data
public class RequestedChangesDTO {
    private int guests;
    private String setup;
    private List<BookingDateTime> dateAndTime;
    private String message;
}
