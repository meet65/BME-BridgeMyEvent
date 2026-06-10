package BME.bridgemyevent.Service;

// import java.util.List;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import BME.bridgemyevent.Dto.ClientRegisterRequest;
import BME.bridgemyevent.Dto.LoginResponse;
import BME.bridgemyevent.Dto.OrganizerRegisterRequest;
import BME.bridgemyevent.Enum.UserRole;
import BME.bridgemyevent.Jwt.JwtUtil;
import BME.bridgemyevent.Model.ClientProfile;
import BME.bridgemyevent.Model.OrganizerProfile;
import BME.bridgemyevent.Model.User;
// import BME.bridgemyevent.Model.UserStatus;
import BME.bridgemyevent.Repository.ClientProfileRepository;
import BME.bridgemyevent.Repository.OrganizerProfileRepository;
import BME.bridgemyevent.Repository.UserRepository;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClientProfileRepository clientRepo;

    @Autowired
    private OrganizerProfileRepository organizerRepo;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtil jwtUtil;

    //  REGISTER CLIENT 
    public void registerClient(ClientRegisterRequest req) {

    // VALIDATION 
        if (userRepository.existsByUserName(req.getUserName())) {
            throw new RuntimeException("Username already taken");
        }

        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        // CREATE USER
        User user = new User();
        user.setFullName(req.getFullName());
        user.setUserName(req.getUserName());
        user.setEmail(req.getEmail());
        user.setPassword(encoder.encode(req.getPassword()));
        user.setRole(UserRole.CLIENT);
        user.setStatus("ACTIVE");

        userRepository.save(user);

        // AUTO CREATE CLIENT PROFILE 
        ClientProfile profile = new ClientProfile();
        profile.setUserId(user.getId());
        profile.setFullName(user.getFullName());
        profile.setPhone(user.getPhone());
        profile.setUserName(user.getUserName());
        profile.setEmail(user.getEmail());

        clientRepo.save(profile);
    }

    //  REGISTER ORGANIZER 
    public void registerOrganizer(OrganizerRegisterRequest req) {

        //  VALIDATIONS 
        Optional<User> existingUser = userRepository.findByEmail(req.getEmail().trim());

        if (existingUser.isPresent()) {
            throw new RuntimeException("Email already taken");
        }


        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        if (organizerRepo.existsByCompanyName(req.getCompanyName())) {
            throw new RuntimeException("Company name already exists");
        }

        //  CREATE USER 
        User user = new User();
        user.setFullName(req.getFullName());
        user.setCompanyName(req.getCompanyName());
        user.setEmail(req.getEmail());
        user.setPassword(encoder.encode(req.getPassword()));
        user.setRole(UserRole.ORGANIZER);
        user.setStatus("PENDING"); // Needs admin approval

        userRepository.save(user);

        //  CREATE ORGANIZER PROFILE 
        OrganizerProfile profile = new OrganizerProfile();
        profile.setUserId(user.getId());
        profile.setEmail(user.getEmail());
        profile.setCompanyName(req.getCompanyName());
        profile.setFullName(req.getFullName());
        profile.setExperience(req.getExperience());
        profile.setEvents(req.getEvents());
        profile.setDescription(req.getDescription());
        profile.setAbout(req.getAbout());
        profile.setGst(req.getGst());
        profile.setLocations(req.getLocations());
        profile.setContactNumber(req.getContactNumber());

        organizerRepo.save(profile);
    }

    //  LOGIN 
    public LoginResponse login(String email, String password, String role) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!encoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        UserRole requestedRole;
        try {
            requestedRole = UserRole.valueOf(role.toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Invalid role");
        }

        if (user.getRole() != requestedRole) {
            throw new RuntimeException("Invalid role for this account");
        }

        if ("DELETED".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Your account has been deleted by an administrator. Please contact support at support@bridgemyevent.com if you believe this is an error.");
        }

        if ("SUSPENDED".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Your account has been suspended by an administrator. Advice: Please review our platform policies. You can contact support to appeal this suspension.");
        }

        // Organizer approval check (PENDING/REJECTED organizers are still blocked)
        if (user.getRole() == UserRole.ORGANIZER) {
            if ("PENDING".equalsIgnoreCase(user.getStatus())) {
                throw new RuntimeException("Organizer not approved yet");
            }
            if ("REJECTED".equalsIgnoreCase(user.getStatus())) {
                throw new RuntimeException("Organizer application rejected");
            }
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return new LoginResponse(
                token,
                user.getRole().name(),
                "Login successful"
        );
    }
}
