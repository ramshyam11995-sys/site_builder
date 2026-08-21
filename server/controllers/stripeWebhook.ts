import { Request, Response } from 'express';
import { Stripe } from 'stripe';
import prisma from '../lib/prisma.js';

export const stripeWebhook = async (request: Request, response: Response) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  let event: Stripe.Event;

  if (!endpointSecret) {
    console.error('❌ Error: STRIPE_WEBHOOK_SECRET is completely missing in .env');
    return response.status(500).json({ message: 'Stripe webhook secret is not configured' });
  }

  const signature = (request.headers['stripe-signature'] || '') as string;
  if (!signature) {
    console.error('⚠️ Missing stripe-signature header on webhook request');
    // Return 400 so Stripe will show a failed delivery (useful during debugging)
    return response.sendStatus(400);
  }
  
  try {
    event = stripe.webhooks.constructEvent(request.body, signature, endpointSecret);
    console.log(`✅ Success: Webhook authenticated! Event Type received: ${event.type}`);
  } catch (err: any) {
    console.error('⚠️ Critical: Webhook signature verification failed.', err.message);
    return response.sendStatus(400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('checkout.session.completed full session object:', {
          id: session.id,
          payment_status: (session as any).payment_status,
          metadata: session.metadata
        });

        const { transactionId, appId } = session.metadata ?? {};
        console.log(`🔍 Extracted from checkout.session metadata: appId=${appId}, transactionId=${transactionId}`);

        if (appId === 'ai-site-builder' && transactionId) {
          // Find transaction first - avoid throwing when transaction is missing
          const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
          });

          if (!transaction) {
            console.warn(`⚠️ Transaction ${transactionId} not found in DB — skipping credit update.`);
          } else if (transaction.isPaid) {
            console.log(`ℹ️ Transaction ${transactionId} is already marked paid; no action needed.`);
          } else {
            // Mark paid and increment user credits atomically
            await prisma.transaction.update({
              where: { id: transactionId },
              data: { isPaid: true }
            });

            const updatedUser = await prisma.user.update({
              where: { id: transaction.userId },
              data: { credits: { increment: transaction.credits } }
            });

            console.log(`🎉 Success! User ${updatedUser.id} credits incremented to: ${updatedUser.credits}`);
          }
        } else {
          console.warn('⚠️ Skipped: Metadata conditions were not met for checkout.session.completed');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`🔍 Processing payment_intent.succeeded for ID: ${paymentIntent.id}`);
        
        const sessionList = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });

        if (sessionList.data.length > 0) {
          const session = sessionList.data[0];
          const { transactionId, appId } = session?.metadata ?? {};
          console.log(`🔍 Extracted from payment_intent session list metadata: appId=${appId}, transactionId=${transactionId}`);

          if (appId === 'ai-site-builder' && transactionId) {
            const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
            
            if (transaction && !transaction.isPaid) {
              await prisma.transaction.update({
                where: { id: transactionId },
                data: { isPaid: true }
              });

              await prisma.user.update({
                where: { id: transaction.userId },
                data: { credits: { increment: transaction.credits } }
              });
              console.log(`🎉 Success! Credits added via payment_intent callback fallback.`);
            } else {
              console.log('ℹ️ Info: Transaction was already marked paid or not found.');
            }
          }
        } else {
          console.warn('⚠️ No associated checkout sessions found for this payment intent.');
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return response.json({ received: true });
  } catch (error: any) {
    console.error('❌ Critical database runtime exception within Stripe webhook:', error);
    return response.status(500).json({ message: error.message || 'Webhook processing failed' });
  }
};
