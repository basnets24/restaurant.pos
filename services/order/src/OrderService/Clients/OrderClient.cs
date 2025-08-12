using OrderService.Dtos;

namespace OrderService.Clients;

public class OrderClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OrderClient> _logger;

    public OrderClient(HttpClient httpClient, ILogger<OrderClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<OrderDto> SubmitOrderAsync(FinalizeOrderDto dto)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("/orders", dto);
            response.EnsureSuccessStatusCode();

            var createdOrder = await response.Content.ReadFromJsonAsync<OrderDto>();
            if (createdOrder is null)
            {
                _logger.LogError("Failed to parse OrderDto from OrderService response");
                throw new Exception("Invalid order response");
            }

            return createdOrder;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to submit order to OrderService");
            throw;
        }
    }
}