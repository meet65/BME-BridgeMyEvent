package BME.bridgemyevent;

import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import com.mongodb.client.MongoClient;

import jakarta.annotation.PostConstruct;

@Component
public class MongoCheck {

    @Autowired
    MongoTemplate mongoTemplate;

    @Autowired
    private MongoClient mongoClient;

    @PostConstruct
    public void check() {
        System.out.println(
            "REAL DB NAMES = " +
            mongoClient.listDatabaseNames().into(new ArrayList<>())
        );
        System.out.println("CONNECTED DB = " + mongoTemplate.getDb().getName());
    }
}
