export function formatVnd(value: number | null | undefined): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

export function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "-";
  return `${new Intl.NumberFormat("vi-VN").format(Number(value))}${suffix}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
}

export function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "Đã thanh toán";
    case "partial":
    case "partially_paid":
      return "Thanh toán một phần";
    case "locked":
      return "Đã khóa";
    case "confirmed":
      return "Đã xác nhận";
    case "voided":
      return "Đã huỷ";
    default:
      return "Chưa thanh toán";
  }
}

export function statusClass(status: string | null | undefined): string {
  if (status === "paid" || status === "confirmed") return "paid";
  if (status === "partial" || status === "partially_paid") return "partial";
  return "unpaid";
}

export function paymentMethodLabel(method: string | null | undefined): string {
  switch (method) {
    case "cash":
      return "Tiền mặt";
    case "bank_transfer":
      return "Chuyển khoản";
    case "card":
      return "Thẻ";
    case "online":
      return "Online";
    case "credit":
      return "Quỹ khách hàng";
    case "mixed":
      return "Kết hợp";
    default:
      return "Khác";
  }
}

export function asciiFold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

