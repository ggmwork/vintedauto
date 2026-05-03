import { NextResponse } from "next/server";

import { listVintedExtensionStockItems } from "@/lib/vinted/extension-stock";

export async function GET() {
  const response = NextResponse.json({
    items: await listVintedExtensionStockItems(),
  });

  response.headers.set("cache-control", "no-store");

  return response;
}
