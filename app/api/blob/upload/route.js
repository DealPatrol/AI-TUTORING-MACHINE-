import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/helpers";

export async function POST(request) {
  try {
    if (!checkCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to public Blob store
    const blob = await put(file.name, file, {
      access: "public",
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
