import { useAuth } from "@/api-authorization/AuthProvider";
import { useTenant } from "@/auth/tenant";
import { useEmployeeDomain } from "@/domain/employee/Provider";
import type { EmployeeDetailDto } from "@/domain/employee/api";

export function useUserDisplayName() {
  const { profile } = useAuth();
  const { rid } = useTenant();
  const userId = profile?.sub;
  const emp = useEmployeeDomain();
  const detail = emp.useEmployee(rid ?? "", userId ?? "", { enabled: !!rid && !!userId });
  const d = detail.data as EmployeeDetailDto | undefined;
  const displayName = (d?.displayName && d.displayName.trim().length > 0)
    ? d.displayName
    : profile?.name || "User";

  return { displayName, isLoading: detail.isLoading };
}
