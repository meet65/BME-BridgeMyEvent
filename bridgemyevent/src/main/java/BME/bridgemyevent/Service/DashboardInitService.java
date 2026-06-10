package BME.bridgemyevent.Service;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import BME.bridgemyevent.Enum.UserRole;
import BME.bridgemyevent.Model.ClientProfile;
import BME.bridgemyevent.Model.User;
import BME.bridgemyevent.Repository.ClientProfileRepository;

@Service
public class DashboardInitService {

    @Autowired 
    private ClientProfileRepository clientRepo;

    public Map<String, Object> init(User user) {

        if (user.getRole() == UserRole.CLIENT) {
            createClientProfileIfNotExists(user);

            return Map.of(
                    "status", "READY",
                    "role", "CLIENT"
            );
        }

        if (user.getRole() == UserRole.ORGANIZER) {
            if (!"APPROVED".equals(user.getStatus())) {
                return Map.of(
                        "status", "LOCKED",
                        "message", "Waiting for admin approval"
                );
            }
            return Map.of("status", "READY", "role", "ORGANIZER");
        }

        return Map.of("status", "READY", "role", "ADMIN");
    }

    private void createClientProfileIfNotExists(User user) {

        clientRepo.findByUserId(user.getId())
                .orElseGet(() -> {
                    ClientProfile profile = new ClientProfile();
                    profile.setUserId(user.getId());
                    profile.setCreatedAt(LocalDateTime.now());
                    return clientRepo.save(profile);
                });
    }
}

