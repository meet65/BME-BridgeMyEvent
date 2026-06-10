package BME.bridgemyevent.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import BME.bridgemyevent.Enum.UserRole;
import BME.bridgemyevent.Model.User;
import BME.bridgemyevent.Repository.UserRepository;
import jakarta.annotation.PostConstruct;

@Component
public class AdminSeeder {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder encoder;

    @PostConstruct
    public void createAdmin() {

        if (userRepo.findByEmail("meet656@gmail.com").isEmpty()) {
            User admin = new User();
            admin.setFullName("Super Admin");
            admin.setUserName("mmeet656");
            admin.setEmail("meet656@gmail.com");
            admin.setPassword(encoder.encode("meet656"));
            admin.setRole(UserRole.ADMIN);
            admin.setStatus("ACTIVE");
            userRepo.save(admin);
            System.out.println("✅ Admin created");
        }
    }
}

