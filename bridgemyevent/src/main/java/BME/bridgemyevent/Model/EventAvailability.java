package BME.bridgemyevent.Model;

import lombok.Data;

@Data
public class EventAvailability {
    
     // available | unavailable
    private String date;
    private String timeFrom;
    private String timeTo;

}
