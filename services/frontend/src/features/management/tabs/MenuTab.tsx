import MenuItemsCard from "@/features/management/components/MenuCard";
import { useCan } from "@/auth/permissions";
export default function MenuTab() {
    const canWrite = useCan("menuWrite");
    return (
        <>
            <h2 className="text-2xl font-bold text-foreground mb-5">Menu</h2>
            <MenuItemsCard canWrite={canWrite} />
        </>
    );
}
