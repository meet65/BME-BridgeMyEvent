package BME.bridgemyevent.Model;

import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Document(collection = "events")
@Data
public class Event {

    @Id
    private String id;

    private String organizerId;
    private String companyName;
    
    private String venueName;
    private String venueType;
    private String location;
    private String city;
    private String contactNumber;
    private String description;
    private String priceType;
    private String priceUnit;
    private int minCapacity;
    private int maxCapacity;
    private double priceAmount;
    private String availabilityDataType;
    private List<EventAvailability> availabilityData;

    private List<String> amenities;
    private List<String> supportedEvents;
    private List<String> venueImages;
    private List<SetupVariant> setups;
    private String adminStatus;

    public Event() {
        this.adminStatus = "PUBLISHED";
    }
}
