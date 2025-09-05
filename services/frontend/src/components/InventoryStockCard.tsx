import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { InventoryItems, type InventoryItemDto } from "../services/inventory.items";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Package } from "lucide-react";

export default function InventoryStockCard() {
    const qc = useQueryClient();

    const { data, isLoading } = useQuery<InventoryItemDto[]>({
        queryKey: ["inventory", "items"],
        queryFn: InventoryItems.list,
        placeholderData: keepPreviousData,
    });

    const items = data ?? [];

    const updateMut = useMutation({
        mutationFn: async ({ id, dto }: { id: string; dto: { quantity?: number; isAvailable?: boolean } }) => {
            await InventoryItems.update(id, dto);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory", "items"] }),
    });

    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5"/> Inventory</CardTitle>
                    <CardDescription>Seeded from Menu items. Quantity starts at 0. Orders decrement stock.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-2xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="w-24 text-right">Qty</TableHead>
                                <TableHead>Available</TableHead>
                                <TableHead>Acquired</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
                            {!isLoading && items.length === 0 && <TableRow><TableCell colSpan={5}>No inventory items</TableCell></TableRow>}
                            {items.map((it) => (
                                <InventoryRow key={it.id} it={it} onUpdate={(dto) => updateMut.mutate({ id: it.id, dto })} />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function InventoryRow({ it, onUpdate }: { it: InventoryItemDto; onUpdate: (dto: { quantity?: number; isAvailable?: boolean }) => void }) {
    const [qtyEdit, setQtyEdit] = useState<string>(String(it.quantity ?? 0));
    const qty = Number.isFinite(Number(qtyEdit)) ? Math.max(0, Number(qtyEdit)) : it.quantity;

    return (
        <TableRow>
            <TableCell>
                <div className="font-medium">{it.menuItemName}</div>
                <div className="text-xs opacity-70">Menu #{it.menuItemId.slice(0, 8)}</div>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button size="icon" variant="outline" onClick={() => onUpdate({ quantity: Math.max(0, it.quantity - 1) })}>−</Button>
                    <Input className="w-16 text-right" value={qtyEdit} onChange={(e) => setQtyEdit(e.target.value)} />
                    <Button size="icon" variant="outline" onClick={() => onUpdate({ quantity: (it.quantity ?? 0) + 1 })}>+</Button>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Switch checked={it.isAvailable} onCheckedChange={(v) => onUpdate({ isAvailable: v })} />
                    <Badge variant={it.isAvailable ? "default" : "secondary"}>{it.isAvailable ? "Available" : "Hidden"}</Badge>
                </div>
            </TableCell>
            <TableCell>{new Date(it.acquiredDate).toLocaleString()}</TableCell>
            <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => onUpdate({ quantity: qty })}>Set</Button>
                <Button size="sm" variant="outline" onClick={() => onUpdate({ quantity: 0 })}>Zero</Button>
            </TableCell>
        </TableRow>
    );
}