package BME.bridgemyevent.Repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import BME.bridgemyevent.Model.ClientProfile;

@Repository
public interface ClientProfileRepository 
        extends MongoRepository<ClientProfile, String> {
    Optional<ClientProfile> findByUserId(String userId);
    Optional<ClientProfile> findByEmail(String email);
    boolean existsByEmail(String email);
}
