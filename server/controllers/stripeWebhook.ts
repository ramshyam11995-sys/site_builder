import { Request, Response } from 'express';
import { Stripe } from 'stripe';
import prisma from '../lib/prisma.js';

export const stripeWebhook = async (request: Request, response: Response) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  let event: Stripe.Event;

  // Defensive checks
  if (!endpointSecret) {
    console.error('❌ Error: STRIPE_WEBHOOK_SECRET is completely missing in .env');
    return response.status(500).json({ message: 'Stripe webhook secret is not configured' });
  }

  const signature = (request.headers['stripe-signature'] || '') as string;
  if (!signature) {
    console.error('⚠️ Missing stripe-signature header on webhook request');
    // Return 400 so Stripe shows a failed delivery (useful to see in Dashboard)
    return response.sendStatus(400);
  }

  // Helpful debug log (body will be raw Buffer when express.raw is used)
  try {
    console.log('--- incoming webhook headers ---', {
      'stripe-signature': signature,
      'content-type': request.headers['content-type']
    });
    console.log('--- incoming webhook body length ---', (request.body && (request.body as any).length) || 'unknown');
  } catch (e) {
    // ignore logging errors
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
        const { transactionId, appId } = session.metadata ?? {};
        console.log('checkout.session.completed metadata:', { appId, transactionId });

        if (appId === 'ai-site-builder' && transactionId) {
          // Find first, update safely (avoid throwing if missing)
          const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
          });

          if (!transaction) {
            console.warn(`⚠️ Transaction ${transactionId} not found in DB — skipping credit update.`);
          } else if (transaction.isPaid) {
            console.log(`ℹ️ Transaction ${transactionId} already paid — no action taken.`);
          } else {
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
          console.warn('⚠️ Skipped: checkout.session.completed metadata did not match expected keys.');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`payment_intent.succeeded received for id=${paymentIntent.id}`);

        const sessionList = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id
        });

        if (sessionList.data.length === 0) {
          console.warn('⚠️ No checkout.sessions found for payment_intent.');
          break;
        }

        const session = sessionList.data[0];
        const { transactionId, appId } = session?.metadata ?? {};
        console.log('payment_intent -> session metadata:', { appId, transactionId });

        if (appId === 'ai-site-builder' && transactionId) {
          const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
          if (transaction && !transaction.isPaid) {
            await prisma.transaction.update({ where: { id: transactionId }, data: { isPaid: true } });
            await prisma.user.update({ where: { id: transaction.userId }, data: { credits: { increment: transaction.credits } } });
            console.log(`🎉 Success! Credits added via payment_intent fallback for transaction ${transactionId}.`);
          } else {
            console.log('ℹ️ Transaction already paid or not found in payment_intent flow.');
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return response.json({ received: true });
  } catch (error: any) {
    console.error('❌ Critical database runtime exception processing Stripe webhook:', error);
    return response.status(500).json({ message: error.message || 'Webhook processing failed' });
  }
};
