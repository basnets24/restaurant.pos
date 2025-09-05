namespace OrderService.Dtos;

public record PositionDto(double X, double Y);
public record SizeDto(double Width, double Height);


public record TableViewDto(
    Guid Id,
    string Number,
    string Section,
    int Seats,
    string Shape, // "round" | "square" | "rectangle" | "booth"
    string Status, // "available" | "occupied" | "reserved" | "dirty"
    PositionDto Position,
    SizeDto Size,
    int? PartySize,
    int Version,
    Guid? ActiveCartId,
    Guid? ServerId
);


public record CreateTableDto(
    string Number,
    string Section,
    int Seats,
    string Shape,
    PositionDto Position,
    SizeDto Size
);


public record UpdateTableLayoutDto(
    double X,
    double Y,
    double? Width,
    double? Height,
    double Rotation, // reserved for future use
    string Shape,
    int Version
);


public record BulkLayoutItemDto(
     Guid Id,
    double X,
    double Y,
    double? Width,
    double? Height,
    double Rotation,
    string Shape,
    int Version
);


public record BulkLayoutUpdateDto(
    IReadOnlyList<BulkLayoutItemDto> Items,
    int? PlanVersion // optional floor-plan wide concurrency
);


public record SetTableStatusDto(
    string Status, // available|reserved|dirty|occupied
    int? PartySize // required if status = occupied; cleared if available
);


public record LinkOrderDto(Guid OrderId);
public record SeatPartyDto(int PartySize, string? ServerId);


public record JoinTablesDto(IReadOnlyList<Guid> TableIds, string? GroupLabel);
public record SplitTablesDto(string GroupId);