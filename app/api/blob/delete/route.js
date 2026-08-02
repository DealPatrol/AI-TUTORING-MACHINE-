import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function DELETE(request) {
  try {
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
