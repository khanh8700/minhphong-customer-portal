import { cookies } from "next/headers";
import { getContractByToken, resolveErpEnvironment, ErpEnvironment } from "@/lib/erp-api";
import { ContractSignClient } from "@/components/contracts/ContractSignClient";

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContractSigningPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const sParams = await searchParams;
  const cookieStore = await cookies();

  // Ưu tiên: 1. Tham số ?env=..., 2. Cookie erp_target_env, 3. Mặc định
  const queryEnv = typeof sParams.env === "string" ? sParams.env : null;
  const cookieEnv = cookieStore.get("erp_target_env")?.value || null;
  const targetEnv = resolveErpEnvironment(queryEnv || cookieEnv);

  let initialContract = null;
  let initialError = null;
  let resolvedEnv: ErpEnvironment = targetEnv;

  if (token) {
    const res = await getContractByToken(token, targetEnv);
    if (res.success && res.data) {
      initialContract = res.data;
      if (res.environment) {
        resolvedEnv = res.environment;
      }
    } else {
      initialError = res.error || "Không tìm thấy hợp đồng";
    }
  } else {
    initialError = "Mã truy cập hợp đồng không hợp lệ";
  }

  // Cho phép hiện công cụ kiểm thử nếu: có param ?test=1, ?debug=1, ?env=... hoặc đang ở staging/local
  const allowDevTools =
    sParams.test === "1" ||
    sParams.debug === "1" ||
    !!queryEnv ||
    resolvedEnv !== "production" ||
    process.env.NODE_ENV === "development";

  return (
    <main style={{ height: "100vh", overflow: "hidden", backgroundColor: "#f8fafc" }}>
      <ContractSignClient
        initialToken={token}
        initialContract={initialContract}
        initialError={initialError}
        initialTargetEnv={resolvedEnv}
        allowDevTools={allowDevTools}
      />
    </main>
  );
}
