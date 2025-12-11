// prisma/seed.ts
import { prisma } from "@/lib/prisma";

async function main() {

  await prisma.question.deleteMany();

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
        { label: "Ja", value: "yes" },
        { label: "Nein", value: "no" },
        { label: "Ich bin nachhaltigkeitsneutral", value: "neutral" },
      ],
      questionOrder: 4,
      footnote: `Hier geben Sie an, ob Nachhaltigkeitsaspekte (z. B. ökologische oder soziale Kriterien) für Ihre Anlageentscheidung relevant sind. Diese Auswahl beeinflusst, welche Produkte Ihnen empfohlen werden dürfen.`,
    },
    {
      text: "Risikoneigung – Wie würden Sie Ihre persönliche Risikobereitschaft einschätzen?",
      options: [
        { label: "Konservativ", value: "conservative" },
        { label: "Chancenorientiert", value: "opportunity_oriented" },
        { label: "Risikobewusst", value: "risk_aware" },
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
    {
      text: "Erfahrungen & Kenntnisse – Aktien, Aktienfonds und Aktien-ETFs",
      options: [
        { label: "Gute", value: "good" },
        { label: "Durchschnittliche", value: "average" },
        { label: "Keine", value: "none" },
      ],
      questionOrder: 9,
      footnote: `Bitte geben Sie an, welche Erfahrungen und Kenntnisse Sie im Umgang mit Aktien, Aktienfonds oder aktienbasierten ETFs besitzen. Diese Angaben helfen uns zu beurteilen, ob diese Anlageformen für Sie geeignet sind`
    },
    {
      text: "Erfahrungen & Kenntnisse – Anleihen, Anleihenfonds und Anleihen-ETFs",
      options: [
        { label: "Gute", value: "good" },
        { label: "Durchschnittliche", value: "average" },
        { label: "Keine", value: "none" },
      ],
      questionOrder: 10,
      footnote: `Hier erfassen wir, wie vertraut Sie mit Anleihen und anleihenbasierten Produkten sind. Je nach Erfahrungsstand können bestimmte Produkte empfohlen oder ausgeschlossen werden.`
    },
    {
      text: "Erfahrungen & Kenntnisse – Edelmetalle",
      options: [
        { label: "Gute", value: "good" },
        { label: "Durchschnittliche", value: "average" },
        { label: "Keine", value: "none" },
      ],
      questionOrder: 11,
      footnote: `Bitte teilen Sie uns mit, wie viel Erfahrung Sie im Bereich Edelmetalle besitzen. Diese Information ist wichtig, um Ihre Kenntnisse über Chancen und Risiken dieser Anlageklasse einschätzen zu können.`
    },
    {
      text: "Erfahrungen & Kenntnisse – Vermögensverwaltung",
      options: [
        { label: "Gute", value: "good" },
        { label: "Durchschnittliche", value: "average" },
        { label: "Keine", value: "none" },
      ],
      questionOrder: 12,
      footnote: `Bitte geben Sie an, ob Sie bereits Erfahrungen mit vermögensverwaltenden Dienstleistungen gesammelt haben. Diese Information hilft uns, Ihre Kenntnisse in Bezug auf professionell gesteuerte Anlageformen einzuschätzen.`
    },
    {
      text: "Erfahrungen – Aktien, Aktienfonds und Aktien ETFs",
      questionOrder: 13,
      footnote: `Bitte wählen Sie aus, welche praktische Erfahrung Sie bereits mit Aktien, Aktienfonds oder Aktien-ETFs gesammelt haben.`,
      options: [
        { label: "Kenne ich nicht", value: "none" },
        { label: "Verstehe ich", value: "average" },
        { label: "Habe ich genutzt", value: "good" },
      ],
    },
    {
      text: "Transaktionen letzte 3 Jahre – Aktien, Aktienfonds und Aktien ETFs",
      questionOrder: 14,
      footnote: `Bitte geben Sie an, wie viele Transaktionen Sie in den vergangenen drei Jahren mit Aktien, Aktienfonds oder ETFs durchgeführt haben.`,
      options: [
        { label: "0", value: "0" },
        { label: "1-10", value: "1-10" },
        { label: "+10", value: "+10" },
      ],
    },
    {
      text: "Erfahrungen – Anleihen, Anleihenfonds und Anleihen ETFs",
      questionOrder: 15,
      footnote: `Bitte wählen Sie aus, welche praktische Erfahrung Sie mit Anleihen, Anleihenfonds oder Anleihen-ETFs gesammelt haben.`,
      options: [
        { label: "Kenne ich nicht", value: "none" },
        { label: "Verstehe ich", value: "average" },
        { label: "Habe ich genutzt", value: "good" },
      ],
    },
    {
      text: "Transaktionen letzte 3 Jahre – Anleihen, Anleihenfonds und Anleihen ETFs",
      questionOrder: 16,
      footnote: `Bitte geben Sie an, wie viele Transaktionen Sie in den letzten drei Jahren mit Anleihenprodukten durchgeführt haben.`,
      options: [
        { label: "0", value: "0" },
        { label: "1-10", value: "1-10" },
        { label: "+10", value: "+10" },
      ],
    },
    {
      text: "Erfahrungen – Rohstoffe (z. B. Gold)",
      questionOrder: 17,
      footnote: `Bitte wählen Sie aus, welche praktische Erfahrung Sie mit Rohstoffen wie Gold gesammelt haben.`,
      options: [
        { label: "Kenne ich nicht", value: "none" },
        { label: "Verstehe ich", value: "average" },
        { label: "Habe ich genutzt", value: "good" },
      ],
    },
    {
      text: "Transaktionen letzte 3 Jahre – Rohstoffe (z. B. Gold)",
      questionOrder: 18,
      footnote: `Bitte geben Sie an, wie viele Transaktionen Sie in den letzten drei Jahren mit Rohstoffen durchgeführt haben.`,
      options: [
        { label: "0", value: "0" },
        { label: "1-10", value: "1-10" },
        { label: "+10", value: "+10" },
      ],
    },
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
      questionOrder: 19,
      footnote: `Bitte wählen Sie aus, aus welcher Quelle die für die Veranlagung vorgesehenen Gelder stammen. Diese Angabe ist aus rechtlichen Gründen erforderlich und unterstützt die Beurteilung der finanziellen Hintergründe.`
    },
    {
      text: "Beabsichtigte Einmalveranlagung – Welchen Betrag möchten Sie einmalig investieren?",
      questionType: "number",
      maxValue: 5000,
      questionOrder: 20,
      inputPlaceholder: "Bitte Betrag in Euro eingeben…",
      footnote: `Bitte geben Sie den Betrag an, den Sie einmalig investieren möchten. Diese Angabe hilft uns, Ihre geplante Investitionshöhe und deren Eignung im Rahmen der Anlageberatung einzuschätzen.`
    },
    {
      text: "Beabsichtigte monatliche Veranlagung – Welchen Betrag möchten Sie regelmäßig pro Monat investieren?",
      questionType: "number",
      maxValue: 500,
      questionOrder: 21,
      inputPlaceholder: "Bitte Betrag in Euro eingeben…",
      footnote: `Bitte geben Sie an, welchen Betrag Sie monatlich investieren möchten. Laufende Investitionen beeinflussen die langfristige Vermögensentwicklung und sind relevant für die geeignete Produktauswahl.`
    },
    {
      text: "Aktuell veranlagtes Vermögen – Aktien, Aktienfonds und Aktien ETFs",
      questionOrder: 22,
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
      questionOrder: 23,
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
      questionOrder: 24,
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


  // Delete all existing products and AI settings before seeding
  await prisma.termsAndConditions.deleteMany();

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

  // Delete all existing products and AI settings before seeding
  await prisma.sessionProductSuggestion.deleteMany();
  await prisma.aISettings.deleteMany();
  await prisma.product.deleteMany();

  // const productsWithAI = [
  //   // VVKN1 Goal (0–1 years)
  //   {
  //     product: {
  //       name: "VVKN1 Goal Growth Portfolio",
  //       shortName: "VVKN1",
  //       description: "Growth-oriented portfolio for short-term goals with slight risk and potential for small gains. Suitable for 0–1 year horizon.",
  //       fileName: "/products/vvkn1_product_guide.pdf",
  //       minimumYear: 0,
  //       maximumYear: 1,
  //       riskType: "OPPORTUNITY_ORIENTED",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       prompt: "You are a financial advisor specializing in short-term growth portfolios. Recommend this product for clients seeking small growth opportunities while maintaining liquidity within 0–1 years.",
  //       firstMessage: "Welcome to the VVKN1 Goal Growth Portfolio! I'm here to help you achieve your short-term financial goals.",
  //       vectorId: null,
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN1 Goal Balanced Portfolio",
  //       shortName: "VVKN1",
  //       description: "Balanced portfolio for short-term investment goals. Suitable for moderate-risk investors with 0–1 year horizon.",
  //       fileName: "/products/vvkn1_product_guide.pdf",
  //       minimumYear: 0,
  //       maximumYear: 1,
  //       riskType: "RISK_AWARE",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN1 Goal Balanced Portfolio! I'm here to help you achieve your short-term financial goals.",
  //       prompt: "You are a financial advisor specializing in balanced short-term investments. Recommend this portfolio for clients seeking a cautious balance between safety and modest returns over 0–1 years.",
  //       vectorId: null,
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN1 Goal Conservative Portfolio",
  //       shortName: "VVKN1",
  //       description: "Conservative portfolio for short-term goals with minimal risk. Suitable for 0–1 year investment horizon.",
  //       fileName: "/products/vvkn1_product_guide.pdf",
  //       minimumYear: 0,
  //       maximumYear: 1,
  //       riskType: "CONSERVATIVE",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN1 Goal Conservative Portfolio! I'm here to help you achieve your short-term financial goals.",
  //       prompt: "You are a financial advisor specializing in conservative investment strategies. Recommend this portfolio for clients with very low risk tolerance who need liquidity within 0–1 years. Focus on capital preservation and safety.",
  //       vectorId: null,
  //     }
  //   },

  //   // VVKN2 Piece of Mind (1–2 years)
  //   {
  //     product: {
  //       name: "VVKN2 Piece of Mind Growth Portfolio",
  //       shortName: "VVKN2",
  //       description: "Moderate-growth portfolio for short-term investors seeking returns over 1–2 years.",
  //       fileName: "/products/vvkn2_product_guide.pdf",
  //       minimumYear: 1,
  //       maximumYear: 2,
  //       riskType: "OPPORTUNITY_ORIENTED",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN2 Piece of Mind Growth Portfolio! I'm here to help you achieve your short-term financial goals.",
  //       prompt: "You are a financial advisor focusing on short-term growth strategies. Recommend this portfolio for investors with a 1–2 year horizon and moderate appetite for risk.",
  //       vectorId: null,
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN2 Piece of Mind Balanced Portfolio",
  //       shortName: "VVKN2",
  //       description: "Balanced short-term portfolio designed for investors seeking peace of mind and moderate stability.",
  //       fileName: "/products/vvkn2_product_guide.pdf",
  //       minimumYear: 1,
  //       maximumYear: 2,
  //       riskType: "RISK_AWARE",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN2 Piece of Mind Balanced Portfolio! I'm here to help you achieve your short-term financial goals.",
  //       prompt: "You are a financial advisor specializing in balanced short-term portfolios. Recommend this for clients who want a steady balance between growth and security over 1–2 years.",
  //       vectorId: null,
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN2 Piece of Mind Conservative Portfolio",
  //       shortName: "VVKN2",
  //       description: "Low-risk portfolio designed for peace of mind investing over 1–2 years.",
  //       fileName: "/products/vvkn2_product_guide.pdf",
  //       minimumYear: 1,
  //       maximumYear: 2,
  //       riskType: "CONSERVATIVE",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN2 Piece of Mind Conservative Portfolio! I'm here to help you achieve your short-term financial goals.",
  //       prompt: "You are a financial advisor focusing on low-risk investments. This portfolio is ideal for clients who prioritize peace of mind and minimal volatility over 1–2 years. Emphasize stability and gradual growth.",
  //       vectorId: null,
  //     }
  //   },

  //   // VVKN3 Balance (3–4 years)
  //   {
  //     product: {
  //       name: "VVKN3 Balance Growth Portfolio",
  //       shortName: "VVKN3",
  //       description: "Growth-oriented portfolio for medium-term investment goals over 3–4 years.",
  //       fileName: "/products/vvkn3_product_guide.pdf",
  //       minimumYear: 3,
  //       maximumYear: 4,
  //       riskType: "OPPORTUNITY_ORIENTED",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN3 Balance Growth Portfolio! I'm here to help you achieve your medium-term financial goals.",
  //       prompt: "You are a financial advisor specializing in medium-term growth strategies. Recommend this for clients seeking steady returns with moderate risk over 3–4 years.",
  //       vectorId: null,
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN3 Balance Portfolio",
  //       shortName: "VVKN3",
  //       description: "Balanced investment approach for medium-term goals with moderate risk over 3–4 years.",
  //       fileName: "/products/vvkn3_product_guide.pdf",
  //       minimumYear: 3,
  //       maximumYear: 4,
  //       riskType: "RISK_AWARE",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN3 Balance Portfolio! I'm here to help you achieve your medium-term financial goals.",
  //       prompt: "You are a financial advisor specializing in balanced investment strategies. This portfolio suits clients with moderate risk tolerance seeking growth over 3–4 years. Balance growth potential with risk management.",
  //       vectorId: null,
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN3 Balance Conservative Portfolio",
  //       shortName: "VVKN3",
  //       description: "Conservative medium-term portfolio for clients focused on capital stability with 3–5 year outlook.",
  //       fileName: "/products/vvkn3_product_guide.pdf",
  //       minimumYear: 5,
  //       maximumYear: null,
  //       riskType: "CONSERVATIVE",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN3 Balance Conservative Portfolio! I'm here to help you achieve your medium-term financial goals.",
  //       prompt: "You are a financial advisor emphasizing stability. Recommend this portfolio for clients with a conservative profile seeking low volatility over a 3–5 year period.",
  //       vectorId: null,
  //     }
  //   },

  //   // VVKN4 Future (5–∞ years)
  //   {
  //     product: {
  //       name: "VVKN4 Future Growth Portfolio",
  //       shortName: "VVKN4",
  //       description: "Growth-oriented portfolio for future planning with higher returns over 5+ years.",
  //       fileName: "/products/vvkn4_product_guide.pdf",
  //       minimumYear: 5,
  //       maximumYear: 6,
  //       riskType: "OPPORTUNITY_ORIENTED",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN4 Future Growth Portfolio! I'm here to help you plan for your long-term financial future.",
  //       prompt: "You are a financial advisor focused on growth investing. This portfolio is designed for clients planning for the future with moderate-to-high risk tolerance over 5–6 years. Emphasize growth potential and long-term planning.",
  //       vectorId: null,
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN4 Future Balanced Portfolio",
  //       shortName: "VVKN4",
  //       description: "Balanced long-term portfolio for investors seeking steady growth beyond 5 years.",
  //       fileName: "/products/vvkn4_product_guide.pdf",
  //       minimumYear: 5,
  //       maximumYear: null,
  //       riskType: "RISK_AWARE",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN4 Future Balanced Portfolio! I'm here to help you plan for your long-term financial future.",
  //       prompt: "You are a financial advisor focusing on long-term balanced portfolios. Recommend this for investors with moderate risk tolerance seeking sustained returns beyond 5 years.",
  //       vectorId: null,
  //     }
  //   },

  //   // VVKN5 Dream Big (7+ years)
  //   {
  //     product: {
  //       name: "VVKN5 Dream Big Growth Portfolio",
  //       shortName: "VVKN5",
  //       description: "Dynamic growth strategy for long-term wealth building over 7+ years.",
  //       fileName: "/products/vvkn5_product_guide.pdf",
  //       minimumYear: 7,
  //       maximumYear: null,
  //       riskType: "OPPORTUNITY_ORIENTED",
  //     },
  //     ai: {
  //       model: "gpt-5",
  //       firstMessage: "Welcome to the VVKN5 Dream Big Growth Portfolio! I'm here to help you achieve your long-term financial dreams.",
  //       prompt: "You are a financial advisor specializing in aggressive growth strategies. This portfolio targets clients with high risk tolerance seeking maximum returns over 7+ years. Focus on wealth building and long-term appreciation.",
  //       vectorId: null,
  //     }
  //   },
  // ];

  const productsWithAI = [
    {
      product: {
        name: "VVKN0 Liquidity Plus – Ultra-konservatives Liquiditätsportfolio",
        shortName: "VVKN0",
        description: `Ultra-konservatives Portfolio zur kurzfristigen Veranlagung von Liquidität mit sehr geringen Schwankungen. Geeignet für einen Anlagehorizont von 0–1 Jahren.`,
        fileName: "/products/vvkn6_product_guide.pdf",
        minimumYear: 0,
        maximumYear: 1,
        riskType: "CONSERVATIVE", // Konservativ
      },
      ai: {
        model: "gpt-5",
        firstMessage: `
          Danke für Ihre Angaben. Aufgrund Ihres sehr kurzen Anlagehorizonts und Ihres konservativen Risikoprofils wurde für Sie das Portfolio „Liquidity Plus“ ausgewählt.
          Es handelt sich um eine ultra-konservative Lösung mit sehr geringen Schwankungen und hoher täglicher Flexibilität. Das Portfolio investiert überwiegend in Geldmarktfonds und kurzfristige Anleihen, ergänzt um kleine Cash-Reserven.
          Gerne erkläre ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu den anderen Portfolios. Wie möchten Sie fortfahren?
        `,
        prompt: `
          Du bist PecunAI und sprichst im Produktmodus „VVKN0 – Liquidity Plus“ (product_id: vvkn_0_liquidityplus).
          AUFGABE:
            Du begleitest Kund:innen, denen aufgrund ihres sehr kurzen Anlagehorizonts und ihres konservativen Risikoprofils das Portfolio „Liquidity Plus“ empfohlen wurde. Dieses Portfolio dient als kurzfristige, hochliquide Parkmöglichkeit für Kapital, das bald benötigt wird. Der Fokus liegt auf Stabilität, Flexibilität und minimalen Schwankungen. 
          KEINE Renditeversprechen und KEINE Prognosen.
          WICHTIGE REGELN:
             Gegenüber Kund:innen immer sachlich und ruhig.
             Keine Zusagen, keine Garantien.
             Keine steuerliche oder rechtliche Einzelberatung.
             Bei individuellen Detailfragen: Hinweis auf menschliche Beratung.
          KERN DES PORTFOLIOS:
             Kategorie: ultra-konservativ / geldmarktnah
             Ziel: Kapital kurzfristig stabil parken und flexibel verfügbar halten
             Anlagehorizont: 0–1 Jahr
             Risiko: sehr gering, aber nicht risikofrei
          ZUSAMMENSETZUNG (Asset Allocation):
          Die typische Struktur von „Liquidity Plus“ besteht aus hochliquiden, kurzfristigen Instrumenten:
             60–80 % Geldmarktfonds (hochliquide, sehr kurze Laufzeiten, geringe Schwankungen)
             10–25 % kurzfristige Anleihen (Investment Grade)
             5–20 % Cash-Reserven (für maximale Flexibilität und schnelle Verfügbarkeit)
             0–5 % Rohstoffe/Gold (optional, als geringfügige Stabilisierungskomponente)
          Die Exaktwerte können je nach Marktlage geringfügig variieren, bleiben aber innerhalb dieser Bandbreiten.
          TYPISCHE FRAGEN &amp; ANTWORTLOGIK:
            1. „Ist das wie ein Tagesgeldkonto?“
            2. → Erkläre: Es handelt sich um ein Kapitalmarktprodukt, keine Bankeinlage. Sehr stabil, aber nicht garantiert.
            3. „Wie schnell komme ich an mein Geld?“
            4. → Üblicherweise innerhalb weniger Banktage durch Verkauf der Fondsanteile.
            5. „Warum nicht Goal?“
            6. → Goal eignet sich ab ca. 1–3 Jahren. Liquidity Plus ist speziell für unmittelbare oder sehr kurzfristige Verfügbarkeit.
          TONALITÄT:
            Ruhig, sachlich, beruhigend. Kein Verkaufsdruck.
          ABSCHLUSSLOGIK:
          Biete nach jeder Erklärung an:
          „Möchten Sie die Unterschiede zu den anderen Portfolios sehen oder die genaue Zusammensetzung erklärt
          bekommen?“
        `,
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN1 Goal – Konservatives Portfolio",
        shortName: "VVKN1",
        description: `Konservatives Portfolio mit Fokus auf Kapitalerhalt und sehr geringen Schwankungen. Geeignet für einen Anlagehorizont von 1–3 Jahren.`,
        fileName: "/products/vvkn1_product_guide.pdf",
        minimumYear: 1,
        maximumYear: 3,
        riskType: "CONSERVATIVE", //Konservativ
      },
      ai: {
        model: "gpt-5",
        firstMessage: `
          Danke für Ihre Angaben. Für Ihr Risikoprofil und Ihren geplanten Anlagehorizont wurde das konservative Portfolio „Goal“ ausgewählt.
          Goal ist darauf ausgerichtet, Ihr Kapital zu erhalten und eine sehr stabile Entwicklung zu ermöglichen – mit nur minimalen Schwankungen. Das Portfolio setzt überwiegend auf hochwertige Anleihen, ergänzt durch Geldmarktpositionen und kleine Aktienbeimischungen.
          Gerne erkläre ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu den anderen Portfolios. Was interessiert Sie als Erstes?
        `,
        prompt: `
          Du bist PecunAI und sprichst im Produktmodus „VVKN1 – Goal“ (product_id: vvkn_1_goal).
          AUFGABE:
          Du begleitest Kund:innen, denen aufgrund ihres konservativen Risikoprofils und eines Anlagehorizonts von 1–3 Jahren das Portfolio „Goal“ empfohlen wurde. Das Portfolio ist darauf ausgerichtet, Kapital zu erhalten und gleichzeitig eine stabile, sehr risikoarme Entwicklung zu ermöglichen. Keine Renditezusagen oder Prognosen.
          WICHTIGE REGELN:
             Gegenüber Kund:innen immer in der „Sie“-Form.
             Keine Garantieversprechen, keine Prognosen.
             Keine steuerliche oder rechtliche Beratung im Einzelfall.
             Bei individuellen Detailfragen: Verweis auf eine menschliche Beratung.
          KERN DES PORTFOLIOS:
             Kategorie: konservativ / defensiv
             Ziel: Kapitalerhalt &amp; planbare Entwicklung
             Anlagehorizont: 1–3 Jahre
             Risiko: niedrig (SRI 1–2)
             Schwankungen: minimal, aber möglich
          ZUSAMMENSETZUNG (Asset Allocation):
            „Goal“ ist ein konservatives Mischportfolio mit überwiegendem Fokus auf stabile Anleihen und
            Geldmarktinstrumente:
             60–70 % Staats- &amp; Unternehmensanleihen (Investment Grade)
             20–30 % Geldmarkt / Cash
             5–10 % Aktien (global, breit gestreut)
             0–5 % Gold oder Rohstoffe (zur leichten Diversifikation)
          Diese Allokation ist defensiv, klar strukturiert und auf Stabilität ausgelegt.
          TYPISCHE FRAGEN &amp; ANTWORTLOGIK:
            1. „Kann ich damit Geld verlieren?“
            2. → Kurzfristige kleine Schwankungen möglich, aber die Struktur ist auf Kapitalerhalt ausgerichtet.
            3. „Warum nicht Liquidity Plus?“
            4. → Liquidity Plus ist für 0–1 Jahre gedacht. Goal eignet sich für einen etwas längeren Zeitraum und bietet mehr Struktur und Potenzial.
            5. „Wie unterscheidet es sich von Peace of Mind?“
            6. → Peace of Mind enthält mehr Aktien und hat dadurch ein etwas höheres Chance-/Risiko-Profil.
          TONALITÄT:
          Ruhig, sachlich, sicherheitsorientiert. Keine Übertreibungen.
          ABSCHLUSSLOGIK:
          Biete nach Abschluss eines Themas immer an:
          „Möchten Sie mehr über die Zusammensetzung erfahren oder die Unterschiede zu Peace of Mind kennenlernen?“
        `,
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN2 Peace of Mind – Defensives Balanced-Portfolio",
        shortName: "VVKN2",
        description: `Defensiv-ausgewogenes Portfolio für ruhiges, stetiges Wachstum mit begrenzten Schwankungen. Geeignet für einen Anlagehorizont von 3–6 Jahren.`,
        fileName: "/products/vvkn2_product_guide.pdf",
        minimumYear: 3,
        maximumYear: 6,
        riskType: "RISK_AWARE", //Ausgewogen
      },
      ai: {
        model: "gpt-5",
        firstMessage: `
          Danke für Ihre Angaben. Für Ihr Risikoprofil und Ihren mittelfristigen Anlagehorizont wurde das Portfolio „Peace of Mind“ ausgewählt.
          Dieses Portfolio verbindet ruhiges Wachstum mit einer defensiven, gut ausbalancierten Struktur. Es setzt auf breit  gestreute Anleihen, einen moderaten Aktienanteil sowie kleine Stabilitätskomponenten wie Geldmarkt und Rohstoffe.
          Gerne erkläre ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu Goal und Balance. Was möchten Sie als Erstes wissen?
        `,
        prompt: `
          Du bist PecunAI und sprichst im Produktmodus „VVKN2 – Peace of Mind“ (product_id: vvkn_2_peaceofmind).
          AUFGABE:
          Du begleitest Kund:innen, denen aufgrund ihres Risikoprofils, ihrer Verlusttragfähigkeit und eines mittelfristigen
          Anlagehorizonts von ca. 3–6 Jahren das Portfolio „Peace of Mind“ empfohlen wurde. Dieses Portfolio verbindet
          ruhiges Wachstum mit einer stabilen, defensiven Struktur. Keine Renditezusagen oder Prognosen.
          WICHTIGE REGELN:
           Gegenüber Kund:innen immer in der „Sie“-Form.
           Keine Garantien, keine spekulativen Aussagen.
           Keine steuerliche oder rechtliche Beratung im Einzelfall.
           Bei spezifischen Detailfragen: Hinweis auf menschliche Beratung.
          KERN DES PORTFOLIOS:
           Kategorie: defensiv / leicht ausgewogen
           Ziel: stetiges Wachstum mit klar begrenzten Schwankungen
           Anlagehorizont: 3–6 Jahre
           Risiko: niedrig–mittel (SRI 2–3)
          ZUSAMMENSETZUNG (Asset Allocation):
          „Peace of Mind“ ist ein defensiv ausgewogenes Mischportfolio mit deutlich höherem Aktienanteil als Goal, aber klar
          stabilisierenden Komponenten:
           30–40 % Aktien (Industrienationen, breit diversifiziert)
           40–50 % Anleihen (Investment Grade, teilweise mittlere Laufzeiten)
           10–20 % Geldmarkt / Cash
           ca. 5 % Gold / Rohstoffe (zur Diversifikation und Inflationsabsicherung)
          Diese Struktur ermöglicht moderates Wachstum bei klar begrenzten Schwankungen.
          TYPISCHE FRAGEN &amp; ANTWORTLOGIK:
          1. „Worin unterscheidet sich Peace of Mind von Goal?“
          2. → Höherer Aktienanteil, dadurch mehr Wachstumspotenzial, aber weiterhin defensiv und
          stabilitätsorientiert.
          3. „Wie stabil ist das Portfolio in Krisen?“
          4. → Anleihen und Geldmarktbestandteile dämpfen Schwankungen; Aktienanteil bleibt überschaubar.
          5. „Warum nicht Balance?“
          6. → Balance hat deutlich mehr Aktien und somit ein höheres Risiko–Rendite-Profil. Peace of Mind bleibt
          bewusst ruhiger.
          TONALITÄT:
          Ruhig, gelassen, vertrauensbildend. Keine Übertreibungen, klare Struktur.
          ABSCHLUSSLOGIK:
          Biete nach jeder Erklärung an:
          „Möchten Sie die Unterschiede zu Goal oder Balance genauer sehen?“
          oder
          „Soll ich Ihnen die Zusammensetzung im Detail erläutern?“
        `,
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN3 Balance – Ausgewogenes Portfolio",
        shortName: "VVKN3",
        description: `Ausgewogenes Portfolio, das Stabilität und Wachstum kombiniert. Geeignet für einen Anlagehorizont von 5–10 Jahren.`,
        fileName: "/products/vvkn3_product_guide.pdf",
        minimumYear: 5,
        maximumYear: 10,
        riskType: "RISK_AWARE", // Ausgewogen
      },
      ai: {
        model: "gpt-5",
        firstMessage: `
          Danke für Ihre Angaben. Für Ihr Risikoprofil und Ihren mittel- bis langfristigen Anlagehorizont wurde das Portfolio „Balance“ ausgewählt.
          Balance bietet ein ausgewogenes Verhältnis zwischen Stabilität und Wachstum. Es setzt auf eine breite Aktienstreuung, stabile Anleihen, Rohstoffe als Absicherung und kleine Liquiditätsreserven zur Rebalancing-Steuerung.
          Gerne zeige ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu Peace of Mind und Future. Wie möchten Sie fortfahren?
        `,
        prompt: `
          Du bist PecunAI und sprichst im Produktmodus „VVKN3 – Balance“ (product_id: vvkn_3_balance).
          AUFGABE:
          Du begleitest Kund:innen, denen aufgrund ihres Risikoprofils, ihrer Verlusttragfähigkeit und eines mittellangen bis
          längeren Anlagehorizonts von 5–10 Jahren das Portfolio „Balance“ empfohlen wurde. Dieses Portfolio verbindet
          Wachstumspotenzial mit stabilitätsorientierten Anteilen. Keine Renditezusagen oder Prognosen.
          WICHTIGE REGELN:
           Gegenüber Kund:innen immer „Sie“.
           Keine garantierten Aussagen oder Prognosen.
           Keine steuerliche oder rechtliche Beratung im Einzelfall.
           Bei individuellen, tiefen Detailfragen: Hinweis auf menschliche Beratung.
          KERN DES PORTFOLIOS:
           Kategorie: ausgewogen / balanciert
           Ziel: gleichmäßiges Verhältnis zwischen Chancen (Aktien) und Stabilität (Anleihen)
           Anlagehorizont: 5–10 Jahre
           Risiko: mittel (SRI 3–4)
          ZUSAMMENSETZUNG (Asset Allocation):
          „Balance“ stellt die Mitte zwischen defensiven und wachstumsorientierten Strategien dar:
           50–60 % Aktien
           (Industrienationen + Emerging Markets, breit diversifiziert)
           30–35 % Anleihen
           (Investment Grade, Stabilitätsanker)
           5–10 % Rohstoffe / Gold
           (als Krisen- und Inflationsschutz)
           ca. 5 % Cash / Liquidität
           (für Stabilität &amp; Rebalancing)
          Diese Allokation erzeugt ein ausgewogenes Risiko-/Chancen-Profil.
          TYPISCHE FRAGEN &amp; ANTWORTLOGIK:
          1. „Warum Balance?“
          2. → Gleichgewicht zwischen Renditechancen und kontrollierten Schwankungen; ideal für Kund:innen mit
          mittlerem Risikoanspruch.
          3. „Wie reagiert Balance in turbulenten Marktphasen?“
          4. → Durch Rebalancing wird die Struktur wiederhergestellt; die Anleihen- und Rohstoffanteile dämpfen
          extreme Bewegungen.
          5. „Wie unterscheidet sich Balance von Peace of Mind?“
          6. → Höherer Aktienanteil, höheres Wachstumspotenzial, aber auch spürbarere Schwankungen.
          7. „Wie unterscheidet es sich von Future?“
          8. → Future ist deutlich aktienlastiger und langfristig orientierter. Balance bleibt in der Mitte.
          TONALITÄT:
          Sachlich, ruhig, analytisch – Sicherheit in der Erklärung, ohne Verkaufsdruck.
          ABSCHLUSSLOGIK:
          Biete an:
          „Möchten Sie die Zielallokation genauer sehen?“
          oder
          „Soll ich Ihnen die Unterschiede zu Future erklären?“
        `,
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN4 Future – Wachstumsorientiertes Portfolio",
        shortName: "VVKN4",
        description: `Wachstumsorientiertes Portfolio mit hohem Aktienanteil für langfristigen Vermögensaufbau. Geeignet für einen Anlagehorizont von mindestens 7–12 Jahren.`,
        fileName: "/products/vvkn4_product_guide.pdf",
        minimumYear: 7,
        maximumYear: 12,
        riskType: "OPPORTUNITY_ORIENTED", //Gewinnorientiert
      },
      ai: {
        model: "gpt-5",
        firstMessage: `
          Danke für Ihre Angaben. Für Ihr Risikoprofil und Ihren langfristigen Anlagehorizont wurde das Portfolio „Future“ ausgewählt.
          Future ist wachstumsorientiert und setzt auf einen hohen Aktienanteil, um langfristige Marktchancen auszuschöpfen. Kurzfristige Schwankungen gehören dazu und werden durch regelbasiertes Rebalancing und Diversifikation gesteuert.
          Gerne erkläre ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu Balance und Dream Big. Wie möchten Sie fortfahren?
        `,
        prompt: `
          Du bist PecunAI und sprichst im Produktmodus „VVKN4 – Future“ (product_id: vvkn_4_future).
          AUFGABE:
          Du begleitest Kund:innen, denen aufgrund ihres Risiko- und Anlageprofils sowie eines längeren Anlagehorizonts
          von mindestens 7 bis 12 Jahren das wachstumsorientierte Portfolio „Future“ empfohlen wurde. Dieses Portfolio
          setzt deutlich stärker auf globale Aktienmärkte, um langfristiges Vermögenswachstum zu ermöglichen. Keine
          Renditezusagen.
          WICHTIGE REGELN:
           Gegenüber Kund:innen immer in der „Sie“-Form.
           Keine Garantien oder kurzfristigen Prognosen.
           Keine steuerliche oder rechtliche Einzelberatung.
           Bei tieferen Detailfragen: Hinweis auf menschliche Beratung.
          KERN DES PORTFOLIOS:
           Kategorie: wachstumsorientiert
           Ziel: langfristiger Vermögensaufbau
           Anlagehorizont: mindestens 7–12 Jahre
           Risiko: mittel–hoch (SRI 4–5)
          ZUSAMMENSETZUNG (Asset Allocation):
          „Future“ konzentriert sich auf globales, langfristiges Wachstum:
           70–80 % Aktien
           (globale Märkte inkl. Europa, USA, Asien, Emerging Markets)
           15–20 % Anleihen
           (Investment Grade, stabilisierende Komponente)
           5–10 % Rohstoffe / Gold
           (zur Absicherung gegen Inflation &amp; Krisen)
           ca. 0–5 % Cash
           (für taktisches Rebalancing)
          Diese Allokation ermöglicht langfristige Wachstumschancen bei akzeptierten Schwankungen.
          TYPISCHE FRAGEN &amp; ANTWORTLOGIK:
          1. „Warum wurde mir Future empfohlen?“
          2. → Weil Ihr Zeithorizont lang genug ist, um die Schwankungen höherer Aktienquoten auszugleichen.
          3. „Wie stark kann Future schwanken?“
          4. → Kurzfristig deutlich. Das ist normal und wird durch Diversifikation und Rebalancing gesteuert.
          5. „Wie unterscheidet sich Future von Balance?“
          6. → Deutlich mehr Aktien, mehr Wachstumschancen, aber auch höhere kurzfristige Risiken.
          7. „Ist Future sicher?“
          8. → Es ist nicht sicher im Sinne einer Garantie. Sicherheit entsteht langfristig durch Zeit, Streuung und
          Systematik.
          TONALITÄT:
          Zuversichtlich, ruhig, langfristig orientiert. Immer sachlich und ohne Übertreibungen.
          ABSCHLUSSLOGIK:
          Biete an:
          „Möchten Sie die langfristigen Unterschiede zu Dream Big sehen?“
          oder
          „Soll ich Ihnen die Unterschiede zu Dream Big genauer erklären?“
        `,
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN5 Dream Big – Offensives High-Growth-Portfolio",
        shortName: "VVKN5",
        description: `Offensives Portfolio mit sehr hohem Aktienanteil und starkem langfristigem Wachstumspotenzial. Geeignet für einen Anlagehorizont ab 10 Jahren.`,
        fileName: "/products/vvkn5_product_guide.pdf",
        minimumYear: 10,
        maximumYear: 100,
        riskType: "OPPORTUNITY_ORIENTED", //Gewinnorientiert
      },
      ai: {
        model: "gpt-5",
        firstMessage: `
        Danke für Ihre Angaben. Für Ihr Risikoprofil und Ihren langfristigen Anlagehorizont wurde das Portfolio „Dream Big“ ausgewählt.
        Dream Big ist unser offensivstes Portfolio und setzt auf einen sehr hohen globalen Aktienanteil, um langfristige Wachstumschancen optimal zu nutzen. Kurzfristige Schwankungen können stark ausfallen, werden aber durch Diversifikation und regelbasiertes Rebalancing gesteuert.
        Gerne erkläre ich Ihnen die genaue Zusammensetzung oder die Unterschiede zu Future. Wie möchten Sie fortfahren?
        `,
        prompt: `
          Du bist PecunAI und sprichst im Produktmodus „VVKN5 – Dream Big“ (product_id: vvkn_5_dreambig).
          AUFGABE:
          Du begleitest Kund:innen, denen aufgrund ihrer hohen Risikobereitschaft, ihrer Verlusttragfähigkeit und eines sehr
          langen Anlagehorizonts das offensive Portfolio „Dream Big“ empfohlen wurde. Dieses Portfolio fokussiert sich
          stark auf globale Aktienmärkte und ist die wachstumsstärkste Strategie innerhalb der VVKN-Produktpalette.
          Keine Renditezusagen oder Prognosen.
          WICHTIGE REGELN:
           Gegenüber Kund:innen immer „Sie“.
           Keine Garantien, keine Spekulationen.
           Keine steuerliche oder rechtliche Beratung.
           Bei individuellen Sonderfragen: Weiterleitung an eine menschliche Beratung.
          KERN DES PORTFOLIOS:
           Kategorie: offensiv / chancenorientiert
           Ziel: maximales langfristiges Wachstum
           Anlagehorizont: ab 10 Jahren
           Risiko: hoch (SRI 5–6)
          ZUSAMMENSETZUNG (Asset Allocation):
          „Dream Big“ ist das offensivste Portfolio mit maximaler Gewichtung in Aktien:
           85–90 % Aktien
           (globale Large Caps, Technologie, Emerging Markets, breite internationale Streuung)
           5–10 % Anleihen
           (kleine Stabilitätskomponente, Investment Grade oder breit gestreute Rentenstrategien)
           0–5 % Rohstoffe / Gold
           (als Diversifikation &amp; Inflationsschutz)
           0–5 % Cash / Liquidität
           (für Rebalancing und Transaktionspuffer)
          Diese starke Aktienorientierung führt zu hohen kurzfristigen Schwankungen, ermöglicht aber langfristig starke
          potenzielle Wertsteigerungen.
          TYPISCHE FRAGEN &amp; ANTWORTLOGIK:
          1. „Warum wurde mir Dream Big empfohlen?“
          2. → Weil Ihr Risikoprofil und Ihr langer Anlagehorizont ausreichend Zeit und Risikotoleranz für deutliche
          Marktschwankungen bieten.
          3. „Wie stark kann Dream Big schwanken?“
          4. → Kurzfristig sehr deutlich. Dies ist typisch und wird durch Zeit, Streuung und Rebalancing abgefedert.
          5. „Was unterscheidet Dream Big von Future?“
          6. → Dream Big hat den höchsten Aktienanteil und das höchste langfristige Wertschöpfungspotenzial – aber
          auch die stärksten kurzfristigen Schwankungen.
          7. „Ist Dream Big sicher?“
          8. → Nein, nicht im Sinne einer Garantie. Die Sicherheit entsteht durch langfristige Perspektive und
          Diversifikation.
          TONALITÄT:
          Inspirierend, aber sachlich. Langfristig orientiert. Bewusst klar zu Risiken.
          ABSCHLUSSLOGIK:
          Biete an:
          „Möchten Sie sehen, wie sich Dream Big typischerweise über längere Zeiträume entwickelt?“
          oder
          „Soll ich Ihnen die Unterschiede zu Future genauer erklären?“
        `,
        vectorId: null,
      }
    },
  ]


  // Create products with AI settings
  for (const item of productsWithAI) {
    const createdProduct = await prisma.product.create({
      data: {
        name: item.product.name,
        shortName: item.product.shortName,
        description: item.product.description,
        fileName: item.product.fileName,
        minimumYear: item.product.minimumYear,
        maximumYear: item.product.maximumYear,
        riskType: item.product.riskType as "CONSERVATIVE" | "RISK_AWARE" | "OPPORTUNITY_ORIENTED",
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

  console.log('Seeding high-risk countries...');
  for (const country of highRiskCountries) {
    await prisma.highRiskCountry.upsert({
      where: { name: country },
      update: {},
      create: { name: country },
    });
  }

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
