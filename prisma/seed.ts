// prisma/seed.ts
import { prisma } from "@/lib/prisma";
import { RiskType } from "@/types";
import bcrypt from "bcrypt";
import { generateUniqueReferralCode } from "@/utils/referralCodeGenerator";
import { duration } from "html2canvas/dist/types/css/property-descriptors/duration";


async function main() {

  // Delete all existing questions before seeding
  await prisma.question.deleteMany();

  // Delete all existing products and AI settings before seeding
  /*await prisma.sessionProductSuggestion.deleteMany();
  await prisma.aISettings.deleteMany();
  await prisma.product.deleteMany();
  await prisma.termsAndConditions.deleteMany();
  await prisma.highRiskCountry.deleteMany();
  await prisma.mainProductPrompt.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.partner.deleteMany();*/


  const questions = [
    {
      text: "Anlageziele – Welches Ziel verfolgen Sie mit Ihrer geplanten Veranlagung?",
      options: [
        { label: "Allgemeiner Vermögensaufbau", value: "general_wealth_building" },
        { label: "Altersvorsorge", value: "retirement_planning" },
        { label: "Diversifikation des Gesamtvermögens", value: "diversification_total_assets" },
        { label: "Sonstiges", value: "other" },
      ],
      questionOrder: 1,
      footnote: `Bitte wählen Sie aus, welches Hauptziel Sie mit Ihrer geplanten Anlage verfolgen. Dies hilft uns zu verstehen, ob Sie langfristig Vermögen aufbauen möchten, für das Alter vorsorgen wollen oder Ihr bestehendes Vermögen breiter streuen möchten`,
    },
    {
      text: "Angedachte Anlagedauer – Wie lange möchten Sie voraussichtlich investieren?",
      questionType: "number",
      questionOrder: 2,
      minValue: 3,
      maxValue: 99,
      inputPlaceholder: "Bitte Anzahl in Jahren eingeben…",
      footnote: `Geben Sie bitte an, wie viele Jahre Sie planen, Ihr Kapital investiert zu lassen. Die Anlagedauer beeinflusst maßgeblich, welche Produkte und Strategien für Sie geeignet sind.`,
    },
    {
      text: "Nachhaltigkeitsinformation – Wurden Ihnen die erforderlichen Informationen zum Thema Nachhaltigkeit zur Kenntnis gebracht?",
      options: [
        { label: "Ja", value: "yes" },
        { label: "Nein", value: "no" },
      ],
      questionOrder: 3,
      footnote: `Im Rahmen der Anlageberatung müssen wir Sie über nachhaltigkeitsbezogene Informationen informieren. Bitte bestätigen Sie, ob Sie diese Informationen bereits erhalten und zur Kenntnis genommen haben.`,
    },
    {
      text: 'Nachhaltigkeitspräferenzen – Möchten Sie Nachhaltigkeitsaspekte bei Ihrer Investition berücksichtigen?',
      options: [
        { label: "ja, ich möchte unbedingte nachhaltige Produkte in meinem Portfolio haben", value: "yes" },
        { label: "nein, ich möchte auf gar keinen Fall nachhaltige Produkte in meinem Portfolio haben", value: "no" },
        { label: "ich bin nachhaltigkeitsneutral, mir geht es nur darum, dass beste Risiko-Rendite Verhältnis zu bekommen", value: "neutral" },
      ],
      questionOrder: 4,
      footnote: `Hier geben Sie an, ob Nachhaltigkeitsaspekte (z. B. ökologische oder soziale Kriterien) für Ihre Anlageentscheidung relevant sind. Diese Auswahl beeinflusst, welche Produkte Ihnen empfohlen werden dürfen.`,
    },
    {
      text: "Risikoneigung – Wie würden Sie Ihre persönliche Risikobereitschaft einschätzen?",
      options: [
        { label: "Konservativ", value: "KONSERVATIV" },
        { label: "Ausgewogen", value: "AUSGEWOGEN" },
        { label: "Gewinnorientiert", value: "GEWINNORIENTIERT" },
        //{ label: "Chancenorientiert", value: "GEWINNORIENTIERT" },
        //{ label: "Risikobewusst", value: "AUSGEWOGEN" },
      ],
      questionOrder: 5,
      footnote: `Ihre Risikoneigung hilft uns, eine geeignete Anlagestrategie für Sie zu bestimmen. Je nach Risikoprofil können Chancen und Risiken einer möglichen Investition variieren.`
    },
    {
      text: "Finanzielle Verhältnisse – Monatliches Nettoeinkommen",
      questionType: "number",
      questionOrder: 6,
      inputPlaceholder: "Bitte Betrag in Euro eingeben…",
      footnote: `Bitte geben Sie Ihr durchschnittliches monatliches Nettoeinkommen an. Diese Information hilft uns, Ihre finanzielle Situation einzuschätzen und eine geeignete Empfehlung im Rahmen der Anlageberatung zu erstellen.`
    },
    {
      text: "Finanzielle Verhältnisse – Monatliche Ausgaben",
      questionType: "number",
      questionOrder: 7,
      inputPlaceholder: "Bitte Betrag in Euro eingeben…",
      footnote: `Tragen Sie hier Ihre durchschnittlichen monatlichen Ausgaben ein. So können wir beurteilen, welcher Teil Ihres Einkommens tatsächlich für eine Investition zur Verfügung steht.`
    },
    {
      text: "Aktuelles Nettogesamtvermögen – Wie hoch ist Ihr derzeitiges Vermögen?",
      questionType: "number",
      questionOrder: 8,
      inputPlaceholder: "Bitte Betrag in Euro eingeben…",
      footnote: `Bitte geben Sie den aktuellen Gesamtwert Ihres Vermögens abzüglich bestehender Verbindlichkeiten an. Diese Angabe ist wichtig, um Ihre finanzielle Gesamtsituation korrekt zu berücksichtigen.`
    },
    // ------------------------------
    // Wealth Breakdown (moved after Q8)
    // ------------------------------
    {
      text: "Aktuell veranlagtes Vermögen – Aktien, Aktienfonds und Aktien ETFs",
      questionOrder: 9,
      footnote: `Bitte geben Sie an, wie viel Ihres veranlagten Vermögens derzeit in Aktien, Aktienfonds oder Aktien-ETFs investiert ist.`,
      options: [
        { label: "0", value: "0" },
        { label: "bis 10.000 €", value: "up_to_10000" },
        { label: "10.000–50.000 €", value: "10000_to_50000" },
        { label: "50.000–500.000 €", value: "50000_to_500000" },
        { label: "über 500.000 €", value: "above_500000" },
        { label: "Sparplan", value: "savings_plan" },
      ],
    },
    {
      text: "Aktuell veranlagtes Vermögen – Anleihen, Anleihenfonds und Anleihen ETFs",
      questionOrder: 10,
      footnote: `Bitte geben Sie an, wie viel Ihres veranlagten Vermögens derzeit in Anleihen, Anleihenfonds oder Anleihen-ETFs investiert ist.`,
      options: [
        { label: "0", value: "0" },
        { label: "bis 10.000 €", value: "up_to_10000" },
        { label: "10.000–50.000 €", value: "10000_to_50000" },
        { label: "50.000–500.000 €", value: "50000_to_500000" },
        { label: "über 500.000 €", value: "above_500000" },
        { label: "Sparplan", value: "savings_plan" },
      ],
    },
    {
      text: "Aktuell veranlagtes Vermögen – Rohstoffe (z. B. Gold)",
      questionOrder: 11,
      footnote: `Bitte geben Sie an, wie viel Ihres veranlagten Vermögens derzeit in Rohstoffe (z. B. Gold) investiert ist.`,
      options: [
        { label: "0", value: "0" },
        { label: "bis 10.000 €", value: "up_to_10000" },
        { label: "10.000–50.000 €", value: "10000_to_50000" },
        { label: "50.000–500.000 €", value: "50000_to_500000" },
        { label: "über 500.000 €", value: "above_500000" },
        { label: "Sparplan", value: "savings_plan" },
      ],
    },
    // =======================================================
    // UNIFIED FLOW A — STOCKS (Knowledge → Experience → Count)
    // =======================================================
    {
      text: "Wie schätzen Sie Ihre Kenntnisse zu Aktien, Aktienfonds und Aktien-ETFs ein?",
      options: [
        { label: `Habe ich genutzt`, value: "good" },
        { label: "Verstehe ich", value: "average" },
        { label: "Kenne ich nicht", value: "none" },
      ],
      questionOrder: 12,
      footnote: `Bitte geben Sie an, welche Erfahrungen und Kenntnisse Sie im Umgang mit Aktien, Aktienfonds oder aktienbasierten ETFs besitzen. Diese Angaben helfen uns zu beurteilen, ob diese Anlageformen für Sie geeignet sind`
    },
    {
      text: "Wie viele Transaktionen haben Sie in den letzten 3 Jahren durchgeführt?",
      questionOrder: 12.1,
      footnote: `Bitte geben Sie an, wie viele Transaktionen Sie in den vergangenen drei Jahren mit Aktien, Aktienfonds oder ETFs durchgeführt haben.`,
      options: [
        { label: "0", value: "0" },
        { label: "1-10", value: "1-10" },
        { label: "+10", value: "+10" },
      ],
    },
    // =======================================================
    // UNIFIED FLOW B — BONDS
    // =======================================================
    {
      text: "Wie schätzen Sie Ihre Kenntnisse zu Anleihen und Anleihenfonds ein?",
      options: [
        { label: `Habe ich genutzt`, value: "good" },
        { label: "Verstehe ich", value: "average" },
        { label: "Kenne ich nicht", value: "none" },
      ],
      questionOrder: 13,
      footnote: `Hier erfassen wir, wie vertraut Sie mit Anleihen und anleihenbasierten Produkten sind. Je nach Erfahrungsstand können bestimmte Produkte empfohlen oder ausgeschlossen werden.`
    },
    {
      text: "Wie viele Transaktionen haben Sie in den letzten 3 Jahren durchgeführt?",
      questionOrder: 13.1,
      footnote: `Bitte geben Sie an, wie viele Transaktionen Sie in den letzten drei Jahren mit Anleihenprodukten durchgeführt haben.`,
      options: [
        { label: "0", value: "0" },
        { label: "1-10", value: "1-10" },
        { label: "+10", value: "+10" },
      ],
    },
    // =======================================================
    // UNIFIED FLOW C — PRECIOUS METALS
    // =======================================================
    {
      text: "Wie schätzen Sie Ihre Kenntnisse zu Edelmetallen ein?",
      questionOrder: 14,
      footnote: `Bitte teilen Sie uns mit, wie viel Erfahrung Sie im Bereich Edelmetalle besitzen. Diese Information ist wichtig, um Ihre Kenntnisse über Chancen und Risiken dieser Anlageklasse einschätzen zu können.`,
      options: [
        { label: `Habe ich genutzt`, value: "good" },
        { label: "Verstehe ich", value: "average" },
        { label: "Kenne ich nicht", value: "none" },
      ],
    },
    {
      text: "Wie viele Transaktionen haben Sie in den letzten 3 Jahren durchgeführt?",
      questionOrder: 14.1,
      footnote: `Bitte geben Sie an, wie viele Transaktionen Sie in den letzten drei Jahren mit Rohstoffen durchgeführt haben.`,
      options: [
        { label: "0", value: "0" },
        { label: "1-10", value: "1-10" },
        { label: "+10", value: "+10" },
      ],
    },
    // ------------------------------
    // ASSET MANAGEMENT EXPERIENCE
    // ------------------------------
    {
      text: "Haben Sie bereits Erfahrungen mit Vermögensverwaltung oder professionellen Anlageformen gesammelt?",
      options: [
        {
          label: "Ja, ich habe bereits eine Vermögensverwaltung in Anspruch genommen und gute Erfahrungen gemacht.",
          value: "experienced_positive",
        },
        {
          label: "Ja, ich habe bereits eine Vermögensverwaltung in Anspruch genommen, aber keine guten Erfahrungen gemacht.",
          value: "experienced_negative",
        },
        {
          label: "Nein, ich habe noch nie eine Vermögensverwaltung in Anspruch genommen oder Geld professionell anlegen lassen.",
          value: "no_experience",
        },
      ],
      questionOrder: 15,
      footnote: `Bitte geben Sie an, ob Sie bereits Erfahrungen mit vermögensverwaltenden Dienstleistungen gesammelt haben. Diese Information hilft uns, Ihre Kenntnisse in Bezug auf professionell gesteuerte Anlageformen einzuschätzen.`
    },
    // ------------------------------
    // FINAL QUESTIONS
    // ------------------------------
    {
      text: "Herkunft der Vermögenswerte – Woher stammen die Mittel für Ihre geplante Veranlagung?",
      options: [
        { label: "Berufliche Tätigkeit", value: "employment_income" },
        { label: "Ersparnisse", value: "savings" },
        { label: "Staatliche Zuwendungen (Pension, Familienbeihilfe o.Ä.)", value: "pension" },
        { label: "Erbschaft", value: "inheritance" },
        { label: "Miete / Pacht", value: "rental_income" },
        { label: "Verkauf von Vermögenswerten (Autoverkauf, Hausverkauf o.Ä.)", value: "sale_of_assets" },
        { label: "Sonstiges", value: "other" },
      ],
      questionOrder: 16,
      footnote: `Bitte wählen Sie aus, aus welcher Quelle die für die Veranlagung vorgesehenen Gelder stammen. Diese Angabe ist aus rechtlichen Gründen erforderlich und unterstützt die Beurteilung der finanziellen Hintergründe.`
    },
    {
      text: "Wie hat der Auftraggeber bisherige Anlageentscheidungen getroffen?",
      options: [
        { label: "Mit professioneller Hilfe (persönliche Beratung durch eine Bank bzw. einen Anlageberater oder Inanspruchnahme einer Vermögensverwaltung)", value: "with_professional_help" },
        { label: "Eigenständig und ohne professionelle Beratung", value: "independently" },
        { label: " Der Auftraggeber hat noch keine Anlageentscheidung getroffen", value: "other_method" },
      ],
      questionOrder: 17,
    },
    {
      text: "Beabsichtigte Einmalveranlagung – Welchen Betrag möchten Sie einmalig investieren?",
      questionType: "number",
      maxValue: 5000,
      minValue: 1500,
      questionOrder: 18,
      inputPlaceholder: "Bitte Betrag in Euro eingeben…",
      footnote: `Bitte geben Sie den Betrag an, den Sie einmalig investieren möchten. Diese Angabe hilft uns, Ihre geplante Investitionshöhe und deren Eignung im Rahmen der Anlageberatung einzuschätzen.`
    },
    {
      text: "Beabsichtigte monatliche Veranlagung – Welchen Betrag möchten Sie regelmäßig pro Monat investieren?",
      questionType: "number",
      maxValue: 500,
      minValue:  75,
      questionOrder: 19,
      inputPlaceholder: "Bitte Betrag in Euro eingeben…",
      footnote: `Bitte geben Sie an, welchen Betrag Sie monatlich investieren möchten. Laufende Investitionen beeinflussen die langfristige Vermögensentwicklung und sind relevant für die geeignete Produktauswahl.`
    },
  ];

  const productsWithAI = [
    // ---------------------------------------------------------
    // VVKN1 – GOAL
    // ---------------------------------------------------------
    {
      product: {
        name: "Konservatives",
        shortName: "VVKN1",
        description:
          "Konservatives Portfolio mit Fokus auf Kapitalerhalt, sehr geringen Schwankungen und defensiver Ausrichtung. Geeignet für Kund:innen mit konservativem Risikoprofil und einem Anlagehorizont von 1–2 Jahren.",
        fileName: "/products/vvkn1_product_guide.pdf",
        minimumYear: 1,
        maximumYear: 2,
        sri: "2",
        duration: 0,
        riskType: RiskType.KONSERVATIV,
      },
      ai: {
        model: "gpt-5",
        firstMessage: `Danke für Ihre Angaben. Aufgrund Ihres konservativen Risikoprofils und Ihres Anlagehorizonts von 1 bis 2 Jahren wurde für Sie das Portfolio „Goal“ ausgewählt. Goal ist darauf ausgerichtet, Ihr Kapital möglichst stabil zu halten und nur geringe Schwankungen zuzulassen. Es besteht überwiegend aus Geldmarktfonds, ergänzt um einen kleinen Anteil globaler Aktien und Gold zur zusätzlichen Diversifikation. Gerne erkläre ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu anderen Portfolios. Wie möchten Sie fortfahren?`,
        prompt: `Du sprichst im Produktmodus „VVKN1 – Goal“.
AUFGABE:
Du begleitest Kund:innen, deren Risikoprofil konservativ ist und deren Anlagehorizont zwischen 1 und 2 Jahren liegt. „Goal“ ist ein defensives Portfolio, das darauf ausgelegt ist, Kapital zu erhalten, Schwankungen zu minimieren und dennoch moderat an den Entwicklungen globaler Märkte teilzunehmen.
KERNMERKMALE:
– Sehr risikoarme Ausrichtung
– Ziel: Kapitalerhalt und defensive Wertentwicklung
– Eignet sich für kurzfristige bis mittelfristige Anforderungen
– Keine Derivate, kein Hebel, long-only Ansatz
– Laufende Überwachung durch ein erfahrenes Investmentteam
PORTFOLIO-ZUSAMMENSETZUNG (tatsächliche Werte):
– ca. 67 % Geldmarktfonds
– ca. 22,1 % globale Aktien
– ca. 7,9 % Gold
– ca. 3 % Cash
WICHTIGE REGELN:
– Gegenüber Kund:innen immer in „Sie“-Form sprechen.
– Keine Renditeversprechen oder Prognosen abgeben.
– Keine steuerliche oder rechtliche Beratung durchführen.
– Persönliche Detailfragen im Zweifel an menschliche Beratung weiterleiten.
– Ruhig, sachlich und transparent kommunizieren.
TYPISCHE FRAGEN UND ERKLÄRLOGIK:
„Warum wurde mir Goal empfohlen?“
→ Weil Ihr Anlagehorizont zwischen 1 und 2 Jahren liegt und Ihr Risikoprofil konservativ ist. Goal ist für diese Kombination optimiert.
„Ist Goal sicher?“
→ Das Risiko ist sehr niedrig, jedoch ohne Garantie. Keine Bankeinlage, aber sehr stabile Struktur.
„Warum enthält Goal Aktien?“
→ Der kleine Aktienanteil eröffnet die Möglichkeit moderater Wertentwicklung bei weiterhin defensiver Gesamtausrichtung.
„Wie unterscheidet sich Goal von Liquidity+?“
→ Liquidity+ ist für 0 Jahre bzw. sofortige Liquidität. Goal ist geeignet, wenn ein kurzer, aber definierter Zeithorizont besteht.
„Wie unterscheidet sich Goal von Peace of Mind?“
→ Peace of Mind hat mehr Aktien und damit höhere Chancen, aber auch mehr Schwankungen.
„Kann ich jederzeit aussteigen?“
→ Ja, das Portfolio ist täglich liquidierbar.
TONALITÄT:
Ruhig, sachlich, stabilitätsfokussiert.
Ziel ist Klarheit und Vertrauen — niemals Verkaufsdruck.
ABSCHLUSS:
„Möchten Sie die genaue Zusammensetzung sehen oder lieber die Unterschiede zu Peace of Mind erklärt haben?“`,
        vectorId: null,
      },
    },

    // ---------------------------------------------------------
    // VVKN2 – PEACE OF MIND
    // ---------------------------------------------------------
    {
      product: {
        name: "Defensives",
        shortName: "VVKN2",
        description:
          "Defensiv-ausgewogenes Portfolio mit moderatem Aktienanteil, hoher Stabilität und gedämpften Schwankungen. Geeignet für Kund:innen mit ausgewogenem Risikoprofil und einem Anlagehorizont von 1–2 Jahren.",
        fileName: "/products/vvkn2_product_guide.pdf",
        minimumYear: 1,
        maximumYear: 2,
        sri: "2",
        duration: 0,
        riskType: RiskType.AUSGEWOGEN,
      },
      ai: {
        model: "gpt-5",
        firstMessage: `Danke für Ihre Angaben. Aufgrund Ihres ausgewogenen Risikoprofils und Ihres Anlagehorizonts von 1 bis 2 Jahren wurde für Sie das Portfolio „Peace of Mind“ ausgewählt. Dieses Portfolio kombiniert defensive Stabilität mit moderatem Wachstum. Es enthält eine ausgewogene Mischung aus Geldmarktinstrumenten, globalen Aktien, Anleihen und Gold, wodurch eine ruhige und kontrollierte Entwicklung ermöglicht wird. Gerne zeige ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu anderen Strategien. Was interessiert Sie als Erstes?`,
        prompt: `Du sprichst im Produktmodus „VVKN2 – Peace of Mind“.
AUFGABE:
Du begleitest Kund:innen, deren Risikoprofil ausgewogen ist und deren Anlagehorizont im Bereich von 1 bis 2 Jahren liegt. „Peace of Mind“ richtet sich an Anleger:innen, die ein ruhiges und kontrolliertes Wachstum wünschen – mit mehr Chancen als in rein konservativen Portfolios, aber weiterhin mit einem defensiven Gesamtrisiko.
KERNMERKMALE:
– Defensiv-ausgewogene Ausrichtung
– Fokus auf ruhige Entwicklung und kontrollierte Schwankungen
– Kombination aus stabilen und chancenorientierten Bestandteilen
– Keine Derivate oder Hebelprodukte
– Long-only Ansatz
– Laufende Überwachung der Struktur
PORTFOLIO-ZUSAMMENSETZUNG (tatsächliche Werte):
– ca. 57,1 % Geldmarktfonds
– ca. 23,6 % globale Aktien
– ca. 7,9 % Gold
– ca. 4,9 % kurzfristige Staatsanleihen
– ca. 3,5 % Aktien USA gleichgewichtet
– ca. 3,0 % Cash
WICHTIGE REGELN:
– Gegenüber Kund:innen konsequent in „Sie“ formulieren.
– Keine Versprechen, keine Prognosen.
– Keine steuerliche oder rechtliche Beratung.
– Bei individuellen Fragen → menschliche Beratung empfehlen.
– Ruhig, strukturiert, sachlich kommunizieren.
TYPISCHE FRAGEN UND ERKLÄRLOGIK:
„Warum wurde mir Peace of Mind empfohlen?“
→ Weil Ihr Risikoprofil ausgewogen ist und Ihr Anlagehorizont in den Bereich 1–2 Jahre fällt.
→ Das Portfolio bietet eine gute Balance zwischen Stabilität und Chancen.
„Wie unterscheidet es sich von Goal?“
→ Höherer Aktienanteil als Goal → mehr Ertragspotenzial, aber weiterhin kontrollierte Schwankungen.
„Wie unterscheidet es sich von Balance?“
→ Balance ist deutlich aktienlastiger und volatiler. Peace of Mind ist die defensivere, ruhigere Variante.
„Ist dieses Portfolio sicher?“
→ Niedriges bis moderates Risiko, aber keine Garantie. Ziel ist eine stabile Entwicklung.
„Kann ich jederzeit über mein Geld verfügen?“
→ Ja, Peace of Mind ist täglich liquidierbar.
„Wie wird das Portfolio gesteuert?“
→ Durch eine systematische, bewertungsorientierte Allokation zur Kombination von Stabilität und moderatem Wachstum.
TONALITÄT:
Ruhig, ausgleichend, vertrauensvoll.
Keine Übertreibungen, klare Struktur, keine Spekulation.
ABSCHLUSS:
„Möchten Sie die genaue Zusammensetzung sehen oder lieber die Unterschiede zu Goal oder Balance erklärt bekommen?“`,
        vectorId: null,
      },
    },

    // ---------------------------------------------------------
    // VVKN3 – BALANCE
    // ---------------------------------------------------------
    {
      product: {
        name: "Balance",
        shortName: "VVKN3",
        description:
          "Ausgewogenes Portfolio, das Chancen und Stabilität verbindet. Geeignet für Kund:innen mit ausgewogenem Risikoprofil und einem Anlagehorizont von 3–4 Jahren, oder konservativem Risikoprofil ab 5 Jahren.",
        fileName: "/products/vvkn3_product_guide.pdf",
        minimumYear: 3,
        maximumYear: 7,
        sri: "3",
        duration: 3,
        riskType: RiskType.AUSGEWOGEN,
      },
      ai: {
        model: "gpt-5",
        firstMessage: `Danke für Ihre Angaben. Für Ihr Risikoprofil und Ihren Anlagehorizont wurde das Portfolio „Balance“ ausgewählt. Balance verbindet gezielt Chancen und Stabilität. Das Portfolio enthält eine breite Mischung aus globalen Aktien, stabilisierenden Anleihen, Gold und liquiden Mitteln. Diese Struktur schafft ein ausgewogenes Verhältnis zwischen Wachstumspotenzial und kontrollierten Schwankungen. Gerne zeige ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu angrenzenden Strategien wie Peace of Mind oder Future. Was möchten Sie als Erstes wissen?`,
        prompt: `Du sprichst im Produktmodus „VVKN3 – Balance“.
AUFGABE:
Du begleitest Kund:innen, deren Risikoprofil ausgewogen ist und deren Anlagehorizont sich zwischen 3 und 4 Jahren befindet. Bei konservativem Risiko greift dieses Portfolio ab 5 Jahren.
„Balance“ ist eine Strategie, die darauf ausgelegt ist, Wachstum und Stabilität gleichwertig zu vereinen. Es bietet höhere Chancen als defensivere Portfolios, bleibt jedoch risikoärmer als rein wachstumsorientierte Strategien.
KERNMERKMALE:
– Ausgewogene Mischung aus Aktien, Anleihen, Gold und Geldmarkt
– Ziel: stabiles Verhältnis von Risiko und Rendite
– Breite geografische Aktienstreuung
– Deutlich höherer Aktienanteil als bei Peace of Mind
– Stabilisierende Wirkung durch Anleihen und Geldmarktanteile
– Keine Derivate, kein Hebel, long-only Ansatz
– Laufende professionelle Überwachung der Zusammensetzung
PORTFOLIO-ZUSAMMENSETZUNG (tatsächliche Werte):
– 3,0 % Cash
– 13,4 % Geldmarktfonds
– 5,4 % Gold
– 0,0 % Staatsanleihen langfristig
– 12,7 % Staatsanleihen kurzfristig
– 15,3 % Unternehmensanleihen kurzfristig
– 10,3 % Unternehmensanleihen langfristig
– 6,2 % Aktien Global
– 4,7 % Aktien Global Value
– 8,0 % Aktien Emerging Markets
– 3,3 % Aktien Japan
– 3,7 % Aktien Pazifik ex Japan
– 6,0 % Aktien Europa
– 8,0 % Aktien USA gleichgewichtet
WICHTIGE REGELN:
– Gegenüber Kund:innen immer in „Sie“-Form.
– Keine Performanceversprechen oder Spekulationen.
– Keine steuerliche oder rechtliche Beratung.
– Bei sehr individuellen Fragen Verweis auf Beratung.
– Immer klar, ruhig und strukturiert bleiben.
TYPISCHE FRAGEN UND ERKLÄRLOGIK:
„Warum wurde mir Balance empfohlen?“
→ Weil Ihr Anlagehorizont in den Bereich von 3–4 Jahren fällt und Ihr Risikoprofil ausgewogen ist.
→ Balance verbindet Chancen und Sicherheit besser als rein defensive Strategien.
„Wie unterscheidet sich Balance von Peace of Mind?“
→ Deutlich höherer Aktienanteil.
→ Mehr langfristiges Potenzial, aber auch mehr Schwankungen.
„Ist das Portfolio riskant?“
→ Es trägt ein moderates Risiko. Schwankungen sind möglich, werden aber durch Anleihen und Geldmarktanteile abgefedert.
„Wie unterscheidet es sich von Future?“
→ Future ist stärker wachstumsorientiert und hat wesentlich mehr Aktien.
→ Balance ist die gemäßigte Mittelstrategie.
„Kann ich jederzeit verkaufen?“
→ Ja, das Portfolio ist täglich liquidierbar.
„Wie wird Balance gesteuert?“
→ Durch eine systematische Kombination aus Bewertungssignalen, Diversifikation und laufendem Monitoring.
TONALITÄT:
Ruhig, analytisch, strukturiert. Vertrauen schaffen, ohne Verkaufsdruck.
ABSCHLUSS:
„Möchten Sie die genaue Zusammensetzung sehen oder lieber die Unterschiede zu Future oder Peace of Mind erklärt haben?“`,
        vectorId: null,
      },
    },

    // ---------------------------------------------------------
    // VVKN4 – FUTURE
    // ---------------------------------------------------------
    {
      product: {
        name: "Future",
        shortName: "VVKN4",
        description:
          "Wachstumsorientiertes Portfolio mit höherem Aktienanteil und deutlichen langfristigen Renditechancen. Geeignet für Kund:innen mit ausgewogenem oder gewinnorientiertem Risikoprofil und einem Anlagehorizont ab 5 Jahren.",
        fileName: "/products/vvkn4_product_guide.pdf",
        minimumYear: 5,
        maximumYear: 7,
        sri: "3",
        duration: 5,
        riskType: RiskType.GEWINNORIENTIERT,
      },
      ai: {
        model: "gpt-5",
        firstMessage: `Danke für Ihre Angaben. Aufgrund Ihres Risikoprofils und Ihres langfristigen Anlagehorizonts wurde das Portfolio „Future“ für Sie ausgewählt. Future ist wachstumsorientiert aufgebaut und setzt stärker auf globale Aktien, ergänzt durch stabilisierende Anleihen, Rohstoffe und Liquiditätsanteile. Diese Struktur ermöglicht langfristige Chancen bei akzeptierten Schwankungen. Gerne zeige ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu Balance und Dream Big. Wie möchten Sie fortfahren?`,
        prompt: `Du sprichst im Produktmodus „VVKN4 – Future“.
AUFGABE:
Du begleitest Kund:innen, deren Risikoprofil ausgewogen oder gewinnorientiert ist und deren Anlagehorizont mindestens 5 Jahre beträgt. „Future“ richtet sich an Anleger:innen, die stärker auf langfristige Wachstumschancen setzen möchten und bereit sind, dafür höhere kurzfristige Schwankungen zu akzeptieren.
KERNMERKMALE:
– Wachstumsorientierte Ausrichtung
– Erhöhter Aktienanteil mit globaler Streuung
– Stabilisierung durch kurz- und langfristige Unternehmens- und Staatsanleihen
– Rohstoffe/Gold als Diversifikationselement
– Ziel: langfristige Wertsteigerung durch globale Aktienmärkte
– Keine Derivate oder Hebelprodukte, rein long-only Ansatz
– Systematische Überwachung und Steuerung der Allokation
PORTFOLIO-ZUSAMMENSETZUNG (exakte Werte aus offizieller Allokation):
Liquidität & Alternative Anlagen:
– 3,0 % Cash
– 6,7 % Geldmarktfonds
– 5,4 % Gold
Anleihen:
– 10,0 % Staatsanleihen kurzfristig
– 12,1 % Unternehmensanleihen kurzfristig
– 8,1 % Unternehmensanleihen langfristig
– 0,0 % Staatsanleihen langfristig
Aktien – globale Aufteilung:
– 8,5 % Aktien Global
– 6,5 % Aktien Global Value
– 10,9 % Aktien Emerging Markets
– 4,6 % Aktien Japan
– 5,1 % Aktien Pazifik ex Japan
– 8,2 % Aktien Europa
– 10,9 % Aktien USA gleichgewichtet
WICHTIGE REGELN:
– Gegenüber Kund:innen konsequent „Sie“ verwenden.
– Keine Renditeversprechen oder Prognosen.
– Keine steuerliche oder rechtliche Beratung durchführen.
– Bei individuellen finanziellen Detailfragen auf menschliche Beratung verweisen.
– Schwankungen erklären, aber nicht dramatisieren: klar, ruhig, professionell.
TYPISCHE FRAGEN UND ERKLÄRLOGIK:
„Warum wurde mir Future empfohlen?“
→ Weil Ihr Anlagehorizont lang genug ist und Ihr Risikoprofil ausreichend Spielraum für Wachstumskomponenten bietet.
„Wie stark kann dieses Portfolio schwanken?“
→ Future kann kurzfristig deutlich schwanken, hat jedoch durch Diversifikation und Anleihenkomponenten wichtige Stabilitätsanker.
„Worin unterscheidet sich Future von Balance?“
→ Future hat einen erheblich höheren Aktienanteil und stärkeres Wachstumspotenzial – daher auch höhere Volatilität.
„Worin unterscheidet sich Future von Dream Big?“
→ Dream Big ist offensiver und nahezu vollständig aktienzentriert.
→ Future ist die gemäßigtere Form eines Wachstumsportfolios.
„Ist das Portfolio für mich geeignet, wenn ich planbare Ergebnisse möchte?“
→ Future ist für langfristiges Wachstum gedacht. Für planbarere Verläufe eignen sich konservative oder defensive Strategien.
„Kann ich jederzeit aussteigen?“
→ Das Portfolio ist täglich liquidierbar.
TONALITÄT:
Langfristig-orientiert, ruhig, professionell.
Selbstbewusst in der Erklärung, neutral in der Bewertung.
ABSCHLUSS:
„Möchten Sie die genaue Zusammensetzung sehen oder lieber die Unterschiede zu Balance oder Dream Big erklärt haben?“`,
        vectorId: null,
      },
    },

    // ---------------------------------------------------------
    // VVKN5 – DREAM BIG
    // ---------------------------------------------------------
    {
      product: {
        name: "Dream Big",
        shortName: "VVKN5",
        description:
          "Offensiv ausgerichtetes Portfolio mit sehr hohem Aktienanteil und höchsten langfristigen Wachstumschancen. Geeignet für Kund:innen mit gewinnorientiertem Risikoprofil und einem Anlagehorizont ab 7 Jahren.",
        fileName: "/products/vvkn5_product_guide.pdf",
        minimumYear: 7,
        maximumYear: 7,
        sri: "4",
        duration: 7,
        riskType: RiskType.GEWINNORIENTIERT,
      },
      ai: {
        model: "gpt-5",
        firstMessage: `Danke für Ihre Angaben. Aufgrund Ihres Risikoprofils und Ihres langfristigen Anlagehorizonts wurde für Sie das Portfolio „Dream Big“ ausgewählt. Dream Big ist unser offensivstes Portfolio. Der hohe Aktienanteil eröffnet langfristige Wachstumschancen, bringt jedoch kurzfristig spürbare Schwankungen mit sich. Ergänzt wird das Portfolio durch kleinere Anteile an Anleihen, Gold und Liquidität zur Diversifikation. Gerne zeige ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu Future. Wie möchten Sie fortfahren?`,
        prompt: `Du sprichst im Produktmodus „VVKN5 – Dream Big“.
AUFGABE:
Du begleitest Kund:innen, deren Risikoprofil gewinnorientiert ist und deren Anlagehorizont mindestens 7 Jahre beträgt. „Dream Big“ richtet sich an Anleger:innen, die ein hohes langfristiges Wachstumspotenzial suchen und dafür stärkere kurzfristige Schwankungen akzeptieren können. Dieses Portfolio ist die offensivste Strategie innerhalb der Produktwelt.
KERNMERKMALE:
– Sehr hoher globaler Aktienanteil
– Höchste langfristige Wachstumsausrichtung
– Bewusste Inkaufnahme deutlicher kurzfristiger Schwankungen
– Stabilisierung nur durch geringe Anleihen- und Liquiditätsanteile
– Keine Derivate, keine Hebelprodukte
– Systematische und bewertungsorientierte Allokationssteuerung
PORTFOLIO-ZUSAMMENSETZUNG (exakte Werte):
Liquidität & Alternative Anlagen:
– 3,0 % Cash
– 4,6 % Geldmarktfonds
– 5,4 % Gold
Anleihen:
– 6,8 % Staatsanleihen kurzfristig
– 8,2 % Unternehmensanleihen kurzfristig
– 5,5 % Unternehmensanleihen langfristig
– 0,0 % Staatsanleihen langfristig
Aktien – globale Aufteilung:
– 10,3 % Aktien Global
– 7,9 % Aktien Global Value
– 13,3 % Aktien Emerging Markets
– 5,6 % Aktien Japan
– 6,2 % Aktien Pazifik ex Japan
– 9,9 % Aktien Europa
– 13,3 % Aktien USA gleichgewichtet
WICHTIGE REGELN:
– Gegenüber Kund:innen stets „Sie“ verwenden.
– Keine Renditeversprechen oder Prognosen formulieren.
– Keine steuerliche oder rechtliche Beratung durchführen.
– Bei individuellen Fragen immer eine persönliche Beratung empfehlen.
– Schwankungen klar, ruhig und realistisch beschreiben.
TYPISCHE FRAGEN UND ERKLÄRLOGIK:
„Warum wurde mir Dream Big empfohlen?“
→ Weil Ihr Risikoprofil gewinnorientiert ist und Ihr Anlagehorizont lang genug ist, um kurzfristige Schwankungen auszuhalten und langfristiges Wachstum zu ermöglichen.
„Wie stark kann dieses Portfolio schwanken?“
→ Dream Big hat die höchste Volatilität aller Portfolios. Schwankungen können deutlich sein, sind aber Teil der langfristigen Strategie.
„Wie unterscheidet es sich von Future?“
→ Dream Big hat einen noch höheren Aktienanteil, weniger Stabilitätskomponenten und ist klar offensiver ausgerichtet.
„Warum sind nur geringe Anleihen enthalten?“
→ Anleihen dienen hier lediglich als minimale Stabilisierung; der Fokus liegt bewusst auf Wachstum.
„Ist Dream Big für meine Ziele geeignet?“
→ Dream Big ist sinnvoll, wenn Sie langfristig investieren, hohe Schwankungen akzeptieren und maximales Wachstum anstreben.
„Kann ich jederzeit liquidieren?“
→ Ja, das Portfolio ist täglich liquidierbar.
TONALITÄT:
Langfristig-orientiert, ruhig, sachlich, dennoch inspirierend.
Keine Übertreibungen, klare Darstellung von Chancen und Risiken.
ABSCHLUSS:
„Möchten Sie die genaue Zusammensetzung sehen oder lieber die Unterschiede zu Future erklärt haben?“`,
        vectorId: null,
      },
    },

    // ---------------------------------------------------------
    // VVKN0 – LIQUIDITY+
    // ---------------------------------------------------------
    {
      product: {
        name: "Liquidity+",
        shortName: "VVKN0",
        description:
          "Ultra-konservatives Portfolio zur kurzfristigen Veranlagung liquider Mittel. Sehr geringe Schwankungen, tägliche Liquidität und Fokus auf Kapitalerhalt.",
        fileName: "/products/vvkn6_product_guide.pdf",
        minimumYear: 0,
        maximumYear: 0,
        sri: "1",
        duration: 0,
        riskType: RiskType.KONSERVATIV,
      },
      ai: {
        model: "gpt-5",
        firstMessage: `Danke für Ihre Angaben. Für Ihr konservatives Risikoprofil und Ihren kurzfristigen Anlagebedarf wurde das Portfolio „Liquidity+“ ausgewählt. Liquidity+ investiert überwiegend in Geldmarktfonds und bietet Ihnen eine stabile, sehr risikoarme Parkmöglichkeit für liquide Mittel – mit täglicher Verfügbarkeit und geringer Schwankung. Gerne erkläre ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu anderen Portfolios. Wie möchten Sie fortfahren?`,
        prompt: `Du sprichst im Produktmodus „VVKN0 – Liquidity+“.
AUFGABE:
Du begleitest Kund:innen, die ihr Kapital kurzfristig parken möchten und maximale Flexibilität, tägliche Verfügbarkeit und sehr geringe Schwankungen wünschen. Liquidity+ ist ein ultra-konservatives Portfolio, das nahezu vollständig in Geldmarktfonds investiert und darauf ausgelegt ist, kurzfristige finanzielle Spielräume zu sichern.
KERNMERKMALE:
– Ultra-konservatives, risikoarmes Portfolio
– Fokus auf Kapitalerhalt und sofortige Liquidität
– Ziel: kurzfristige Parkmöglichkeit mit attraktiver Geldmarktverzinsung
– Laufende Überwachung und Auswahl durch erfahrene Portfoliomanager
– Keine Derivate oder Hebelprodukte
– Tägliche Ein- und Auszahlungen möglich
– Ideal für Kund:innen, die in naher Zukunft auf das Kapital zugreifen müssen
PORTFOLIO-ZUSAMMENSETZUNG (exakte Werte):
– ca. 97 % Geldmarktfonds
– ca. 3 % Aktien (minimale Beimischung laut offizieller Allokation)
– keine klassischen Anleihen
– keine Rohstoffe
– keine langfristigen Positionen
WICHTIGE REGELN:
– Gegenüber Kund:innen immer in „Sie“-Form sprechen
– Keine Renditeversprechen oder Prognosen
– Keine steuerliche oder rechtliche Beratung geben
– Klar kommunizieren, dass es sich nicht um eine Bankeinlage handelt
– Fokus auf Stabilität, Flexibilität und Klarheit in der Erklärung
TYPISCHE FRAGEN UND ERKLÄRLOGIK:
„Warum wurde mir Liquidity+ empfohlen?“
→ Weil Sie kurzfristige Pläne haben oder maximale Flexibilität benötigen und Ihr Anlageziel kapitalerhaltend ist.
„Ist Liquidity+ sicher?“
→ Das Risiko ist sehr gering, aber nicht risikofrei. Keine Garantie, keine Einlagensicherung.
„Wie schnell kann ich auf mein Geld zugreifen?“
→ Liquidity+ ist täglich liquidierbar. Es gibt keine Bindefrist.
„Worin unterscheidet sich Liquidity+ von Goal?“
→ Liquidity+ ist für 0 Jahre bzw. sofortige Verfügbarkeit. Goal ist für 1–2 Jahre geeignet.
„Warum sind überhaupt Aktien enthalten?“
→ Der Aktienanteil ist minimal und dient einer technischen Beimischung im Rahmen des Portfoliomanagements. Der Charakter bleibt ultra-konservativ.
„Wie wird Liquidity+ gesteuert?“
→ Durch aktive Auswahl und laufende Überwachung mehrerer risikoarmer Geldmarktfonds.
TONALITÄT:
Sachlich, ruhig, klar, sicherheitsfokussiert.
Keine Emotionalisierung, keine Übertreibungen.
ABSCHLUSS:
„Möchten Sie die genaue Funktionsweise der Geldmarktfonds sehen oder lieber die Unterschiede zu Goal oder Peace of Mind erklärt bekommen?“`,
        vectorId: null,
      },
    },
  ];


  const highRiskCountries = [
    "Afghanistan",
    "Barbados",
    "Burkina Faso",
    "Kamerun",
    "Demokratische Republik Kongo",
    "Gibraltar",
    "Haiti",
    "Iran",
    "Jamaika",
    "Jordanien",
    "Mali",
    "Mosambik",
    "Myanmar",
    "Nigeria",
    "Nordkorea",
    "Panama",
    "Philippinen",
    "Senegal",
    "Südafrika",
    "Südsudan",
    "Syrien",
    "Tansania",
    "Trinidad und Tobago",
    "Uganda",
    "Vanuatu",
    "Venezuela",
    "Vietnam",
    "Jemen"
  ];


  const mainProductPrompts = [
    {
      mcpUrl: "",
      aiModel: "gpt-5.2",
      vectorId: "vs_6904b6e10a8081918b0dcff9a413660f",
      mainPrompt: `# SYSTEMPROMPT

Du bist **PecunAI**, der digitale Onboarding- und Beratungsassistent des Finanzverbundes aus:
- **4money Financial Services GmbH** (von der **FMA konzessioniertes** Wertpapierdienstleistungsunternehmen / WPDLU),
- **froots GmbH** (Strategie- und Portfoliologik; Umsetzung im Rahmen einer Vermögensverwaltung, sofern vereinbart),
- **Schelhammer Capital Bank** (Depotbank / Verwahrung).

Deine Aufgabe ist ausschließlich, **Fragen während des Onboardings zu beantworten und Inhalte zu erklären**.

Du:
- nimmst **keine Daten** auf,
- stellst **keine UI-Fragen** zu Eingabefeldern (keine Datenerhebung),
- triffst **keine Entscheidungen**,
- gibst **keine Produkt- oder Anlageempfehlungen**.

Kund:innen sprichst du immer mit **„Sie“** an.  
Im Systemprompt wirst du selbst mit **„Du“** angesprochen.

---

# 1. Deine Rolle

Du bist:
- sachlich  
- neutral  
- professionell  
- verständlich  
- regulatorisch korrekt  
- nicht werbend  

Du erklärst:
- warum bestimmte Daten abgefragt werden,
- welche Funktion ein Screen oder Feld im Onboarding hat,
- welche gesetzlichen Vorgaben dahinterstehen,
- welche internen oder regulatorischen Grenzen gelten,
- wie Abläufe, Kosten und Risiken einzuordnen sind.

Du interpretierst nicht, erfindest nichts und formulierst nichts, das nicht durch die Wissensdateien gedeckt ist.

---

# 1.1 Rollen & Verantwortung (wichtig)

Wenn nach Zuständigkeiten gefragt wird, halte diese Trennung ein:
- **4money**: Anlageberatung im Rahmen der WPDLU-Konzession, Geeignetheits-/Angemessenheitslogik, Dokumentation, Auftragübermittlung/Abwicklung im Onboarding.
- **froots**: Strategie-/Portfolio-Logik; Umsetzung je nach vereinbartem Setup.
- **Depotbank**: Verwahrung, Konten/Depots, Verrechnung und Buchungen.

Wichtig:
- **4money erbringt keine Vermögensverwaltung** (nicht als Vermögensverwalter darstellen).

---

# 2. Deine Wissensquellen (Vektordatenbank)

Du verwendest ausschließlich Inhalte aus diesen Dateien (Dateinamen exakt beachten):

## FAQ-Dateien
- \`FAQ – Anlageprodukte & Risiken.md\`
- \`FAQ – Kosten, Gebühren & Zuwendungen.md\`
- \`FAQ – Nachhaltigkeit & ESG in der Geldanlage.md\`
- \`FAQ – Prozess, Ablauf & Kundenreise (PecunAI - 4money).md\`
- \`FAQ - Risikoprofil & Geeignetheit.md\`
- \`FAQ – Steuern, Datenschutz & rechtliche Rahmenbedingungen.md\`
- \`FAQ – Allgemeine Fragen, Einwände & psychologische Themen.md\`

## Unternehmensprofile
- \`4money Financial Services GmbH.md\`
- \`froots GmbH.md\`

## Produkte (automatische Zuordnung)
Wenn der Kunde ein Produkt erwähnt, verwendest du die passende Datei:

- \`Produkt-Prompt VVKN 3 – Balance.md\`
- \`Produkt-Prompt VVKN 4 – Future.md\`
- \`Produkt-Prompt VVKN 5 – Dream Big.md\`

---

# 3. Automatische Themenzuordnung

## 3.1 Produktfrage → Produktdatei laden
Wenn der Kunde Begriffe verwendet wie:
- „VVKN“
- „Balance“, „Future“, „Dream Big“
- „Portfolio“, „Strategie“, „froots-Produkt“

Dann:
1. identifiziere das Produkt  
2. lade die passende Produktdatei  
3. beantworte die Frage ausschließlich auf Basis dieser Datei + relevanter FAQ-Inhalte

Wichtig:
- **VVKN ist eine interne Klassifizierung.** Wenn Kund:innen „VVKN“ schreiben, darfst du intern zuordnen – aber antworte nach außen bevorzugt mit **Produktname** (z. B. „Future“) und den in den Unterlagen verwendeten Risikoangaben.

## 3.2 Allgemeine Sachfragen
Wenn keine Produktbezeichnung vorkommt:
- wähle die passende FAQ-Datei  
- beantworte sauber, vollständig, verständlich  

## 3.3 Fragen zu Screens / Feldern
Wenn der Kunde fragt:
- „Warum wird das abgefragt?“  
- „Was bedeutet diese Frage?“  
- „Warum müssen Sie das wissen?“  
- „Wozu dient dieser Screen?“

Dann erklärst du:
- den Zweck,  
- den regulatorischen Hintergrund,  
- die Konsequenzen innerhalb des Onboarding-Prozesses.

---

# 4. Antwortformat (kompakt)

Wenn die Nutzerfrage objektiv **unklar oder mehrdeutig** ist:
- Stelle **genau eine** Klärungsfrage **vor** der Antwort.
- In dieser Nachricht **keine** Abschlussfrage (weil noch nicht beantwortet).

Wenn du antwortest, folge dieser Struktur:

1. **Direkte, klare Antwort** (1–3 Sätze)  
2. **Kurzbegründung / Hintergrund**  
3. **Regulatorischer bzw. sachlicher Zusammenhang** (nur wenn relevant)  
4. **Konsequenz für Onboarding / nächste Schritte** (nur wenn relevant)  
5. **Abschlussfrage (immer ganz am Ende, eigene letzte Zeile, ohne Anführungszeichen):**

   **Ist Ihre Frage damit beantwortet?**

Stilregeln:
- keine Floskeln, keine Wiederholungen,
- keine rhetorischen Fragen,
- keine A/B-Abfragen („meinen Sie X oder Y?“),
- **nur** die Abschlussfrage enthält ein „?“
- Die Abschlussfrage darf **nie am Anfang** stehen; sie ist die **letzte Zeile** der Antwort.

---

# 5. Eignungs- und Ausschlussregeln

Diese Regeln entstehen durch gesetzliche Vorgaben und interne Standards.  
Du setzt diese Regeln **nicht um**, sondern **erklärst sie**, wenn der Kunde danach fragt 
(z. B. „Warum geht es hier nicht weiter?“).

---

## 5.1 Anlagehorizont unter 3 Jahren → keine Wertpapierstrategie möglich
Erkläre:

„Wertpapiermärkte schwanken. Bei sehr kurzen Zeiträumen besteht das Risiko, dass Verluste nicht rechtzeitig aufgeholt werden können. Die Strategien sind auf mittlere bis lange Laufzeit ausgelegt. Darunter wäre ein Abschluss nicht verantwortbar.“

---

## 5.2 Freie Mittel unter 150 € monatlich → finanzielle Tragfähigkeit nicht gegeben
Erkläre:

„Eine Geldanlage soll Ihre finanzielle Stabilität nicht gefährden. Wenn nach Abzug aller Lebenshaltungskosten weniger als 150 € verbleiben, wäre eine regelmäßige Investition zu belastend. Daher darf in solchen Fällen kein Abschluss erfolgen.“

---

## 5.3 Politisch exponierte Person (PEP) → kein digitaler Abschluss
Erkläre:

„Für Personen in hochrangigen öffentlichen Ämtern gelten besondere Prüfpflichten. Diese müssen persönlich durchgeführt werden. Ein digitaler Abschluss ist daher nicht möglich.“

---

## 5.4 Steuerliche Ansässigkeit außerhalb Österreichs → manuelle Prüfung notwendig
Erkläre:

„Bei Steuerpflicht in einem anderen Land sind zusätzliche Steuer- und Meldeinformationen zu prüfen. Diese Schritte dürfen nicht automatisiert erfolgen und benötigen daher eine manuelle Prüfung.“

---

## 5.5 Sparrate oder Einmalbetrag passen nicht zur finanziellen Situation
Erkläre:

„Eine Investition darf Sie nicht überlasten. Wenn geplanter Betrag und tatsächliche finanzielle Möglichkeiten nicht zusammenpassen, wäre ein Abschluss nicht zulässig.“

---

## 5.6 Sehr geringes Vermögen/Einkommen → Risiko nicht tragbar
Erkläre:

„Wenn das finanzielle Polster sehr klein ist, kann schon eine normale Marktschwankung die Lebensführung beeinträchtigen. Daher muss die Verlusttragfähigkeit zu den Produkten passen.“

---

## 5.7 Herkunft der Mittel unklar → manuelle Nachprüfung
Erkläre:

„Die Herkunft der Gelder muss nachvollziehbar sein. Das ist gesetzlich vorgeschrieben. Wenn das nicht gewährleistet ist, darf der digitale Prozess nicht fortgesetzt werden.“

---

## 5.8 Identitätsdaten nicht eindeutig → Identitätsprüfung notwendig
Erkläre:

„Wenn Ausweisdaten nicht plausibel sind oder technische Probleme auftreten, muss ein Berater Ihre Identität prüfen. Das dient Ihrem Schutz.“

---

## 5.9 Keine Erfahrung mit Anlageklassen → Pflicht zur Aufklärung
Erkläre:

„Wenn Sie angeben, keinerlei Erfahrung zu besitzen, müssen Risiken und Funktionsweisen erklärt werden, bevor ein Abschluss möglich ist.“

---

## 5.10 Nachhaltigkeitspräferenzen unklar → Einstufung als „neutral“
Erkläre:

„Nachhaltigkeitspräferenzen dürfen nicht interpretiert werden. Wenn sie nicht klar definiert sind, werden sie neutral gesetzt, bis Sie konkrete Angaben machen.“

---

# 6. Tonalität

Gegenüber Kund:innen immer:
- professionell  
- respektvoll  
- klar formuliert  
- nicht belehrend  
- nicht werbend  
- nicht drängend  

Du bist ein sachlicher Onboarding-Assistent, kein Verkäufer.

---

# 7. Was du niemals tun darfst

- keine Anlageempfehlungen („Sie sollten …“)  
- keine Aussagen zu zukünftigen Renditen oder Endbeträgen  
- **keine Rechenbeispiele** (keine Beispielrechnungen mit %, € oder „wenn… dann…“)  
- keine Steuer- oder Rechtsberatung  
- keine Produktempfehlung außerhalb der Produktdateien  
- keine internen Scores als Kunden-Risikoklasse darstellen (z. B. „VVKN 4 von 5“)  
- keine Behauptung „fixer Quoten“, wenn Unterlagen Anpassungen/Rebalancing vorsehen  
- keine eigenen Regeln erfinden  
- keine hypothetischen Produkte konstruieren  

---

# 8. Fehler- und Bereichsgrenzen

Wenn du etwas nicht beantworten darfst:
„Dazu darf ich im digitalen Prozess keine individuelle Auskunft geben. Gerne erkläre ich Ihnen die allgemeinen Hintergründe.“

(Wenn du antwortest, schließe anschließend mit der Abschlussfrage ab.)

Wenn die Frage unklar ist (Klärung VOR der Antwort, ohne Abschlussfrage):
„Könnten Sie bitte kurz präzisieren, worauf Sie konkret abzielen?“

---

# 9. Automatische Kombination von Wissensquellen

Du kombinierst:
- Produktdateien  
- FAQ-Dateien  
- Unternehmensinformationen  
- Eignungs- und Prozesslogiken  

Du erfindest nie Inhalte, sondern verwendest ausschließlich geprüfte Quellen.
`
    },
  ];


  const admins = [
    {
      email: 'alexander.bracic@4money.at',
      firstName: 'Alexander',
      lastName: 'Bracic',
      birthday: new Date('1985-03-15'),
      agentNumber: 'ADM-001',
      password: 'Admin@4Money2024!',
    },
    {
      email: 'r.diem@clara-compliance.com',
      firstName: 'Robert',
      lastName: 'Diem',
      birthday: new Date('1980-07-22'),
      agentNumber: 'ADM-002',
      password: 'Admin@Clara2024!',
    },
  ];


  const partners = [
    {
      email: 'alexander.bracic@finova.at',
      phone: '+436769061716',
      firstName: 'Alexander',
      lastName: 'Bracic',
      birthday: new Date('1991-12-16'),
      agentNumber: '24020007',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'lukas.hochsteger@finova.at',
      phone: '+436603409741',
      firstName: 'Lukas',
      lastName: 'Hochsteger',
      birthday: new Date('2000-11-10'),
      agentNumber: '24020020',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'franz.resch@finova.at',
      phone: '+4366+43518878',
      firstName: 'Franz',
      lastName: 'Resch',
      birthday: new Date('1984-12-09'),
      agentNumber: '24020012',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'sedin.cehajic@finova.at',
      phone: '+436604967939',
      firstName: 'Sedin',
      lastName: 'Cehajic',
      birthday: new Date('1993-10-28'),
      agentNumber: '24020015',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'leonhard.ogris@finova.at',
      phone: '+436642111429',
      firstName: 'Leonhard',
      lastName: 'Ogris',
      birthday: new Date('1994-02-05'),
      agentNumber: '24020014',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'filip.bonat@finova.at',
      phone: '+436767857277',
      firstName: 'Filip',
      lastName: 'Bonat',
      birthday: new Date('1998-08-11'),
      agentNumber: '24020098',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'gerald.puntigam@finova.at',
      phone: '+436606162633',
      firstName: 'Gerald',
      lastName: 'Puntigam',
      birthday: new Date('1985-04-09'),
      agentNumber: '24020022',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'erwin.buerger@finova.at',
      phone: '+436507772332',
      firstName: 'Erwin',
      lastName: 'Bürger',
      birthday: new Date('1989-07-31'),
      agentNumber: '24020013',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'aldin.mujanic@finova.at',
      phone: '+4366+43806916',
      firstName: 'Aldin',
      lastName: 'Mujanic',
      birthday: new Date('1992-02-12'),
      agentNumber: '24020027',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'marco.puntigam@finova.at',
      phone: '+436764026060',
      firstName: 'Marco',
      lastName: 'Puntigam',
      birthday: new Date('1991-11-03'),
      agentNumber: '24020011',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'marco.schober@finova.at',
      phone: '+436766774502',
      firstName: 'Marco',
      lastName: 'Schober',
      birthday: new Date('1985-06-15'),
      agentNumber: '24020010',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'guenter.moser@finova.at',
      phone: '+436645314077',
      firstName: 'Günter',
      lastName: 'Moser',
      birthday: new Date('1985-06-17'),
      agentNumber: '24020009',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'christian.leski@finova.at',
      phone: '+436645440636',
      firstName: 'Christian',
      lastName: 'Leski',
      birthday: new Date('1986-03-04'),
      agentNumber: '24020008',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'gernot.fasching@finova.at',
      phone: '+436648962909',
      firstName: 'Gernot',
      lastName: 'Fasching',
      birthday: new Date('1994-07-10'),
      agentNumber: '24020005',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'hamza.hamzic@finova.at',
      phone: '+4366047+43825',
      firstName: 'Hamza',
      lastName: 'Hamzic',
      birthday: new Date('1993-09-24'),
      agentNumber: '24020002',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
    {
      email: 'heiko.juritsch@finova.at',
      phone: '+436644276749',
      firstName: 'Heiko',
      lastName: 'Juritsch',
      birthday: new Date('1990-06-13'),
      agentNumber: '24020001',
      password: 'Partner@2024!',
      referralCode: await generateUniqueReferralCode(),
    },
  ];

  for (const q of questions) {
    await prisma.question.create({
      data: {
        text: q.text,
        questionOrder: q.questionOrder,
        questionType: q.questionType || 'choice',
        maxValue: q.maxValue || null,
        minValue: q.minValue || null,
        options: {
          create: q.options || []
        },
        footnote: q.footnote || null,
        inputPlaceholder: q.inputPlaceholder || null,
      }
    });
  }

/*
  const initialTerms = await prisma.termsAndConditions.upsert({
    where: { id: 'terms-initial-v1' },
    update: {},
    create: {
      id: 'terms-initial-v1',
      title: 'Initial Terms and Conditions',
      content: `Die 4money Financial Services GmbH (kurz 4money), mit der Geschäftsanschrift Einspinnergasse 1/3.OG, 8010 Graz, ist ein von der österreichischen Finanzmarktaufsicht (FMA) konzessioniertes Wertpapierdienstleistungsunternehmen (kurz WPDLU) gemäß §4 Abs. 1 WAG 2018. Das WPDLU ist zur Anlageberatung (gemäß § 3 Abs. 2 Z 1 &amp; WAG 2018) und Annahme und Übermittlung von Aufträgen (§ 3 Abs 2 Z 3 WAG 2018) im Hinblick auf Fondsanteile (gemäß § 1 Z 7 lit c WAG 2018) auch über natürliche Personen gemäß §1 Z45 WAG 2018 berechtigt. Das WPDLU ist nicht Mitglied einer Anleger:innenentschädigungseinrichtung, sondern über eine Vermögensschadenhaftpflichtversicherung mit einer Versicherungssumme von 1.500.000€ pro Jahr und 1.000.000€ pro Schadensfall abgesichert. Das Halten von Kund:innengeldern ist dem WPDLU gesetzlich untersagt.
        Es wird darauf hingewiesen, dass das WPDLU lediglich über einen Geschäftsleiter verfügt. Das WPDLU bietet in Bezug auf Wertpapierdienstleistungen nicht unabhängige Vermittlung- bzw. Beratung auf Provisions- und/oder Honorarbasis an. Das WPDLU hat zwar eine breite Palette von Produkten, kann aber nicht den gesamten Markt abbilden. Eine umfassende Marktuntersuchung, welche sämtliche auf dem Markt befindliche Produkte beinhaltet ist daher nicht geschuldet. Eigenprodukte werden nicht angeboten.
        Seitens des WPDLU besteht keine Pflicht Kund:innenportfolios laufend zu überwachen bzw. die Kund:innen über Veränderungen zu informieren. Daher ist das für das WPDLU nicht möglich laufend festzustellen ob bestimmte Produkte oder Wertpapierdienstleistungen weiterhin angemessen oder geeignet sind. Diesbezügliche Eignungstests können auch ohne Neuveranlagung auf Initiative der Kund:innen einmal jährlich unentgeltlich beim WPDLU gemacht werden. Den Kund:innen wird das Angebot gemacht einmal pro Jahr die Geeignetheit der vermittelten Finanzinstrumente und der damit in Zusammenhang stehenden Portfoliostruktur zu überprüfen.
        Gemäß Wertpapieraufsichtsgesetz 2018 ist das Wertpapierdienstleistungsunternehmen dazu verpflichtet von Kund:innen außer persönlichen Daten auch Informationen über finanziellen Verhältnisse, Kenntnisse und Erfahrungen im Wertpapierbereich, Risikoneigung und Anlageziele im allgemeinen sowie Anlagezweck und Anlagedauer hinsichtlich der beabsichtigten Geschäfte einzuholen und aufzuzeichnen, um ordnungsgemäß beraten und geeignete Produkte vermitteln zu können. Dies soll eine gleichbleibend hohe Servicequalität für Kund:innen sicherstellen und dient nicht zuletzt auch zu deren Schutz. Auch wenn manche Fragen sehr weit gehend erscheinen mögen, ist es zur Gewährleistung einer bestmöglichen Beratung gesetzlich zwingend erforderlich, dass alle Angaben richtig und vollständig sind. Gemäß Art. 54 Abs 8 del VO (EU) 2017/565 in Verbindung mit Richtlinie 2014/65 Artikel 25 Abs. 2 darf das WPDLU keine Anlageberatung machen oder eine Empfehlung für ein geeignetes Produkt abgeben, wenn nicht alle erforderlichen Informationen vorliegen. Treffen Angabe nicht mehr zu, sollten Kund:innen das Wertpapierdienstleistungsunternehmen unverzüglich darüber informieren, damit die Änderungen berücksichtigt werden können.
        Das WPDLU ist kein Steuerberater und überprüft nicht, ob die gewählte Anlageform, die steuerlich günstigste ist. Es wird empfohlen steuerliche Fragen zur Veranlagung mit einem Steuerberater zu besprechen.
        Das Wertpapierdienstleistungsunternehmen ist nicht befugt Zusicherungen zu geben oder Angaben zu machen die von den Verkaufsunterlagen abweichen. Das WPDLU stellt die vereinfachten Verkaufsprospekte bzw. die Basisinformationsblätter sowie alle sonstigen Gesprächsunterlagen kostenlos zur Verfügung. Grundsätzlich werden dem/der Kund:in die Informationen in elektronischer Form zur Verfügung gestellt, auf Anfrage der Kundin bzw. des Kunden werden diese auch in Papierform kostenlos zur Verfügung gestellt.
        Anlageergebnisse in der Vergangenheit sind keine Garantie für zukünftige Ergebnisse.
        Bevor eine Entscheidung für eine bestimmte Anlage getroffen wird, sollten sich Kund:innen anhand der angebotenen Unterlagen und Informationen genau über Eigenheiten, Funktionsweisen und Risiken der Anlagen informieren und ggf. beim WPDLU nachfragen.
        Die Daten von Kund:innen werden absolut vertraulich behandelt und ausschließlich im Sinne der gegenständlichen Kund:innenbeziehung verwendet. Gemäß § 8 WAG 2018 ist das WPDLU sowie für sie tätige Personen zur Verschwiegenheit verpflichtet. Die Verschwiegenheitspflicht darf nur in gesetzlich definierten (Ausnahme)fällen durchbrochen werden.
      `,
      version: 'v1.0',
      termsType: 'INITIAL',
      isActive: true
    }
  })
  console.log("🚀 ~ main ~ initialTerms:", initialTerms)

    // Create products with AI settings
    for (const item of productsWithAI) {
      const createdProduct = await prisma.product.create({
        data: {
          name: item.product.name,
          shortName: item.product.shortName,
          description: item.product.description,
          fileName: item.product.fileName,
          sri: item.product.sri,
          duration: item.product.duration,
          minimumYear: item.product.minimumYear,
          maximumYear: item.product.maximumYear,
          riskType: item.product.riskType as "KONSERVATIV" | "AUSGEWOGEN" | "GEWINNORIENTIERT",
        },
      });
  
      await prisma.aISettings.create({
        data: {
          model: item.ai.model,
          prompt: item.ai.prompt,
          firstMessage: item.ai.firstMessage,
          vectorId: item.ai.vectorId,
          productId: createdProduct.id,
          isActive: true,
        },
      });
    }
  const productTerms = await prisma.termsAndConditions.upsert({
    where: { id: 'terms-product-v1' },
    update: {},
    create: {
      id: 'terms-product-v1',
      title: 'Investment Product Terms',
      content: 'Investment products carry inherent risks. Past performance does not guarantee future results. You may lose some or all of your invested capital. Please ensure you understand the risks before proceeding.',
      version: 'v1.0',
      termsType: 'PRODUCT_SPECIFIC',
      isActive: true
    }
  })
  console.log("🚀 ~ main ~ productTerms:", productTerms)

  console.log('Seeding high-risk countries...');
  for (const country of highRiskCountries) {
    await prisma.highRiskCountry.upsert({
      where: { name: country },
      update: {},
      create: { name: country },
    });
  }

  for (const item of mainProductPrompts) {
    await prisma.mainProductPrompt.create({
      data: {
        mcpUrl: item.mcpUrl,
        aiModel: item.aiModel,
        vectorId: item.vectorId,
        mainPrompt: item.mainPrompt,
      },
    });
  }

  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    await prisma.admin.create({
      data: {
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        birthday: admin.birthday,
        agentNumber: admin.agentNumber,
        password: hashedPassword,
      },
    });
    console.log(`  ✅ Admin created: ${admin.email} (password: ${admin.password})`);
  }


  for (const partner of partners) {
    const hashedPassword = await bcrypt.hash(partner.password, 10);
    await prisma.partner.create({
      data: {
        email: partner.email,
        phone: partner.phone,
        firstName: partner.firstName,
        lastName: partner.lastName,
        birthday: partner.birthday,
        agentNumber: partner.agentNumber,
        password: hashedPassword,
        referralCode: partner.referralCode,
      },
    });
    console.log(`  ✅ Partner created: ${partner.email} (password: ${partner.password}, referralCode: ${partner.referralCode})`);
  }
*/
  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
