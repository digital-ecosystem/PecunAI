import { prisma } from "@/lib/prisma";

export async function signteqHandshake(): Promise<{
  sessionToken: string;
  signatureId: string;
}> {
  const response = await fetch(
    "https://st-api.signd.id/v1/ident/handshake",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        login:
          process.env.NEXT_PUBLIC_ENV === "production"
            ? process.env.SIGNTEQ_QES_LOGIN_PRO
            : process.env.SIGNTEQ_QES_LOGIN_DEV,
        token:
          process.env.NEXT_PUBLIC_ENV === "production"
            ? process.env.SIGNTEQ_QES_TOKEN_PRO
            : process.env.SIGNTEQ_QES_TOKEN_DEV,
        type: "signature",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`SignTeq handshake failed: ${response.statusText}`);
  }
  const data = await response.json();
  console.log("🚀 ~ SignTeq handshake response data:", data);
  return { sessionToken: data.session_token, signatureId: data.id };
}

export async function saveHandshakeInfo(
  sessionToken: string,
  signatureId: string,
  sessionId: string,
  userId: string,
): Promise<void> {
  const handshakSession = await prisma.signteqHandshakeInfo.findUnique({
    where: {
      qaSessionId: sessionId,
    },
  });

  if (!handshakSession) {
    await prisma.signteqHandshakeInfo.create({
      data: {
        userId: userId,
        qaSessionId: sessionId,
        signatureId: signatureId,
        sessionToken: sessionToken,
        createdAt: new Date(),
		updatedAt: new Date(),
      },
    });
  } else {
    await prisma.signteqHandshakeInfo.update({
      where: {
        qaSessionId: sessionId,
      },
      data: {
        signatureId: signatureId,
        sessionToken: sessionToken,
        updatedAt: new Date(),
      },
    });
  }
}
