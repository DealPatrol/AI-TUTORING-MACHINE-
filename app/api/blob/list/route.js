import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { blobs } = await list();

    return NextResponse.json({
      success: true,
      totalFiles: blobs.length,
      files: blobs.map((blob) => ({
        pathname: blob.pathname,
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        filename: blob.pathname.split("/").pop() || "unknown",
      })),
    });
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
