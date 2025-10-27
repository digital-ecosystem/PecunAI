// prisma/seed.ts
// import { PrismaClient } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// const prisma = new PrismaClient();

async function main() {
  // const questions = [
  //   {
  //     text: 'What type of document do you need to prepare and sign?',
  //     options: [
  //       { label: 'Sales contract', value: 'sales_contract' },
  //       { label: 'Employment contract', value: 'employment_contract' },
  //       { label: 'NDA / confidentiality agreement', value: 'nda_confidentiality' },
  //       { label: 'Other legal agreement', value: 'other_legal' },
  //     ]
  //   },
  //   {
  //     text: 'How many parties must sign this document?',
  //     options: [
  //       { label: 'Just me', value: 'just_me' },
  //       { label: 'Two parties', value: 'two_parties' },
  //       { label: 'Three-to-five parties', value: 'three_to_five' },
  //       { label: 'More than five parties', value: 'more_than_five' },
  //     ]
  //   },
  //   {
  //     text: 'How complex is the agreement?',
  //     options: [
  //       { label: 'Standard template, minimal edits', value: 'template_minimal_edits' },
  //       { label: 'Mostly standard with a few custom clauses', value: 'standard_few_custom' },
  //       { label: 'Highly customized document', value: 'highly_customized' },
  //       { label: 'Not sure yet', value: 'not_sure_yet' },
  //     ]
  //   },
  //   {
  //     text: 'When do you need the final signed document?',
  //     options: [
  //       { label: 'Within 24 hours', value: 'within_24h' },
  //       { label: 'Two–three days', value: 'two_three_days' },
  //       { label: 'Within a week', value: 'within_a_week' },
  //       { label: 'Flexible / no rush', value: 'flexible' },
  //     ]
  //   },
  //   {
  //     text: 'Which additional services interest you?',
  //     options: [
  //       { label: 'AI clause suggestions', value: 'ai_suggestions' },
  //       { label: 'Expert legal review', value: 'expert_review' },
  //       { label: 'Priority customer support', value: 'priority_support' },
  //       { label: 'None of these', value: 'none' },
  //     ]
  //   }
  // ];

  await prisma.question.deleteMany();


  const questions = [
    {
      text: "Investment Goals",
      options: [
        { label: "General Wealth Building", value: "general_wealth_building" },
        { label: "Retirement Planning", value: "retirement_planning" },
        { label: "Diversification of Total Assets", value: "diversification_total_assets" },
        { label: "Other", value: "other" },
      ],
    },
    {
      text: "Intended Investment Duration",
      options: [
        { label: "Short-term (< 3 years)", value: "short_term" },
        { label: "Medium-term (3–7 years)", value: "medium_term" },
        { label: "Long-term (7–10 years)", value: "long_term" },
        { label: "Very Long-term (> 10 years)", value: "very_long_term" },
      ],
    },
    {
      text: "Have we been made aware of the information on sustainability?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
    {
      text: "Would you like 'sustainability' to be considered in your investment advice?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
        { label: "I am neutral regarding sustainability", value: "neutral" },
      ],
    },
    {
      text: "Information about risk appetite",
      options: [
        { label: "Conservative", value: "conservative" },
        { label: "Opportunity-oriented", value: "opportunity_oriented" },
        { label: "Risk-aware", value: "risk_aware" },
      ],
    },
  ];


  for (const q of questions) {
    await prisma.question.create({
      data: {
        text: q.text,
        options: {
          create: q.options
        }
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
      content: 'Welcome to our investment platform. By proceeding, you acknowledge that you have read and agree to our terms of service. We will collect information about your financial situation and investment preferences to provide suitable recommendations.',
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
  await prisma.aISettings.deleteMany();
  await prisma.product.deleteMany();

  // Product data with AI settings
  // const productsWithAI = [
  //   {
  //     product: {
  //       name: "VVKN1 Goal Conservative Portfolio",
  //       shortName: "VVKN1",
  //       description: "Conservative portfolio for short-term goals with minimal risk. Suitable for 0-1 year investment horizon.",
  //       fileName: "/products/vvkn1_product_guide.pdf",
  //       minimumYear: 0,
  //       maximumYear: 1,
  //       riskType: "CONSERVATIVE",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor specializing in conservative investment strategies. Recommend this portfolio for clients with very low risk tolerance who need liquidity within 0-1 years. Focus on capital preservation and safety.",
  //       vectorId: "vvkn1-conservative",
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN2 Peace of Mind Portfolio", 
  //       shortName: "VVKN2",
  //       description: "Low-risk portfolio designed for peace of mind investing over 1-2 years.",
  //       fileName: "/products/vvkn2_product_guide.pdf",
  //       minimumYear: 1,
  //       maximumYear: 2,
  //       riskType: "CONSERVATIVE",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor focusing on low-risk investments. This portfolio is ideal for clients who prioritize peace of mind and minimal volatility over 1-2 years. Emphasize stability and gradual growth.",
  //       vectorId: "vvkn2-conservative",
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN3 Balanced Portfolio",
  //       shortName: "VVKN3",
  //       description: "Balanced investment approach for medium-term goals with moderate risk over 3-4 years.",
  //       fileName: "/products/vvkn3_product_guide.pdf",
  //       minimumYear: 3,
  //       maximumYear: 4,
  //       riskType: "RISK_AWARE",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor specializing in balanced investment strategies. This portfolio suits clients with moderate risk tolerance seeking growth over 3-4 years. Balance growth potential with risk management.",
  //       vectorId: "vvkn3-balanced",
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN4 Future Growth Portfolio", 
  //       shortName: "VVKN4",
  //       description: "Growth-oriented portfolio for future planning with higher returns over 4-6 years.",
  //       fileName: "/products/vvkn4_product_guide.pdf",
  //       minimumYear: 4,
  //       maximumYear: 6,
  //       riskType: "RISK_AWARE",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor focused on growth investing. This portfolio is designed for clients planning for the future with moderate-to-high risk tolerance over 4-6 years. Emphasize growth potential and long-term planning.",
  //       vectorId: "vvkn4-growth",
  //     }
  //   },
  //   {
  //     product: {
  //       name: "VVKN5 Dynamic Growth Portfolio",
  //       shortName: "VVKN5",
  //       description: "Dynamic growth strategy for long-term wealth building over 5-7 years.",
  //       fileName: "/products/vvkn5_product_guide.pdf",
  //       minimumYear: 5,
  //       maximumYear: 7,
  //       riskType: "OPPORTUNITY_ORIENTED",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor specializing in aggressive growth strategies. This portfolio targets clients with high risk tolerance seeking maximum returns over 5-7 years. Focus on wealth building and long-term appreciation.",
  //       vectorId: "vvkn5-dynamic",
  //     }
  //   },
  //   {
  //     product: {
  //       name: "Conservative Bond Fund",
  //       shortName: "CBF",
  //       description: "Ultra-conservative bond fund for capital preservation and steady income.",
  //       fileName: "/products/cbf_product_guide.pdf",
  //       minimumYear: 0,
  //       maximumYear: 2,
  //       riskType: "CONSERVATIVE",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor specializing in fixed-income investments. This bond fund is perfect for ultra-conservative clients prioritizing capital preservation and steady income. Emphasize safety and reliability.",
  //       vectorId: "cbf-bonds",
  //     }
  //   },
  //   {
  //     product: {
  //       name: "Balanced Growth Fund",
  //       shortName: "BGF",
  //       description: "Balanced mix of growth and income investments for moderate returns.",
  //       fileName: "/products/bgf_product_guide.pdf",
  //       minimumYear: 3,
  //       maximumYear: 5,
  //       riskType: "RISK_AWARE",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor focusing on balanced investment approaches. This fund combines growth and income strategies for clients seeking moderate returns with manageable risk over 3-5 years.",
  //       vectorId: "bgf-balanced",
  //     }
  //   },
  //   {
  //     product: {
  //       name: "Aggressive Growth Fund",
  //       shortName: "AGF",
  //       description: "High-growth potential fund for investors seeking maximum returns over longer periods.",
  //       fileName: "/products/agf_product_guide.pdf",
  //       minimumYear: 5,
  //       maximumYear: 7,
  //       riskType: "OPPORTUNITY_ORIENTED",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor specializing in aggressive growth investments. This fund is for experienced investors with very high risk tolerance seeking maximum returns over 5-7 years. Emphasize growth potential and volatility tolerance.",
  //       vectorId: "agf-aggressive",
  //     }
  //   },
  //   {
  //     product: {
  //       name: "Ultra-High Risk Trading Fund",
  //       shortName: "UHRTF",
  //       description: "Maximum risk, maximum reward trading strategies for experienced investors only.",
  //       fileName: "/products/uhrtf_product_guide.pdf",
  //       minimumYear: 1,
  //       maximumYear: 3,
  //       riskType: "OPPORTUNITY_ORIENTED",
  //     },
  //     ai: {
  //       model: "gpt-4",
  //       prompt: "You are a financial advisor specializing in high-risk trading strategies. This fund is only for experienced investors who can handle extreme volatility and potential losses. Focus on risk disclosure and experience requirements.",
  //       vectorId: "uhrtf-trading",
  //     }
  //   },
  // ];
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
        vectorId: "vvkn1-growth",
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
        prompt: "You are a financial advisor specializing in balanced short-term investments. Recommend this portfolio for clients seeking a cautious balance between safety and modest returns over 0–1 years.",
        vectorId: "vvkn1-balanced",
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
        prompt: "You are a financial advisor specializing in conservative investment strategies. Recommend this portfolio for clients with very low risk tolerance who need liquidity within 0–1 years. Focus on capital preservation and safety.",
        vectorId: "vvkn1-conservative",
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
        prompt: "You are a financial advisor focusing on short-term growth strategies. Recommend this portfolio for investors with a 1–2 year horizon and moderate appetite for risk.",
        vectorId: "vvkn2-growth",
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
        prompt: "You are a financial advisor specializing in balanced short-term portfolios. Recommend this for clients who want a steady balance between growth and security over 1–2 years.",
        vectorId: "vvkn2-balanced",
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
        prompt: "You are a financial advisor focusing on low-risk investments. This portfolio is ideal for clients who prioritize peace of mind and minimal volatility over 1–2 years. Emphasize stability and gradual growth.",
        vectorId: "vvkn2-conservative",
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
        prompt: "You are a financial advisor specializing in medium-term growth strategies. Recommend this for clients seeking steady returns with moderate risk over 3–4 years.",
        vectorId: "vvkn3-growth",
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
        prompt: "You are a financial advisor specializing in balanced investment strategies. This portfolio suits clients with moderate risk tolerance seeking growth over 3–4 years. Balance growth potential with risk management.",
        vectorId: "vvkn3-balanced",
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
        prompt: "You are a financial advisor emphasizing stability. Recommend this portfolio for clients with a conservative profile seeking low volatility over a 3–5 year period.",
        vectorId: "vvkn3-conservative",
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
        prompt: "You are a financial advisor focused on growth investing. This portfolio is designed for clients planning for the future with moderate-to-high risk tolerance over 5–6 years. Emphasize growth potential and long-term planning.",
        vectorId: "vvkn4-growth",
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
        prompt: "You are a financial advisor focusing on long-term balanced portfolios. Recommend this for investors with moderate risk tolerance seeking sustained returns beyond 5 years.",
        vectorId: "vvkn4-balanced",
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
        prompt: "You are a financial advisor specializing in aggressive growth strategies. This portfolio targets clients with high risk tolerance seeking maximum returns over 7+ years. Focus on wealth building and long-term appreciation.",
        vectorId: "vvkn5-dreambig",
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
        vectorId: item.ai.vectorId,
        productId: createdProduct.id,
        isActive: true,
      },
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
