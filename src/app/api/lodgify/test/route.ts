import { NextResponse } from "next/server";
import { z } from "zod";
import { testLodgifyConnection } from "@/lib/lodgify";

const requestSchema = z.object({
  apiKey: z.string().min(10),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Lodgify API key." }, { status: 400 });
  }

  try {
    const ok = await testLodgifyConnection(parsed.data.apiKey);
    return NextResponse.json({ ok });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Lodgify connection failed." },
      { status: 502 },
    );
  }
}
