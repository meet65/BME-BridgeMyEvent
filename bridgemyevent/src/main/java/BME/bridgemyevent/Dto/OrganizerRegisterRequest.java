package BME.bridgemyevent.Dto;

import java.util.List;

import lombok.Data;

@Data
public class OrganizerRegisterRequest {
    public String fullName;
    public String email;
    public String password;
    public String companyName;
    public String experience;
    public List<String> events;
    public String description;
    public String about;
    public String gst;
    public List<String> locations;
    public String contactNumber;
}