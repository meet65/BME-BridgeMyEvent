package BME.bridgemyevent.Dto;

import lombok.Data;

@Data
public class BookingPricingRequest {
    private Double baseAmount;
    private Double setupAmount;
    private Double totalAmount;
}
