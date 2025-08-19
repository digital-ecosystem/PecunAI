import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'


export async function GET() {
  try {
    const count = await prisma.product.count()

    if (count === 0) {
      return NextResponse.json({ error: 'No products found', success: false }, { status: 404 })
    }

    const randomIndex = Math.floor(Math.random() * count)

    const product = await prisma.product.findFirst({
      skip: randomIndex,
    })

    return NextResponse.json({product, success: true})
  } catch (error) {
    console.error('Error fetching random product:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', success: false },
      { status: 500 }
    )
  }
}
