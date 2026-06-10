package BME.bridgemyevent.Dto;

import java.util.List;

import lombok.Data;

@Data
public class UpdateOrgProfResponce {
    private String fullName;
    private String experience;
    private String description;
    private String about;   
    private List<String> locations;
    private String city;
    private String state;
    private String contactNumber;
    private String instagram;
    private String facebook;
    private String youTube;
    private String website;
}
