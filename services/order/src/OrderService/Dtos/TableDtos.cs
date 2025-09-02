namespace OrderService.Dtos;

public record CreateTableDto(int TableNumber, Guid? ServerId);

public record TableDto(Guid Id, int TableNumber, string Status, Guid? ActiveCartId, Guid? ServerId);

public record TableStatusDto(string Status);

public record AssignServerDto(Guid? ServerId);