import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import type { Table } from "../types/pos";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import {
    Users,
    Clock,
    CheckCircle,
    AlertTriangle,
    UserPlus,
    Eye,
    RefreshCw,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Settings,
    Grid3X3,
    Move,
} from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "./ui/context-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
let DndProvider: any,
    useDrag: any,
    useDrop: any,
    HTML5Backend: any;

try {
    const dnd = require("react-dnd");
    const backend = require("react-dnd-html5-backend");
    DndProvider = dnd.DndProvider;
    useDrag = dnd.useDrag;
    useDrop = dnd.useDrop;
    HTML5Backend = backend.HTML5Backend;
} catch (error) {
    // Fallback for environments where react-dnd is not available
    DndProvider = ({
                       children,
                   }: {
        children: React.ReactNode;
    }) => <>{children}</>;
    useDrag = () => [{ isDragging: false }, () => {}];
    useDrop = () => [
        { isOver: false, draggedItem: null },
        () => {},
    ];
    HTML5Backend = null;
}

interface DraggableTableManagementViewProps {
    tables: Table[];
    onSelectTable: (table: Table) => void;
    onUpdateTableStatus: (
        tableId: string,
        status: Table["status"],
        partySize?: number,
    ) => void;
    onUpdateTables: (tables: Table[]) => void;
}

// Grid configuration
const GRID_SIZE = 20; 
//const SNAP_THRESHOLD = 10;


const STATUS_COLORS = {
    available: "border-2 text-white shadow-md",
    occupied: "border-2 text-white shadow-md",
    reserved: "border-2 text-white shadow-md",
    dirty: "border-2 text-white shadow-md",
};

const STATUS_STYLES = {
    available: {
        backgroundColor: "var(--table-available)",
        borderColor: "var(--table-available-border)",
    },
    occupied: {
        backgroundColor: "var(--table-occupied)",
        borderColor: "var(--table-occupied-border)",
    },
    reserved: {
        backgroundColor: "var(--table-reserved)",
        borderColor: "var(--table-reserved-border)",
    },
    dirty: {
        backgroundColor: "var(--table-dirty)",
        borderColor: "var(--table-dirty-border)",
    },
};

const STATUS_ICONS = {
    available: CheckCircle,
    occupied: Users,
    reserved: Clock,
    dirty: AlertTriangle,
};

// Draggable Table Component
function DraggableTable({
                            table,
    
                            onStatusChange,
                            onSeatParty,
                            onViewOrder,
                            isDesignMode,
    
                        }: {
    table: Table;
    onMove: (
        id: string,
        position: { x: number; y: number },
    ) => void;
    onStatusChange: (
        table: Table,
        status: Table["status"],
    ) => void;
    onSeatParty: (table: Table) => void;
    onViewOrder: (table: Table) => void;
    isDesignMode: boolean;
    zoom: number;
    isDragging: boolean;
}) {
    const StatusIcon = STATUS_ICONS[table.status];

    const [{ isDragging }, drag] = useDrag(
        () => ({
            type: "table",
            item: { id: table.id, position: table.position },
            canDrag: isDesignMode,
            collect: (monitor: { isDragging: () => any; }) => ({
                isDragging: monitor.isDragging(),
            }),
        }),
        [isDesignMode, table.position],
    );

    

    const baseClasses = `absolute cursor-pointer transition-all duration-200 flex items-center justify-center select-none
    ${isDragging ? "opacity-70 scale-110 z-50 table-dragging" : "hover:scale-105 hover:shadow-lg z-10"}
    ${isDesignMode ? "cursor-move table-design-mode" : "cursor-pointer"}
    ${STATUS_COLORS[table.status]} rounded-lg`;

    const style = {
        left: `${table.position.x}px`,
        top: `${table.position.y}px`,
        width: `${table.size.width}px`,
        height: `${table.size.height}px`,
        transform: isDragging
            ? "rotate(3deg) scale(1.05)"
            : "rotate(0deg) scale(1)",
        filter: isDragging
            ? "drop-shadow(0 10px 20px rgba(0,0,0,0.3))"
            : "none",
        ...STATUS_STYLES[table.status],
    };

    const content = (
        <div className="text-center pointer-events-none">
        <div className="flex items-center justify-center mb-1">
        <StatusIcon className="h-4 w-4" />
            </div>
            <div className="font-bold text-sm">{table.number}</div>
        <div className="text-xs opacity-90">
        {table.seats} seats
    </div>
    {table.partySize && (
        <div className="text-xs opacity-90">
            Party: {table.partySize}
        </div>
    )}
    {isDesignMode && (
        <div className="text-xs opacity-75 flex items-center justify-center mt-1">
        <Move className="h-3 w-3" />
            </div>
    )}
    </div>
);

    if (isDesignMode) {
        return (
            <div
                ref={drag}
        className={`${baseClasses} ${table.shape === "round" ? "rounded-full" : table.shape === "booth" ? "rounded-xl border-l-4" : "rounded-lg"}`}
        style={style}
            >
            {content}
            </div>
    );
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    className={`${baseClasses} ${table.shape === "round" ? "rounded-full" : table.shape === "booth" ? "rounded-xl border-l-4" : "rounded-lg"}`}
    style={style}
        >
        {content}
        </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
    <ContextMenuItem
        onClick={() => onSeatParty(table)}
    disabled={table.status === "occupied"}
    >
    <UserPlus className="mr-2 h-4 w-4" />
        Seat Party
    </ContextMenuItem>
    <ContextMenuItem
    onClick={() => onViewOrder(table)}
    disabled={table.status !== "occupied"}
    >
    <Eye className="mr-2 h-4 w-4" />
        View Order
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem
        onClick={() => onStatusChange(table, "available")}
    disabled={table.status === "available"}
    >
    <CheckCircle className="mr-2 h-4 w-4" />
        Mark Available
    </ContextMenuItem>
    <ContextMenuItem
    onClick={() => onStatusChange(table, "reserved")}
    disabled={table.status === "reserved"}
    >
    <Clock className="mr-2 h-4 w-4" />
        Mark Reserved
    </ContextMenuItem>
    <ContextMenuItem
    onClick={() => onStatusChange(table, "dirty")}
    disabled={table.status === "dirty"}
    >
    <RefreshCw className="mr-2 h-4 w-4" />
        Needs Cleaning
    </ContextMenuItem>
    </ContextMenuContent>
    </ContextMenu>
);
}

