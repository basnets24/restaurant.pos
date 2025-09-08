import { useAuth } from "@/api-authorization/AuthProvider";
import { useTenant } from "@/app/TenantContext";
import { useEmployeeDomain } from "@/domain/employee/Provider";

export function useUserDisplayName() {
  const { profile } = useAuth();
  const { rid } = useTenant();
  const userId = (profile as any)?.sub as string | undefined;
  const emp = useEmployeeDomain();
  const detail = emp.useEmployee(rid ?? "", userId ?? "", { enabled: !!rid && !!userId });

  const displayName = (detail.data?.displayName && detail.data.displayName.trim().length > 0)
    ? detail.data.displayName
    : "User";

  return { displayName, isLoading: detail.isLoading };
}

