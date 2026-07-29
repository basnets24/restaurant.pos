import InventoryStockCard from "@/features/management/components/InventoryCard";
export default function InventoryTab() {
    return (
        <>
            <h2 className="text-2xl font-bold text-foreground mb-5">Inventory Management</h2>
            <InventoryStockCard />
        </>
    );
}
