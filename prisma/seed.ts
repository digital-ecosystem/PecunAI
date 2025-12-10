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
      footnote:`Bitte geben Sie den Betrag an, den Sie einmalig investieren möchten. Diese Angabe hilft uns, Ihre geplante Investitionshöhe und deren Eignung im Rahmen der Anlageberatung einzuschätzen.`
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
  
  const productsWithAI = [
    // VVKN1 Goal (0–1 years)
    {
      product: {
        name: "VVKN1 Goal Growth Portfolio",
        shortName: "VVKN1",
        description: "Growth-oriented portfolio for short-term goals with slight risk and potential for small gains. Suitable for 0–1 year horizon.",
        fileName: "/products/vvkn1_product_guide.pdf",
        minimumYear: 0,
        maximumYear: 1,
        riskType: "OPPORTUNITY_ORIENTED",
      },
      ai: {
        model: "gpt-5",
        prompt: "You are a financial advisor specializing in short-term growth portfolios. Recommend this product for clients seeking small growth opportunities while maintaining liquidity within 0–1 years.",
        firstMessage: "Welcome to the VVKN1 Goal Growth Portfolio! I'm here to help you achieve your short-term financial goals.",
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN1 Goal Balanced Portfolio",
        shortName: "VVKN1",
        description: "Balanced portfolio for short-term investment goals. Suitable for moderate-risk investors with 0–1 year horizon.",
        fileName: "/products/vvkn1_product_guide.pdf",
        minimumYear: 0,
        maximumYear: 1,
        riskType: "RISK_AWARE",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN1 Goal Balanced Portfolio! I'm here to help you achieve your short-term financial goals.",
        prompt: "You are a financial advisor specializing in balanced short-term investments. Recommend this portfolio for clients seeking a cautious balance between safety and modest returns over 0–1 years.",
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN1 Goal Conservative Portfolio",
        shortName: "VVKN1",
        description: "Conservative portfolio for short-term goals with minimal risk. Suitable for 0–1 year investment horizon.",
        fileName: "/products/vvkn1_product_guide.pdf",
        minimumYear: 0,
        maximumYear: 1,
        riskType: "CONSERVATIVE",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN1 Goal Conservative Portfolio! I'm here to help you achieve your short-term financial goals.",
        prompt: "You are a financial advisor specializing in conservative investment strategies. Recommend this portfolio for clients with very low risk tolerance who need liquidity within 0–1 years. Focus on capital preservation and safety.",
        vectorId: null,
      }
    },

    // VVKN2 Piece of Mind (1–2 years)
    {
      product: {
        name: "VVKN2 Piece of Mind Growth Portfolio",
        shortName: "VVKN2",
        description: "Moderate-growth portfolio for short-term investors seeking returns over 1–2 years.",
        fileName: "/products/vvkn2_product_guide.pdf",
        minimumYear: 1,
        maximumYear: 2,
        riskType: "OPPORTUNITY_ORIENTED",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN2 Piece of Mind Growth Portfolio! I'm here to help you achieve your short-term financial goals.",
        prompt: "You are a financial advisor focusing on short-term growth strategies. Recommend this portfolio for investors with a 1–2 year horizon and moderate appetite for risk.",
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN2 Piece of Mind Balanced Portfolio",
        shortName: "VVKN2",
        description: "Balanced short-term portfolio designed for investors seeking peace of mind and moderate stability.",
        fileName: "/products/vvkn2_product_guide.pdf",
        minimumYear: 1,
        maximumYear: 2,
        riskType: "RISK_AWARE",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN2 Piece of Mind Balanced Portfolio! I'm here to help you achieve your short-term financial goals.",
        prompt: "You are a financial advisor specializing in balanced short-term portfolios. Recommend this for clients who want a steady balance between growth and security over 1–2 years.",
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN2 Piece of Mind Conservative Portfolio",
        shortName: "VVKN2",
        description: "Low-risk portfolio designed for peace of mind investing over 1–2 years.",
        fileName: "/products/vvkn2_product_guide.pdf",
        minimumYear: 1,
        maximumYear: 2,
        riskType: "CONSERVATIVE",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN2 Piece of Mind Conservative Portfolio! I'm here to help you achieve your short-term financial goals.",
        prompt: "You are a financial advisor focusing on low-risk investments. This portfolio is ideal for clients who prioritize peace of mind and minimal volatility over 1–2 years. Emphasize stability and gradual growth.",
        vectorId: null,
      }
    },

    // VVKN3 Balance (3–4 years)
    {
      product: {
        name: "VVKN3 Balance Growth Portfolio",
        shortName: "VVKN3",
        description: "Growth-oriented portfolio for medium-term investment goals over 3–4 years.",
        fileName: "/products/vvkn3_product_guide.pdf",
        minimumYear: 3,
        maximumYear: 4,
        riskType: "OPPORTUNITY_ORIENTED",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN3 Balance Growth Portfolio! I'm here to help you achieve your medium-term financial goals.",
        prompt: "You are a financial advisor specializing in medium-term growth strategies. Recommend this for clients seeking steady returns with moderate risk over 3–4 years.",
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN3 Balance Portfolio",
        shortName: "VVKN3",
        description: "Balanced investment approach for medium-term goals with moderate risk over 3–4 years.",
        fileName: "/products/vvkn3_product_guide.pdf",
        minimumYear: 3,
        maximumYear: 4,
        riskType: "RISK_AWARE",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN3 Balance Portfolio! I'm here to help you achieve your medium-term financial goals.",
        prompt: "You are a financial advisor specializing in balanced investment strategies. This portfolio suits clients with moderate risk tolerance seeking growth over 3–4 years. Balance growth potential with risk management.",
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN3 Balance Conservative Portfolio",
        shortName: "VVKN3",
        description: "Conservative medium-term portfolio for clients focused on capital stability with 3–5 year outlook.",
        fileName: "/products/vvkn3_product_guide.pdf",
        minimumYear: 5,
        maximumYear: null,
        riskType: "CONSERVATIVE",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN3 Balance Conservative Portfolio! I'm here to help you achieve your medium-term financial goals.",
        prompt: "You are a financial advisor emphasizing stability. Recommend this portfolio for clients with a conservative profile seeking low volatility over a 3–5 year period.",
        vectorId: null,
      }
    },

    // VVKN4 Future (5–∞ years)
    {
      product: {
        name: "VVKN4 Future Growth Portfolio",
        shortName: "VVKN4",
        description: "Growth-oriented portfolio for future planning with higher returns over 5+ years.",
        fileName: "/products/vvkn4_product_guide.pdf",
        minimumYear: 5,
        maximumYear: 6,
        riskType: "OPPORTUNITY_ORIENTED",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN4 Future Growth Portfolio! I'm here to help you plan for your long-term financial future.",
        prompt: "You are a financial advisor focused on growth investing. This portfolio is designed for clients planning for the future with moderate-to-high risk tolerance over 5–6 years. Emphasize growth potential and long-term planning.",
        vectorId: null,
      }
    },
    {
      product: {
        name: "VVKN4 Future Balanced Portfolio",
        shortName: "VVKN4",
        description: "Balanced long-term portfolio for investors seeking steady growth beyond 5 years.",
        fileName: "/products/vvkn4_product_guide.pdf",
        minimumYear: 5,
        maximumYear: null,
        riskType: "RISK_AWARE",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN4 Future Balanced Portfolio! I'm here to help you plan for your long-term financial future.",
        prompt: "You are a financial advisor focusing on long-term balanced portfolios. Recommend this for investors with moderate risk tolerance seeking sustained returns beyond 5 years.",
        vectorId: null,
      }
    },

    // VVKN5 Dream Big (7+ years)
    {
      product: {
        name: "VVKN5 Dream Big Growth Portfolio",
        shortName: "VVKN5",
        description: "Dynamic growth strategy for long-term wealth building over 7+ years.",
        fileName: "/products/vvkn5_product_guide.pdf",
        minimumYear: 7,
        maximumYear: null,
        riskType: "OPPORTUNITY_ORIENTED",
      },
      ai: {
        model: "gpt-5",
        firstMessage: "Welcome to the VVKN5 Dream Big Growth Portfolio! I'm here to help you achieve your long-term financial dreams.",
        prompt: "You are a financial advisor specializing in aggressive growth strategies. This portfolio targets clients with high risk tolerance seeking maximum returns over 7+ years. Focus on wealth building and long-term appreciation.",
        vectorId: null,
      }
    },
  ];


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
