package BME.bridgemyevent.Dto;

import java.util.List;

import lombok.Data;

@Data
public class OrganizerProfileResponce {
    
    private String fullName;
    private String email;
    private String companyName;
    private String experience;
    private String description;
    private String about;
    private String gst;
    private List<String> locations;
    private String city;
    private String state;
    private String contactNumber;
    private String profileImage;
    private String instagram;
    private String facebook;
    private String youTube;
    private String website;
    private Double rating;
    private Integer reviewCount;
    private String status;
}
