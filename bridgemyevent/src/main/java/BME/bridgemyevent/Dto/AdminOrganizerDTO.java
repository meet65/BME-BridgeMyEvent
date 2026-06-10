package BME.bridgemyevent.Dto;

import java.time.LocalDateTime;

import BME.bridgemyevent.Model.OrganizerProfile;
import BME.bridgemyevent.Model.User;

public class AdminOrganizerDTO {

    public String userId;
    public String email;
    public String companyName;
    public String experience;
    public LocalDateTime createdAt;
    public String status;
    public String fullName;
    public String contactNumber;

    public AdminOrganizerDTO(User user, OrganizerProfile profile) {
        this.userId = user.getId();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.status = user.getStatus();
        this.createdAt = user.getCreatedAt();

        if (profile != null) {
            this.companyName = profile.getCompanyName();
            this.experience = profile.getExperience();
            this.contactNumber = profile.getContactNumber();
        }
    }
}

