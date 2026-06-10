package BME.bridgemyevent.Model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Document(collection = "organizer_profiles")
@Data
public class OrganizerProfile {

    @Id
    private String id;
    private String fullName;

    @Indexed(unique = true)
    private String email;

    private String userId; //  link with User

    private String profileImage;
    private String experience;
    private List<String> portfolio;

    @Indexed(unique = true, sparse = true)
    private String companyName;

    private List<String> events;
    private String description;
    private String about;
    private String gst;
    private String city;
    private String state;
    private List<String> locations;
    private String contactNumber;
    private String instagram;
    private String facebook;
    private String youTube;
    private String website;

    private String approvalStatus; // PENDING, APPROVED, REJECTED
    private LocalDateTime createdAt;
    private List<Event> event = new ArrayList<>();

    public OrganizerProfile() {
        this.approvalStatus = "PENDING";
        this.createdAt = LocalDateTime.now();
    }
}

