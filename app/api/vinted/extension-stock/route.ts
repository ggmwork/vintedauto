import { NextResponse } from "next/server";

import {
  applyVintedExtensionCors,
  createVintedExtensionCorsOptionsResponse,
} from "@/lib/vinted/extension-cors";
import { listVintedExtensionStockItems } from "@/lib/vinted/extension-stock";

export function OPTIONS() {
  return createVintedExtensionCorsOptionsResponse();
}

export async function GET() {
  const response = NextResponse.json({
    items: await listVintedExtensionStockItems(),
  });

  response.headers.set("cache-control", "no-store");

  return applyVintedExtensionCors(response);
}
