package BME.bridgemyevent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class BridgeMyEventApplication {

    public static void main(String[] args) {
        SpringApplication.run(BridgeMyEventApplication.class, args);
    }
}