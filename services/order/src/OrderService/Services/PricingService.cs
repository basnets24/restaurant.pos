using Microsoft.Extensions.Options;
using OrderService.Settings;

namespace OrderService.Services;

public interface IPricingService
{
    PricingBreakdown Calculate(decimal subtotal, decimal tip = 0m);
}

/// <summary>
/// All amounts are order-level and rounded to 2 decimals (AwayFromZero).
/// Discounts: NON-STACKING (use the single best rule).
/// Service charges: summed; taxable ones contribute to tax base.
/// Taxes: summed per line; no compounding.
/// </summary>
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
    private readonly IOptionsMonitor<PricingSettings> _pricing;
    public PricingService(IOptionsMonitor<PricingSettings> pricing) => _pricing = pricing;

    public PricingBreakdown Calculate(decimal subtotal, decimal tip = 0m)
    {
        var cfg = _pricing.CurrentValue ?? new PricingSettings();

        // -------- Discounts (NON-STACKING: pick single best rule) --------
        DiscountSetting? bestRule = null;
        decimal bestDiscountAmount = 0m;

        foreach (var rule in cfg.Discounts) // rule : DiscountSetting
        {
            var amount = Round((rule.Amount ?? 0m) + (subtotal * (rule.Percent ?? 0m) / 100m));
            if (amount > bestDiscountAmount)
            {
                bestDiscountAmount = amount;
                bestRule = rule; // OK: DiscountSetting -> DiscountSetting?
            }
        }

        var appliedDiscounts = new List<AppliedDiscount>(capacity: bestDiscountAmount > 0 ? 1 : 0);
        if (bestDiscountAmount > 0 && bestRule is not null)
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

        // -------- Service charges (order-level) --------
        decimal serviceChargeTotal = 0m;
        decimal taxableServiceCharges = 0m;
        var appliedServiceCharges = new List<ServiceCharge>();

        if (cfg.ServiceCharges is { Count: > 0 })
        {
            foreach (var sc in cfg.ServiceCharges)
            {
                var amt = Round((sc.Amount ?? 0m) + (subtotal * (sc.Percent ?? 0m) / 100m));
                if (amt <= 0) continue;

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
        }
        serviceChargeTotal = Round(serviceChargeTotal);
        taxableServiceCharges = Round(taxableServiceCharges);

        // -------- Tax base = (subtotal - discounts) + taxable service charges --------
        var taxableBase = Math.Max(0m, subtotal - discountTotal + taxableServiceCharges);

        // -------- Taxes (order-level) --------
        decimal taxTotal = 0m;
        var appliedTaxes = new List<AppliedTax>();

        if (cfg.Taxes is { Count: > 0 })
        {
            foreach (var t in cfg.Taxes)
            {
                var amt = Round((t.Amount ?? 0m) + (taxableBase * (t.RatePercent ?? 0m) / 100m));
                if (amt <= 0) continue;

                taxTotal += amt;
                appliedTaxes.Add(new AppliedTax(
                    Id: t.Id,
                    Name: t.Name,
                    RatePercent: t.RatePercent,
                    Amount: amt,
                    Scope: "Order"
                ));
            }
        }
        taxTotal = Round(taxTotal);

        // -------- Tip & Grand --------
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
