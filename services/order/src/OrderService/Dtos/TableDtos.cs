namespace OrderService.Dtos;

public record CreateTableDto(int TableNumber);
public record TableDto(Guid Id, int TableNumber, string Status, Guid? ActiveCartId);