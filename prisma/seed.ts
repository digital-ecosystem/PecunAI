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


  // const initialTerms = await prisma.termsAndConditions.upsert({
  //   where: { id: 'terms-initial-v1' },
  //   update: {},
  //   create: {
  //     id: 'terms-initial-v1',
  //     title: 'Initial Terms and Conditions',
  //     content: 'Welcome to our investment platform. By proceeding, you acknowledge that you have read and agree to our terms of service. We will collect information about your financial situation and investment preferences to provide suitable recommendations.',
  //     version: 'v1.0',
  //     termsType: 'INITIAL',
  //     isActive: true
  //   }
  // })
  // console.log("🚀 ~ main ~ initialTerms:", initialTerms)

  // const productTerms = await prisma.termsAndConditions.upsert({
  //   where: { id: 'terms-product-v1' },
  //   update: {},
  //   create: {
  //     id: 'terms-product-v1',
  //     title: 'Investment Product Terms',
  //     content: 'Investment products carry inherent risks. Past performance does not guarantee future results. You may lose some or all of your invested capital. Please ensure you understand the risks before proceeding.',
  //     version: 'v1.0',
  //     termsType: 'PRODUCT_SPECIFIC',
  //     isActive: true
  //   }
  // })
  // console.log("🚀 ~ main ~ productTerms:", productTerms)

  //  // Delete all existing products before seeding (optional)
  // await prisma.product.deleteMany();

  // // Insert products
  // await prisma.product.createMany({
  //   data: [
  //     {
  //       name: "High-Yield Savings Account",
  //       shortName: "HYSA",
  //       description: "A savings account with higher-than-average interest rates to help grow your money faster.",
  //       keyFeatures: [
  //         "Interest rates significantly higher than standard savings accounts",
  //         "No monthly maintenance fees",
  //         "FDIC insured up to $250,000",
  //         "Online and mobile banking access"
  //       ],
  //     },
  //     {
  //       name: "Fixed-Rate Bond",
  //       shortName: "FRB",
  //       description: "An investment product offering a fixed rate of return for a specified term.",
  //       keyFeatures: [
  //         "Guaranteed fixed interest rate",
  //         "Flexible investment terms (1, 3, 5 years)",
  //         "Low minimum investment",
  //         "Predictable income stream"
  //       ],
  //     },
  //     {
  //       name: "Premium Checking Account",
  //       shortName: "PCA",
  //       description: "A checking account with premium benefits for frequent transactions.",
  //       keyFeatures: [
  //         "Unlimited transactions",
  //         "Free ATM withdrawals nationwide",
  //         "Priority customer support",
  //         "Monthly cashback rewards"
  //       ],
  //     }
  //   ],
  // });


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
