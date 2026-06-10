package BME.bridgemyevent.Model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import BME.bridgemyevent.Enum.UserRole;
import lombok.Data;

@Document("users")
@Data
public class User {

    @Id
    private String id;

    private String fullName;

    @Indexed(unique = true, sparse = true)
    private String userName;

    @Indexed(unique = true, sparse = true)
    private String companyName;

    @Indexed(unique = true)
    private String email;

    private String phone;
    private String password;
    private UserRole role; // CLIENT, ORGANIZER, ADMIN
    private String status; // ACTIVE, PENDING, SUSPENDED
    private LocalDateTime createdAt;

    public User() {
        this.createdAt = LocalDateTime.now();
    }
}
