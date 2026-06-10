package BME.bridgemyevent.Model;

import java.util.List;

import lombok.Data;

@Data
public class SetupVariant {

    private String setupName;           
    private String setupDescription;    

    private String availability;        
    private boolean customAvailable;    

    private String priceConditions;    
    private String pricePer;           
    private Double setupPrice;          

    private List<String> images;       
}
