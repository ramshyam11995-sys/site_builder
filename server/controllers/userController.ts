import { Request, Response } from 'express';
import { Stripe } from 'stripe';
import prisma from '../lib/prisma.js';

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { planId, origin } = req.body;

  try {
    // 1. Find the mock or live transaction item structure
    const plan = await prisma.transaction.findFirst({
      where: { planId: planId }
    });

    if (!plan) {
      return res.status(404).json({ message: 'Selected purchase package plan not found' });
    }

    // 2. Open a database record first to get a real transaction ID
    const transaction = await prisma.transaction.create({
      data: {
        amount: plan.amount,
        credits: plan.credits,
        userId: req.userId || '',
        planId: planId,
        isPaid: false
      }
    });

    // 3. Initiate checkout payload to Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      success_url: `${origin}/loading`,
      cancel_url: `${origin}`,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `AiSiteBuilder - ${transaction.credits} credits`
            },
            // 🌟 FIXED: Math.round perfectly translates float points ($4.99 -> 499 cents)
            unit_amount: Math.round(transaction.amount * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      metadata: {
        appId: 'ai-site-builder',
        transactionId: transaction.id
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60
    });

    return res.status(201).json({
      message: 'Credits purchased successfully',
      payment_link: session.url,
      transaction
    });

  } catch (error: any) {
    console.error('Checkout processing structural crash:', error.message);
    return res.status(500).json({ message: error.message });
  }
};
