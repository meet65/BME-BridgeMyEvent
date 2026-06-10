package BME.bridgemyevent.Repository;

import BME.bridgemyevent.Enum.UserRole;
import BME.bridgemyevent.Model.User;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;


public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    List<User> findByRoleAndStatus(UserRole role, String status);
    Optional<User> findByUserName(String userName);
    boolean existsByUserName(String userName); // optional

}