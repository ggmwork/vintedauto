import { NextResponse } from "next/server";

import { buildDatabaseExportArchive } from "@/lib/data-portability/database-archive";

export const dynamic = "force-dynamic";

export async function GET() {
  const archive = await buildDatabaseExportArchive();

  return new NextResponse(archive.bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archive.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
