import { asciiFold, formatDate, formatNumber, statusLabel } from "@/lib/format";
import type { Bill, CustomerSummary } from "@/lib/types";

type PdfLine = {
  text: string;
  size?: number;
  bold?: boolean;
};

export function generateInvoicePdf(input: { customer: CustomerSummary; bill: Bill }): Buffer {
  const period = input.bill.billing_periods?.period_name ?? "N/A";
  const remaining = input.bill.total_amount - input.bill.paid_amount;
  const lines: PdfLine[] = [
    { text: "CONG TY CAP NUOC MINH PHONG", size: 16, bold: true },
    { text: "HOA DON / PHIEU THONG BAO TIEN NUOC", size: 15, bold: true },
    { text: `Ma khach hang: ${input.customer.customer_code}` },
    { text: `Ten khach hang: ${input.customer.full_name}` },
    { text: `Dia chi: ${input.customer.address ?? "-"}` },
    { text: `Dien thoai: ${input.customer.phone_masked ?? "-"}` },
    { text: `Ky hoa don: ${period}` },
    { text: `Ngay bat dau: ${formatDate(input.bill.start_date ?? input.bill.billing_periods?.start_date)}` },
    { text: `Ngay ket thuc: ${formatDate(input.bill.end_date ?? input.bill.billing_periods?.end_date)}` },
    { text: `Chi so cu: ${formatNumber(input.bill.old_reading)}` },
    { text: `Chi so moi: ${formatNumber(input.bill.new_reading)}` },
    { text: `Tieu thu: ${formatNumber(input.bill.consumption, " m3")}` },
    { text: `Don gia: ${formatPdfMoney(input.bill.unit_price)}` },
    { text: `Tien truoc thue: ${formatPdfMoney(input.bill.pre_tax_amount)}` },
    { text: `VAT: ${formatPdfMoney(input.bill.tax_amount)} (${formatNumber(input.bill.tax, "%")})` },
    { text: `Tong tien: ${formatPdfMoney(input.bill.total_amount)}`, size: 14, bold: true },
    { text: `Da thanh toan: ${formatPdfMoney(input.bill.paid_amount)}` },
    { text: `Con lai: ${formatPdfMoney(remaining)}`, size: 13, bold: true },
    { text: `Trang thai: ${statusLabel(input.bill.status)}` },
    { text: "Tai lieu duoc tao tu Customer Portal. Vui long doi chieu voi ERP khi can xac minh.", size: 9 }
  ];

  return buildSimplePdf(lines);
}

function buildSimplePdf(lines: PdfLine[]): Buffer {
  const content = buildTextStream(lines);
  const ordered = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  ordered.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${ordered.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${ordered.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function buildTextStream(lines: PdfLine[]): string {
  let y = 790;
  const chunks = ["BT"];
  for (const line of lines) {
    const size = line.size ?? 11;
    const font = line.bold ? "F2" : "F1";
    chunks.push(`/${font} ${size} Tf`);
    chunks.push(`1 0 0 1 56 ${y} Tm`);
    chunks.push(`(${escapePdfText(asciiFold(line.text))}) Tj`);
    y -= size + 9;
  }
  chunks.push("ET");
  return chunks.join("\n");
}

function escapePdfText(input: string): string {
  return input.replace(/[\\()]/g, (char) => `\\${char}`);
}

function formatPdfMoney(value: number | null | undefined): string {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0))} VND`;
}
