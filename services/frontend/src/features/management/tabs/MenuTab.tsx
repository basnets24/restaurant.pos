import MenuItemsCard from "@/features/management/components/MenuCard";
export default function MenuTab() {
    return (
        <>
            <h2 className="text-2xl font-bold">Menu</h2>
            <MenuItemsCard canWrite />
        </>
    );
}
