import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { CONFIG } from "@/config/constants";

const SIGNTEQ_API_TOKEN = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_API_KEY_PRO || '' : process.env.SIGNTEQ_API_KEY_DEV || '';
const SIGNTEQ_ORG_ID = process.env.NEXT_PUBLIC_ENV === "production" ? process.env.SIGNTEQ_ORG_ID_PRO || '' : process.env.SIGNTEQ_ORG_ID_DEV || '';


export async function createAdviosrSignTeqRequest(qaSessionId: string, partnerId: string, base64Document: string): Promise<void> {
  // Simulated logic for creating an Adviosr SignTeq request
  const session = await prisma.qASession.findUnique({
    where: { id: qaSessionId },
    include: {
      partner: true,
      personalInfo: true,
    },
  });

  if (!session || !session.partner || !session.personalInfo) {
    console.error(`❌ No session found for qaSessionId: ${qaSessionId}`);
    return;
  }



  const payload = {
    type: "signature",
    subject: "Dokument zur Unterschrift",
    message: `Hallo ${session.partner.firstName} ${session.partner.lastName},
        Dein 4money Anlegerprozess wurde aktiviert und dein Vertragspaket steht jetzt für dich zur Unterschrift bereit. 
        Folge dem untenstehenden Link, um das Vertragspaket als Berater zu unterschreiben

        Anlegerprofil als Berater unterschreiben


        Falls du Fragen zu dem Prozess haben solltest, kannst du dich jederzeit direkt an deinen 4money Ansprechpartner wenden.

        Dein 4money Team
        4money Financial Services GmbH 
        Einspinnergasse 1/3.Stock, 8010 Graz 
        https://4money.at | office@4money.at | +43 676 92 00 670`,
    settings: {
      auto_reminders: false,
      copy_document_completed: true,
      copy_recipients_document_completed: false,
      delete_after_download: false,
      close_on_success: true,
      redirect_success_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/advisor/dashboard/${qaSessionId}`,
      redirect_error_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/customer/error`
    },
    // This meta is echoed back by SignTeq in webhooks so we can map events to our session.
    meta: {
      qaSessionId: qaSessionId,
      partnerId: session.partner.id,
      request: "final_signature_request"
    },
    documents: [
      {
        name: `Vertragsunterlage-${session.personalInfo?.lastName}-${session.personalInfo?.firstName}-.pdf`,
        base64: base64Document,
        meta: {
          qaSessionId: qaSessionId,
          partnerId: session.partner.id,
          request: "final_signature_request"
        },
        fields: [
          {
            page: 1,
            type: process.env.NEXT_PUBLIC_ENV === "production" ? "signature" : "signature",
            width: 350,
            height: 150,
            x: 400,
            y: 1400,
            required: true,
            read_only: false,
            recipient_id: "1"
          }
        ]
      }
    ],
    recipients: [
      {
        id: "1",
        type: "signatory",
        email: session.partner.email,
        name: `${session.personalInfo.firstName} ${session.personalInfo.lastName}`,
        do_not_notify: false,
        language: "de",
        qes: process.env.NEXT_PUBLIC_ENV === "production" ? false : false,
        meta: {
          qaSessionId: qaSessionId,
          partnerId: session.partner.id,
          request: "final_signature_request"
        }
      },
    ]
  };

  const response = await axios.post(`${CONFIG.SIGNTEQ.API_URL}/requests?organization_id=${SIGNTEQ_ORG_ID}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${SIGNTEQ_API_TOKEN}`,
      'User-Agent': CONFIG.SIGNTEQ.USER_AGENT
    },
    timeout: 30000,
  });
  console.log(`SignTeq API response for session:`, response.data);
  console.log(`Creating Adviosr SignTeq request for session ${qaSessionId} and partner ${partnerId}`);
}