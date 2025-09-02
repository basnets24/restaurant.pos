// Services/PricingService.cs
using Microsoft.Extensions.Options;
using OrderService;            // AppliedDiscount, AppliedTax, ServiceCharge (outputs)
using OrderService.Settings;   // DiscountSetting, TaxSetting, ServiceChargeSetting (inputs)

namespace OrderService.Services;

public interface IPricingService
{
    /// <summary>
    /// Compute order-level pricing from configuration (no per-item logic).
    /// Discounts are NON-STACKING (best single rule). Taxes are non-compounding.
    /// All money rounded to 2 decimals (AwayFromZero).
    /// </summary>
    PricingBreakdown Calculate(decimal subtotal, decimal tip = 0m, PricingContext? context = null);
}

// context type
public record PricingContext(int? GuestCount, bool DineIn);


// PricingService signature
public record PricingBreakdown(
    decimal Subtotal,
    decimal DiscountTotal,
    decimal ServiceChargeTotal,
    decimal TaxTotal,
    decimal Tip,
    decimal GrandTotal,
    IReadOnlyList<AppliedDiscount> AppliedDiscounts,
    IReadOnlyList<ServiceCharge>   ServiceCharges,
    IReadOnlyList<AppliedTax>      AppliedTaxes
);

public class PricingService : IPricingService
{
    private readonly int _minGuestLimit = 6;
    private readonly IOptionsMonitor<PricingSettings> _pricing;
    public PricingService(IOptionsMonitor<PricingSettings> pricing) => _pricing = pricing;

    public PricingBreakdown Calculate(decimal subtotal, decimal tip = 0m, PricingContext? ctx = null)
    {
        var cfg = _pricing.CurrentValue;

        // ---------- Discounts (NON-STACKING: pick best single rule) ----------
        DiscountSetting? bestRule = null;
        decimal bestDiscountAmount = 0m;

        foreach (var rule in cfg.Discounts)
        {
            var amount = Round((rule.Amount ?? 0m) + (subtotal * (rule.Percent ?? 0m) / 100m));
            if (amount > bestDiscountAmount)
            {
                bestDiscountAmount = amount;
                bestRule = rule;
            }
        }

        var appliedDiscounts = new List<AppliedDiscount>(bestDiscountAmount > 0 ? 1 : 0);
        if (bestRule is not null && bestDiscountAmount > 0m)
        {
            appliedDiscounts.Add(new AppliedDiscount(
                Id: bestRule.Id,
                Name: bestRule.Name,
                Percent: bestRule.Percent,
                Amount: bestDiscountAmount,
                Scope: "Order"
            ));
        }
        var discountTotal = bestDiscountAmount;

        // ---------- Service charges (sum); track taxable portion ----------
        decimal serviceChargeTotal = 0m;
        decimal taxableServiceCharges = 0m;
        var appliedServiceCharges = new List<ServiceCharge>();

        foreach (var sc in cfg.ServiceCharges )
        {
            
            if (sc.Name == "Auto Gratuity" && (ctx?.GuestCount ?? 0) < _minGuestLimit) continue;
            
            var amt = Round((sc.Amount ?? 0m) + (subtotal * (sc.Percent ?? 0m) / 100m));
            if (amt <= 0m) continue;

            serviceChargeTotal += amt;
            if (sc.Taxable) taxableServiceCharges += amt;

            appliedServiceCharges.Add(new ServiceCharge(
                Id: sc.Id,
                Name: sc.Name,
                Percent: sc.Percent,
                Amount: amt,
                Taxable: sc.Taxable,
                Scope: "Order"
            ));
        }
        serviceChargeTotal = Round(serviceChargeTotal);
        taxableServiceCharges = Round(taxableServiceCharges);

        // ---------- Taxable base = (subtotal - discounts) + taxable service charges ----------
        var taxableBase = Math.Max(0m, subtotal - discountTotal + taxableServiceCharges);

        // ---------- Taxes (sum per line; no compounding) ----------
        decimal taxTotal = 0m;
        var appliedTaxes = new List<AppliedTax>();

        foreach (var t in cfg.Taxes )
        {
            var amt = Round((t.Amount ?? 0m) + (taxableBase * (t.RatePercent ?? 0m) / 100m));
            if (amt <= 0m) continue;

            taxTotal += amt;
            appliedTaxes.Add(new AppliedTax(
                Id: t.Id,
                Name: t.Name,
                RatePercent: t.RatePercent,
                Amount: amt,
                Scope: "Order"
            ));
        }
        taxTotal = Round(taxTotal);

        // ---------- Tip & Grand ----------
        var tipRounded = Round(tip);
        var grand = Round(subtotal - discountTotal + serviceChargeTotal + taxTotal + tipRounded);

        return new PricingBreakdown(
            Subtotal: Round(subtotal),
            DiscountTotal: discountTotal,
            ServiceChargeTotal: serviceChargeTotal,
            TaxTotal: taxTotal,
            Tip: tipRounded,
            GrandTotal: grand,
            AppliedDiscounts: appliedDiscounts,
            ServiceCharges: appliedServiceCharges,
            AppliedTaxes: appliedTaxes
        );
    }

    private static decimal Round(decimal v) =>
        decimal.Round(v, 2, MidpointRounding.AwayFromZero);
}
