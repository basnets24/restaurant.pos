using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Services;

namespace OrderService.Mappers;

public static class CartMappings
{
     
    public static CartDto ToDto(
        this Cart cart,
        IPricingService pricing,
        bool includeEstimateWhenEmpty = false)
    {
        var subtotal = cart.Items.Sum(i => i.UnitPrice * i.Quantity);

        // If empty and you don't want an estimate yet, return without it.
        if (!cart.Items.Any() && !includeEstimateWhenEmpty)
        {
            return new CartDto(
                Id: cart.Id,
                TableId: cart.TableId,
                CustomerId: cart.CustomerId,
                ServerId: cart.ServerId,
                GuestCount: cart.GuestCount,
                Items: cart.Items.Select(i => new CartItemDto(
                    i.MenuItemId, i.MenuItemName, i.Quantity, i.UnitPrice, i.Notes)).ToList(),
                CreatedAt: cart.CreatedAt
            )
            {
                Estimate = null
            };
        }

        // Otherwise compute the estimate
        var b = pricing.Calculate(subtotal);
        var estimate = new CartEstimateDto(
            Subtotal: b.Subtotal,
            DiscountTotal: b.DiscountTotal,
            ServiceChargeTotal: b.ServiceChargeTotal,
            TaxTotal: b.TaxTotal,
            GrandTotal: b.GrandTotal,
            AppliedDiscounts: b.AppliedDiscounts,
            ServiceCharges: b.ServiceCharges,
            AppliedTaxes: b.AppliedTaxes
        );

        return new CartDto(
            Id: cart.Id,
            TableId: cart.TableId,
            CustomerId: cart.CustomerId,
            ServerId: cart.ServerId,
            GuestCount: cart.GuestCount,
            Items: cart.Items.Select(i => new CartItemDto(
                i.MenuItemId, i.MenuItemName, i.Quantity, i.UnitPrice, i.Notes)).ToList(),
            CreatedAt: cart.CreatedAt
        )
        {
            Estimate = estimate
        };
    }
}