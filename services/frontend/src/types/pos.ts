export type TableStatus = "available" | "reserved" | "occupied" | "dirty";

export interface Vec2 { x: number; y: number; }
export interface Size { width: number; height: number; }


export interface Table {
    id: string;  number: string;  section: string;  seats: number;
    shape: "round" | "square" | "rectangle" | "booth";
    status: TableStatus;
    position: { x: number; y: number };
    size: { width: number; height: number };
    partySize?: number;
    version: number;
    activeCartId?: string | null;
    serverId?: string | null;
}

export interface MenuItem {
    id: string;              // GUID
    name: string;
    category: string;
    description: string;
    price: number;
}

export interface OrderItem {
    id: string;              // line item GUID
    menuItem: MenuItem;
    quantity: number;
    notes?: string;
}

export type OrderStatus = "open" | "paid" | "void";

export interface Order {
    id: string;              // GUID
    tableId: string;         // Table.id
    items: OrderItem[];
    total: number;           // derived sum
    status: OrderStatus;
    createdAt?: string;      // ISO if you want
}
