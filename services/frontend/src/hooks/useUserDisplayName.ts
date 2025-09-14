import { useAuth } from "@/api-authorization/AuthProvider";
import { useTenant } from "@/app/TenantContext";
import { useEmployeeDomain } from "@/domain/employee/Provider";
import type { EmployeeDetailDto } from "@/domain/employee/api";

export function useUserDisplayName() {
  const { profile } = useAuth();
  const { rid } = useTenant();
  const userId = (profile as any)?.sub as string | undefined;
  const emp = useEmployeeDomain();
  const detail = emp.useEmployee(rid ?? "", userId ?? "", { enabled: !!rid && !!userId });
  const d = detail.data as EmployeeDetailDto | undefined;
  const displayName = (d?.displayName && d.displayName.trim().length > 0)
    ? d.displayName
    : ((profile as any)?.name as string) || "User";

  return { displayName, isLoading: detail.isLoading };
}
