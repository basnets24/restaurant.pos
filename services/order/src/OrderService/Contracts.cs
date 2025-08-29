namespace OrderService;


    public record AppliedTax(
        Guid Id,
        string Name,
        decimal? RatePercent,   // e.g., 9.25m
        decimal? Amount,        // fixed dollars for order-level fee taxes
        string Scope            // "Line" or "Order" (optional metadata)
    );

    public record AppliedDiscount(
        Guid Id,
        string Name,
        decimal? Percent,       // e.g., 10m
        decimal? Amount,        // e.g., 5.00m
        string Scope            // "Line" or "Order"
    );
    
    public record ServiceCharge(
        Guid Id,
        string Name,            // e.g., "Tip", "Delivery Fee"
        decimal? Percent,       // e.g., 15m for 15%
        decimal? Amount,        // fixed amount alternative
        bool Taxable,           // if tax applies to this charge
        string Scope            // "Order" or "Line"
    );
    
