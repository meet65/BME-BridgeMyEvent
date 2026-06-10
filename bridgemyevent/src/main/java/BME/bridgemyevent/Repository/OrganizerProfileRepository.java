package BME.bridgemyevent.Repository;

import BME.bridgemyevent.Model.OrganizerProfile;


import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrganizerProfileRepository
        extends MongoRepository<OrganizerProfile, String> {

                Optional<OrganizerProfile> findByUserId(String userId);
                void deleteByUserId(String userId);
                Optional<OrganizerProfile> findByEmail(String email);
                boolean existsByCompanyName(String companyName);

}
