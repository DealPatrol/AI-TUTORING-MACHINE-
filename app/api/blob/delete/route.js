import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/helpers";

export async function DELETE(request) {
  try {
    if (!checkCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    await del(url);

    return NextResponse.json({
      success: true,
      message: "File deleted",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
