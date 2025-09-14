import StaffUsersCard from "@/features/management/components/StaffCard";
import { useCan } from "@/auth/permissions";

export default function StaffTab() {
    const canManage = useCan("manageStaff");
    return (
        <>
            <h2 className="text-2xl font-bold text-foreground">Staff Management</h2>
            {!canManage ? (
                <div className="mt-4 text-sm text-muted-foreground">You do not have permission to manage staff. Contact an administrator if you need access.</div>
            ) : (
                <StaffUsersCard />
            )}
        </>
    );
}
