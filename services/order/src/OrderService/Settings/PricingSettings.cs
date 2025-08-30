namespace OrderService.Settings;

public class PricingSettings
{
    public List<AppliedTax> Taxes { get; set; } = new();
    public List<ServiceCharge> ServiceCharges { get; set; } = new();
    public List<AppliedDiscount> Discounts { get; set; } = new();
}

public class TaxSetting
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public decimal? RatePercent { get; set; }  // e.g., 9.25
    public decimal? Amount { get; set; }       // fixed $
    public string? Scope { get; set; }
}

public class ServiceChargeSetting
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public decimal? Percent { get; set; }      // e.g., 18
    public decimal? Amount { get; set; }       // fixed $
    public bool Taxable { get; set; } = true;
    public string? Scope { get; set; }
}

public class DiscountSetting
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public decimal? Percent { get; set; }      // e.g., 10
    public decimal? Amount { get; set; }       // fixed $
    public string? Scope { get; set; }
}