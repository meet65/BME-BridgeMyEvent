package BME.bridgemyevent.Model;

import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Document(collection = "bookings")
@Data
public class Booking {

    @Id
    private String id;

    private String eventId;
    private String clientId;
    private String organizerId;
    private String clientName;
    private String clientEmail;
    private String clientPhone;
    private String clientProfileImage;

    private String venueName;
    private String companyName;
    private String city;
    private String organizerProfileImage;

    private String eventType;
    private int guests;
    private List<BookingDateTime> dateAndTime;

    private String setup;
    private String message;
    private String totalAmount;
    private Double totalAmountValue;
    private Double baseAmountValue;
    private Double setupAmountValue;
    private Boolean basePriceOnRequest;
    private Boolean setupPriceOnRequest;
    private Double depositAmount;
    private Double finalAmount;
    private Double paidAmount;
    private String paymentStatus;
    private String paymentCurrency;
    private String lastPaymentStage;
    private String lastOrderId;
    private String lastPaymentId;

    private Double adminFeeAmount;
    private String adminPaymentStatus;
    
    private String status; 
    // REQUESTED, CONFIRMED, RUNNING, COMPLETED, CANCELLED

    // UPDATE FEATURE FIELDS
    private String changeRequestStatus; // NONE, PENDING, ACCEPTED, REJECTED
    private String requestedDetailsJson; // Store requested changes as JSON string
    private Double priceAdjustment;      // Extra amount added by organizer
    private String refundStatus;        // NONE, PENDING_REFUND, REFUNDED
}
