import { getContractByToken } from "@/lib/erp-api";
import { ContractSignClient } from "@/components/contracts/ContractSignClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContractSigningPage({ params }: PageProps) {
  const { token } = await params;

  let initialContract = null;
  let initialError = null;

  if (token) {
    const res = await getContractByToken(token);
    if (res.success && res.data) {
      initialContract = res.data;
    } else {
      initialError = res.error || "Không tìm thấy hợp đồng";
    }
  } else {
    initialError = "Mã truy cập hợp đồng không hợp lệ";
  }

  return (
    <main style={{ height: "100vh", overflow: "hidden", backgroundColor: "#f8fafc" }}>
      <ContractSignClient
        initialToken={token}
        initialContract={initialContract}
        initialError={initialError}
      />
    </main>
  );
}