// Drop Zone Component
function FloorPlanDropZone({
                               children,
                               onTableMove,
                               showGrid,
                               zoom,
                               pan,
                               onPanChange,
                               onZoomChange,
                               isDesignMode,
                           }: {
    children: React.ReactNode;
    onTableMove: (
        id: string,
        position: { x: number; y: number },
    ) => void;
    showGrid: boolean;
    zoom: number;
    pan: { x: number; y: number };
    onPanChange: (pan: { x: number; y: number }) => void;
    onZoomChange: (zoom: number) => void;
    isDesignMode: boolean;
}) {
    const dropRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPosition, setLastPanPosition] = useState({
        x: 0,
        y: 0,
    });

    const snapToGrid = useCallback((x: number, y: number) => {
        return {
            x: Math.round(x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(y / GRID_SIZE) * GRID_SIZE,
        };
    }, []);

    const [{ isOver, draggedItem }, drop] = useDrop(
        () => ({
            accept: "table",
            drop: (
                item: {
                    id: string;
                    position: { x: number; y: number };
                },
                monitor: { getClientOffset: () => any; },
            ) => {
                if (!dropRef.current) return;

                const offset = monitor.getClientOffset();
                const containerRect =
                    dropRef.current.getBoundingClientRect();

                if (offset) {
                    const adjustedX =
                        (offset.x - containerRect.left - pan.x) / zoom;
                    const adjustedY =
                        (offset.y - containerRect.top - pan.y) / zoom;

                    const snappedPosition = snapToGrid(
                        adjustedX,
                        adjustedY,
                    );
                    onTableMove(item.id, snappedPosition);
                }
            },
            collect: (monitor: { isOver: () => any; getItem: () => any; }) => ({
                isOver: monitor.isOver(),
                draggedItem: monitor.getItem(),
            }),
        }),
        [onTableMove, snapToGrid, zoom, pan],
    );

    // Handle mouse events for panning
    const handleMouseDown = (e: React.MouseEvent) => {
        if (
            isDesignMode &&
            e.button === 0 &&
            !(e.target as HTMLElement).closest("[data-table]")
        ) {
            setIsPanning(true);
            setLastPanPosition({ x: e.clientX, y: e.clientY });
            e.preventDefault();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const deltaX = e.clientX - lastPanPosition.x;
            const deltaY = e.clientY - lastPanPosition.y;

            onPanChange({
                x: pan.x + deltaX,
                y: pan.y + deltaY,
            });

            setLastPanPosition({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Handle wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        if (isDesignMode && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const zoomDelta = e.deltaY > 0 ? -0.05 : 0.05;
            const newZoom = Math.max(
                0.5,
                Math.min(2, zoom + zoomDelta),
            );

            if (newZoom !== zoom) {
                // Zoom towards mouse position
                const rect = dropRef.current?.getBoundingClientRect();
                if (rect) {
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;

                    const zoomRatio = newZoom / zoom;
                    const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
                    const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

                    onPanChange({ x: newPanX, y: newPanY });
                }

                onZoomChange(newZoom);
            }
        }
    };

    // Grid overlay
    const renderGrid = () => {
        if (!showGrid || !isDesignMode) return null;

        const gridLines = [];
        const containerWidth = 1000;
        const containerHeight = 800;

        // Vertical lines
        for (let x = 0; x <= containerWidth; x += GRID_SIZE) {
            gridLines.push(
                <line
                    key={`v-${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={containerHeight}
            stroke="var(--border)"
            strokeWidth={0.5}
            opacity={0.3}
            />,
        );
        }

        // Horizontal lines
        for (let y = 0; y <= containerHeight; y += GRID_SIZE) {
            gridLines.push(
                <line
                    key={`h-${y}`}
            x1={0}
            y1={y}
            x2={containerWidth}
            y2={y}
            stroke="var(--border)"
            strokeWidth={0.5}
            opacity={0.3}
            />,
        );
        }

        return (
            <svg
                className="absolute inset-0 pointer-events-none"
        width={containerWidth}
        height={containerHeight}
        style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
        }}
    >
        {gridLines}
        </svg>
    );
    };

    drop(dropRef);

    return (
        <div
            ref={dropRef}
    className={`relative bg-background border-2 rounded-lg overflow-hidden transition-all duration-200
        ${isOver ? "border-primary bg-primary/5" : isDesignMode ? "border-primary/50" : "border-border"} 
        ${isPanning ? "cursor-grabbing" : isDesignMode ? "cursor-grab" : ""}
        ${isDesignMode ? "floor-plan-container design-mode" : "floor-plan-container"}
      `}
    style={{
        width: "100%",
            height: "800px",
            minWidth: "1000px",
    }}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={() => setIsPanning(false)}
    onWheel={handleWheel}
        >
        {renderGrid()}

        <div
    className="absolute inset-0"
    style={{
        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "0 0",
    }}
>
    {children}
    </div>

    {/* Snap indicators during drag */}
    {isOver && draggedItem && isDesignMode && (
        <>
            <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-full h-full bg-primary/5 border-2 border-primary border-dashed rounded-lg" />
            </div>

        {/* Show nearest snap points */}
        <div className="absolute inset-0 pointer-events-none">
            {Array.from(
                    { length: Math.floor(1000 / GRID_SIZE) },
                    (_, i) =>
                        Array.from(
                            { length: Math.floor(800 / GRID_SIZE) },
                            (_, j) => (
                                <div
                                    key={`${i}-${j}`}
        className="absolute w-2 h-2 bg-primary rounded-full opacity-30"
        style={{
        left: `${i * GRID_SIZE - 4}px`,
            top: `${j * GRID_SIZE - 4}px`,
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
    }}
        />
    ),
    ),
    )}
        </div>
        </>
    )}
    </div>
);
}

export function DraggableTableManagementView({
                                                 tables: propTables,
                                                 onSelectTable,
                                                 onUpdateTableStatus,
                                                 onUpdateTables,
                                             }: DraggableTableManagementViewProps) {
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTableForAction, setSelectedTableForAction] =
        useState<Table | null>(null);
    const [showSeatDialog, setShowSeatDialog] = useState(false);
    const [partySize, setPartySize] = useState("");
    const [isDesignMode, setIsDesignMode] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // Initialize tables if not provided
    useEffect(() => {
        setTables(propTables);
    }, [propTables]);

    const handleTableMove = useCallback(
        (
            tableId: string,
            newPosition: { x: number; y: number },
        ) => {
            setTables((prev) => {
                const updated = prev.map((table) =>
                    table.id === tableId
                        ? { ...table, position: newPosition }
                        : table,
                );
                onUpdateTables(updated);
                return updated;
            });

            toast.success(
                `Table ${tables.find((t) => t.id === tableId)?.number} repositioned`,
                {
                    description: `Snapped to grid position (${newPosition.x}, ${newPosition.y})`,
                },
            );
        },
        [onUpdateTables],
    );

    const handleSeatParty = (table: Table) => {
        setSelectedTableForAction(table);
        setShowSeatDialog(true);
    };

    const confirmSeatParty = () => {
        if (selectedTableForAction && partySize) {
            onUpdateTableStatus(
                selectedTableForAction.id,
                "occupied",
                parseInt(partySize),
            );
            
            toast.success(
                `Seated party of ${partySize} at Table ${selectedTableForAction.number}`,
            );

            setShowSeatDialog(false);
            setPartySize("");
            setSelectedTableForAction(null);
        }
    };

    const handleStatusChange = (
        table: Table,
        newStatus: Table["status"],
    ) => {
        onUpdateTableStatus(table.id, newStatus);
        setTables((prev) =>
            prev.map((t) =>
                t.id === table.id
                    ? {
                        ...t,
                        status: newStatus,
                        partySize:
                            newStatus === "available"
                                ? undefined
                                : t.partySize,
                    }
                    : t,
            ),
        );

        const statusMessages = {
            available: `Table ${table.number} marked as available`,
            reserved: `Table ${table.number} marked as reserved`,
            dirty: `Table ${table.number} marked for cleaning`,
            occupied: `Table ${table.number} marked as occupied`,
        };

        // @ts-ignore
        toast.success(statusMessages[newStatus]);
    };

    const handleViewOrder = (table: Table) => {
        if (table.status === "occupied") {
            onSelectTable(table);
        }
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.1, 2));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.1, 0.5));
    };

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const getStatusCounts = () => {
        return tables.reduce(
            (acc, table) => {
                acc[table.status] = (acc[table.status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );
    };

    const statusCounts = getStatusCounts();

    return (
        <DndProvider backend={HTML5Backend}>
        <div className="w-full max-w-7xl mx-auto">
        <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
        <div>
            <h2 className="text-3xl mb-2 text-foreground">
            Restaurant Floor Plan
    </h2>
    <p className="text-muted-foreground text-lg">
    {isDesignMode
        ? "Drag tables to rearrange • Hold Ctrl/Cmd + Scroll to zoom • Drag background to pan"
        : "Right-click tables to manage seating and status"}
    </p>
    </div>

    <div className="flex items-center gap-4">
    <div className="flex items-center gap-2">
    <Label htmlFor="design-mode">Design Mode</Label>
    <Switch
    id="design-mode"
    checked={isDesignMode}
    onCheckedChange={setIsDesignMode}
    />
    </div>

    {isDesignMode && (
        <div className="flex items-center gap-2">
        <Label htmlFor="show-grid">Grid</Label>
            <Switch
        id="show-grid"
        checked={showGrid}
        onCheckedChange={setShowGrid}
        />
        </div>
    )}
    </div>
    </div>

    {/* Status Overview */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <Card className="text-center">
    <CardContent className="p-4">
    <div className="flex items-center justify-center gap-2 mb-2">
    <CheckCircle
        className="h-5 w-5"
    style={{ color: "var(--table-available)" }}
    />
    <span className="font-medium">Available</span>
        </div>
        <div
    className="text-2xl font-bold"
    style={{ color: "var(--table-available)" }}
>
    {statusCounts.available || 0}
    </div>
    </CardContent>
    </Card>

    <Card className="text-center">
    <CardContent className="p-4">
    <div className="flex items-center justify-center gap-2 mb-2">
    <Users
        className="h-5 w-5"
    style={{ color: "var(--table-occupied)" }}
    />
    <span className="font-medium">Occupied</span>
        </div>
        <div
    className="text-2xl font-bold"
    style={{ color: "var(--table-occupied)" }}
>
    {statusCounts.occupied || 0}
    </div>
    </CardContent>
    </Card>

    <Card className="text-center">
    <CardContent className="p-4">
    <div className="flex items-center justify-center gap-2 mb-2">
    <Clock
        className="h-5 w-5"
    style={{ color: "var(--table-reserved)" }}
    />
    <span className="font-medium">Reserved</span>
        </div>
        <div
    className="text-2xl font-bold"
    style={{ color: "var(--table-reserved)" }}
>
    {statusCounts.reserved || 0}
    </div>
    </CardContent>
    </Card>

    <Card className="text-center">
    <CardContent className="p-4">
    <div className="flex items-center justify-center gap-2 mb-2">
    <AlertTriangle
        className="h-5 w-5"
    style={{ color: "var(--table-dirty)" }}
    />
    <span className="font-medium">
        Need Cleaning
    </span>
    </div>
    <div
    className="text-2xl font-bold"
    style={{ color: "var(--table-dirty)" }}
>
    {statusCounts.dirty || 0}
    </div>
    </CardContent>
    </Card>
    </div>
    </div>

    {/* Floor Plan */}
    <Card className="shadow-lg border-border">
    <CardHeader className="bg-accent/30 border-b border-border">
    <CardTitle className="flex items-center justify-between">
    <span className="flex items-center gap-2">
        {isDesignMode ? (
                <Settings className="h-5 w-5" />
            ) : (
                <Grid3X3 className="h-5 w-5" />
            )}
    {isDesignMode
        ? "Layout Designer"
        : "Dining Room Floor Plan"}
    </span>

    <div className="flex items-center gap-2">
    <Button
        variant="outline"
    size="sm"
    onClick={handleZoomOut}
    disabled={zoom <= 0.5}
>
    <ZoomOut className="h-4 w-4" />
        </Button>

        <Badge variant="outline" className="px-3 py-1">
        {Math.round(zoom * 100)}%
        </Badge>

        <Button
    variant="outline"
    size="sm"
    onClick={handleZoomIn}
    disabled={zoom >= 2}
>
    <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
    variant="outline"
    size="sm"
    onClick={resetView}
    >
    <RotateCcw className="h-4 w-4" />
        </Button>

        <Badge variant="outline">
        {tables.length} tables
    </Badge>
    </div>
    </CardTitle>
    </CardHeader>
    <CardContent className="p-8">
        {isDesignMode && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4" />
            <span className="font-medium">
                Layout Designer Active
    </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div>• Drag tables to reposition</div>
    <div>• Tables snap to grid automatically</div>
    <div>• Ctrl/Cmd + Scroll to zoom</div>
    </div>
    </div>
)}

    <FloorPlanDropZone
        onTableMove={handleTableMove}
    showGrid={showGrid}
    zoom={zoom}
    pan={pan}
    onPanChange={setPan}
    onZoomChange={setZoom}
    isDesignMode={isDesignMode}
        >
        {/* Section Labels */}
        <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm font-medium pointer-events-none">
        Window Side
    </div>
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm font-medium pointer-events-none">
        Center Dining
    </div>
    <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm font-medium pointer-events-none">
        Bar Area
    </div>
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm font-medium pointer-events-none">
        Patio / Booths
        </div>

    {/* Render Tables */}
    {tables.map((table) => (
        <div key={table.id} data-table>
    <DraggableTable
        table={table}
        onMove={handleTableMove}
        onStatusChange={handleStatusChange}
        onSeatParty={handleSeatParty}
        onViewOrder={handleViewOrder}
        isDesignMode={isDesignMode}
        zoom={zoom}
        isDragging={false}
        />
        </div>
    ))}
    </FloorPlanDropZone>
    </CardContent>
    </Card>

    {/* Seat Party Dialog */}
    <Dialog
        open={showSeatDialog}
    onOpenChange={setShowSeatDialog}
        >
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    Seat Party at Table{" "}
    {selectedTableForAction?.number}
    </DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
    <div>
        <Label htmlFor="party-size">Party Size</Label>
    <Input
    id="party-size"
    type="number"
    placeholder="Enter number of guests"
    value={partySize}
    onChange={(e) => setPartySize(e.target.value)}
    min="1"
    max={selectedTableForAction?.seats || 10}
    />
    <p className="text-sm text-muted-foreground mt-1">
        Maximum capacity:{" "}
    {selectedTableForAction?.seats} seats
    </p>
    </div>
    <div className="flex gap-3 justify-end">
    <Button
        variant="outline"
    onClick={() => setShowSeatDialog(false)}
>
    Cancel
    </Button>
    <Button
    onClick={confirmSeatParty}
    disabled={
    !partySize || parseInt(partySize) < 1
}
>
    Seat Party
    </Button>
    </div>
    </div>
    </DialogContent>
    </Dialog>
    </div>
    </DndProvider>
);
}

// --- PAGE WRAPPER: feeds API/SignalR data into the draggable view ---
import { useTables } from "../hooks/useTables";
import type { Table as TableType } from "../types/pos";

export default function TablesView() {
    const { tables, setTables, updateStatus, seat, persistMove } = useTables();

    const onUpdateTables = (updated: TableType[]) => {
        const before = new Map(tables.map(t => [t.id, t]));
        const moved = updated.find(t => {
            const prev = before.get(t.id);
            return prev && (prev.position.x !== t.position.x || prev.position.y !== t.position.y);
        });
        setTables(updated);
        if (moved) void persistMove(moved);
    };

    const onUpdateTableStatus = (tableId: string, status: TableType["status"], partySize?: number) => {
        if (status === "occupied" && typeof partySize === "number") {
            return void seat(tableId, partySize);
        }
        return void updateStatus(tableId, status, partySize);
    };

    const onSelectTable = (t: TableType) => {
        // hook into your POS Shell navigation here if desired
        console.log("open order/cart for table", t);
    };

    return (
        <DraggableTableManagementView
            tables={tables}
            onSelectTable={onSelectTable}
            onUpdateTableStatus={onUpdateTableStatus}
            onUpdateTables={onUpdateTables}
        />
    );
}
