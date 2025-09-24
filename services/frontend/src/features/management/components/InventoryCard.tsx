import { useEffect, useState } from "react";
import type { InventoryItemDto } from "@/domain/inventory/types";
import { useInventoryItems, useUpdateInventoryItem, useAdjustInventoryQuantity } from "@/domain/inventory/hooks";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { useCan } from "@/auth/permissions";

export default function InventoryStockCard() {
    const { data, isLoading } = useInventoryItems();
    const canWrite = useCan("inventoryWrite");

    const items: InventoryItemDto[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
            ? ((data as any).items as InventoryItemDto[])
            : [];

    const updateMut = useUpdateInventoryItem();
    const adjustMut = useAdjustInventoryQuantity();

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Inventory</CardTitle>
                    <CardDescription>Seeded from Menu items. Quantity starts at 0. Orders decrement stock.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!canWrite && (
                    <div className="text-xs text-muted-foreground">You have read-only access to inventory.</div>
                )}
                <div className="rounded-2xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="w-24 text-right">Qty</TableHead>
                                <TableHead>Available</TableHead>
                                <TableHead>Acquired</TableHead>
                                {canWrite && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
                            {!isLoading && items.length === 0 && <TableRow><TableCell colSpan={canWrite ? 5 : 4}>No inventory items</TableCell></TableRow>}
                            {items.map((it) => (
                                <InventoryRow
                                    key={it.id}
                                    it={it}
                                    busy={updateMut.isPending || adjustMut.isPending}
                                    canWrite={canWrite}
                                    onUpdate={(dto) =>
                                        updateMut.mutate(
                                            { id: it.id, dto, menuItemId: it.menuItemId } as any,
                                            {
                                                onSuccess: () => {
                                                    const msg =
                                                        dto.quantity !== undefined
                                                            ? `Quantity set to ${dto.quantity}`
                                                            : dto.isAvailable !== undefined
                                                                ? `Marked as ${dto.isAvailable ? "Available" : "Hidden"}`
                                                                : "Inventory updated";
                                                    toast.success(msg);
                                                },
                                            }
                                        )
                                    }
                                    onAdjust={(delta) =>
                                        adjustMut.mutate(
                                            { id: it.id, delta, menuItemId: it.menuItemId } as any,
                                            {
                                                onSuccess: () => toast.success(delta > 0 ? "Quantity +1" : "Quantity −1"),
                                            }
                                        )
                                    }
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function InventoryRow({ it, onUpdate, onAdjust, busy, canWrite }: {
    it: InventoryItemDto;
    onUpdate: (dto: { quantity?: number; isAvailable?: boolean }) => void;
    onAdjust: (delta: number) => void;
    busy?: boolean;
    canWrite: boolean;
}) {
    const [qtyEdit, setQtyEdit] = useState<string>(String(it.quantity ?? 0));
    // Keep input in sync with server updates
    useEffect(() => {
        setQtyEdit(String(it.quantity ?? 0));
    }, [it.quantity]);
    const qty = Number.isFinite(Number(qtyEdit)) ? Math.max(0, Number(qtyEdit)) : it.quantity;

    return (
        <TableRow>
            <TableCell>
                <div className="font-medium">{it.menuItemName}</div>
                <div className="text-xs opacity-70">Menu #{it.menuItemId.slice(0, 8)}</div>
            </TableCell>
            <TableCell className="text-right">
                {canWrite ? (
                    <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="outline" onClick={() => onAdjust(-1)} disabled={busy} aria-label="Decrease quantity">−</Button>
                        <Input className="w-16 text-right" value={qtyEdit} onChange={(e) => setQtyEdit(e.target.value)} />
                        <Button size="icon" variant="outline" onClick={() => onAdjust(1)} disabled={busy} aria-label="Increase quantity">+</Button>
                    </div>
                ) : (
                    <div className="text-right font-medium">{it.quantity ?? 0}</div>
                )}
            </TableCell>
            <TableCell>
                {canWrite ? (
                    <div className="flex items-center gap-2">
                        <Switch checked={it.isAvailable} onCheckedChange={(v) => onUpdate({ isAvailable: v })} disabled={busy} />
                        <Badge variant={it.isAvailable ? "default" : "secondary"}>{it.isAvailable ? "Available" : "Hidden"}</Badge>
                    </div>
                ) : (
                    <Badge variant={it.isAvailable ? "default" : "secondary"}>{it.isAvailable ? "Available" : "Hidden"}</Badge>
                )}
            </TableCell>
            <TableCell>{new Date(it.acquiredDate).toLocaleString()}</TableCell>
            {canWrite && (
                <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => onUpdate({ quantity: qty })} disabled={busy}>Set</Button>
                    <Button size="sm" variant="outline" onClick={() => onUpdate({ quantity: 0 })} disabled={busy}>Zero</Button>
                </TableCell>
            )}
        </TableRow>
    );
}
