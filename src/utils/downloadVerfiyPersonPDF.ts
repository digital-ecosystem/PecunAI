import { prisma } from "@/lib/prisma";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";

export async function downloadLegtitationPDF(sessionId: string): Promise<void> {
  try {
    if (!sessionId) {
      throw new Error(
        "sessionId is required to download the legitimation PDF.",
      );
    }
    const handshakeInfo = await prisma.signteqHandshakeInfo.findUnique({
      where: {
        qaSessionId: sessionId,
      },
    });

    if (!handshakeInfo) {
      throw new Error(`No handshake info found for sessionId: ${sessionId}`);
    }

    const response = await fetch("https://st-api.signd.id/v1/ident/idv", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${handshakeInfo.sessionToken}`,
		"Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download legitimation PDF: ${response.statusText}`,
      );
    }

    const documentsDir = join(
      process.cwd(),
      "private-documents",
      sessionId,
      "signed",
    );
    await mkdir(documentsDir, { recursive: true });
    const filePath = join(documentsDir, "legitimation.pdf");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);
    return;
  } catch (error) {
    console.error("❌ Error downloading legitimation PDF:", error);
    throw error;
  }
}
