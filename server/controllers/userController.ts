import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import Stripe from 'stripe';

const getRouteParamId = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

const getStripe = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    return new Stripe(secretKey);
};

// Get User Credits
export const getUserCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({ credits: user.credits });
    } catch (error: any) {
        console.log(error?.code || error?.message || error);
        return res.status(500).json({
            message: error?.message || 'Internal server error'
        });
    }
};

// Controller function to create New Project
export const CreateUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    let creditsDeducted = false;

    try {
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const initialPrompt =
            typeof req.body?.initial_prompt === 'string'
                ? req.body.initial_prompt.trim()
                : '';

        if (!initialPrompt) {
            return res.status(400).json({
                message: 'initial_prompt is required'
            });
        }

        // Atomically reserve the 5 credits.
        // This prevents two simultaneous requests from spending the same credits.
        const creditReservation = await prisma.user.updateMany({
            where: {
                id: userId,
                credits: {
                    gte: 5
                }
            },
            data: {
                credits: {
                    decrement: 5
                }
            }
        });

        if (creditReservation.count !== 1) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(403).json({
                message: 'add credits to create more projects'
            });
        }

        creditsDeducted = true;

        // Create the project and initial conversation atomically.
        const project = await prisma.$transaction(async (tx) => {
            const createdProject = await tx.websiteProject.create({
                data: {
                    name:
                        initialPrompt.length > 50
                            ? initialPrompt.substring(0, 47) + '...'
                            : initialPrompt,
                    initial_prompt: initialPrompt,
                    userId
                }
            });

            await tx.user.update({
                where: { id: userId },
                data: { totalCreation: { increment: 1 } }
            });

            await tx.conversation.create({
                data: {
                    role: 'user',
                    content: initialPrompt,
                    projectId: createdProject.id
                }
            });

            return createdProject;
        });

        // Enhance user prompt
        const promptEnhanceResponse =
            await openai.chat.completions.create({
                model: 'poolside/laguna-s-2.1:free',
                messages: [
                    {
                        role: 'system',
                        content: `
You are a Prompt enhancement specialist. Take the user's website request and expand it into a detailed, comprehensive prompt that will help create the best possible website.

Enhance this prompt by:
1. Adding specific design details (layout, color scheme, typography, etc.)
2. Specifying key sections and features
3. Describing the user experience and interactions
4. Including modern web design best practices
5. Mentioning responsive design requirements
6. Adding any missing but important elements

Return ONLY the enhanced prompt, nothing else. Make it detailed but concise (2-3 paragraphs max).
                        `.trim()
                    },
                    {
                        role: 'user',
                        content: initialPrompt
                    }
                ]
            });

        const enhancedPrompt =
            promptEnhanceResponse.choices[0]?.message?.content?.trim();

        if (!enhancedPrompt) {
            throw new Error('Failed to enhance prompt');
        }

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                projectId: project.id
            }
        });

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'now generating your website...',
                projectId: project.id
            }
        });

        // Generate website code
        const codeGenerationResponse =
            await openai.chat.completions.create({
                model: 'poolside/laguna-s-2.1:free',
                messages: [
                    {
                        role: 'system',
                        content: `
You are an expert web developer. Create a complete, production-ready single-page website based on this request: "${enhancedPrompt}"

CRITICAL REQUIREMENTS:
- You MUST output valid HTML ONLY.
- Use Tailwind CSS for ALL styling.
- Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
- Use Tailwind utility classes extensively for styling, animations, and responsiveness.
- Make it fully functional and interactive with JavaScript in <script> tag before closing </body>.
- Use modern, beautiful design with great UX using Tailwind classes.
- Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:).
- Use Tailwind animations and transitions (animate-*, transition-*).
- Include all necessary meta tags.
- Use Google Fonts CDN if needed for custom fonts.
- Use placeholder images from https://placehold.co/600x400.
- Use Tailwind gradient classes for beautiful backgrounds.
- Make sure all buttons, cards, and components use Tailwind styling.

CRITICAL HARD RULES:
1. You MUST put ALL output ONLY into message.content.
2. You MUST NOT place anything in reasoning, analysis, reasoning_details, or hidden fields.
3. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
4. Do NOT include markdown, explanations, notes, or code fences.

The HTML should be complete and ready to render as-is with Tailwind CSS.
                        `.trim()
                    },
                    {
                        role: 'user',
                        content: enhancedPrompt
                    }
                ]
            });

        const code = (codeGenerationResponse.choices[0]?.message?.content || '')
            .replace(/^```(?:html)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        if (!code) {
            throw new Error('Unable to generate the code, please try again');
        }

        // Create version
        const version = await prisma.version.create({
            data: {
                code,
                description: 'Initial version',
                projectId: project.id
            }
        });

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content:
                    "I've created your website! You can now preview it and request any changes.",
                projectId: project.id
            }
        });

        await prisma.websiteProject.update({
            where: { id: project.id },
            data: {
                current_code: code,
                current_version_index: version.id
            }
        });

        return res.status(201).json({
            projectId: project.id
        });
    } catch (error: any) {
        // Refund only if the 5 credits were actually reserved.
        if (creditsDeducted) {
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: { credits: { increment: 5 } }
                });
            } catch (refundError: any) {
                console.error(
                    'CRITICAL: failed to refund credits:',
                    refundError?.message || refundError
                );
            }
        }

        console.log(error?.code || error?.message || error);

        return res.status(500).json({
            message: error?.message || 'Failed to create project'
        });
    }
};

// Controller function to Get A Single User Project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const projectId = getRouteParamId(req.params.projectId);

        if (!projectId) {
            return res.status(400).json({ message: 'Invalid project id' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {
                id: projectId,
                userId
            },
            include: {
                conversation: {
                    orderBy: { timestamp: 'asc' }
                },
                versions: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        if (!project) {
            return res.status(404).json({
                message: 'Project not found'
            });
        }

        return res.json({ project });
    } catch (error: any) {
        console.log(error?.code || error?.message || error);
        return res.status(500).json({
            message: error?.message || 'Internal server error'
        });
    }
};

// Controller function to Get All User Projects
export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const projects = await prisma.websiteProject.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        });

        return res.json({ projects });
    } catch (error: any) {
        console.log(error?.code || error?.message || error);
        return res.status(500).json({
            message: error?.message || 'Internal server error'
        });
    }
};

// Controller function to toggle project publish
export const toggleProjectPublish = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const projectId = getRouteParamId(req.params.projectId);

        if (!projectId) {
            return res.status(400).json({ message: 'Invalid project id' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {
                id: projectId,
                userId
            }
        });

        if (!project) {
            return res.status(404).json({
                message: 'Project not found'
            });
        }

        const updatedProject = await prisma.websiteProject.update({
            where: { id: projectId },
            data: {
                isPublished: !project.isPublished
            },
            select: {
                isPublished: true
            }
        });

        return res.json({
            message: updatedProject.isPublished
                ? 'Project published successfully'
                : 'Project unpublished',
            isPublished: updatedProject.isPublished
        });
    } catch (error: any) {
        console.log(error?.code || error?.message || error);
        return res.status(500).json({
            message: error?.message || 'Internal server error'
        });
    }
};

// Controller function to purchase credits
export const purchaseCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const plans = {
            basic: { credits: 100, amount: 5 },
            pro: { credits: 400, amount: 19 },
            enterprise: { credits: 1000, amount: 49 }
        } as const;

        const planId =
            typeof req.body?.planId === 'string'
                ? req.body.planId.trim()
                : '';

        if (!(planId in plans)) {
            return res.status(404).json({
                message: 'plan not found'
            });
        }

        const plan = plans[planId as keyof typeof plans];
        const frontendUrl = process.env.FRONTEND_URL;

        if (!frontendUrl) {
            return res.status(500).json({
                message: 'FRONTEND_URL is not configured'
            });
        }

        const stripe = getStripe();

        // Create a pending transaction. Credits are added only by the
        // verified Stripe webhook after payment succeeds.
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                planId,
                amount: plan.amount,
                credits: plan.credits
            }
        });

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                success_url: `${frontendUrl}/loading?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: frontendUrl,
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `AiSiteBuilder - ${plan.credits} credits`
                            },
                            unit_amount: Math.round(plan.amount * 100)
                        },
                        quantity: 1
                    }
                ],
                mode: 'payment',
                metadata: {
                    appId: 'ai-site-builder',
                    transactionId: transaction.id,
                    userId,
                    planId,
                    credits: String(plan.credits)
                },
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60
            });

            return res.status(201).json({
                message: 'Checkout session created',
                payment_link: session.url,
                transaction
            });
        } catch (stripeError) {
            // Do not leave an apparently active transaction if Stripe
            // session creation itself failed.
            try {
                await prisma.transaction.delete({
                    where: { id: transaction.id }
                });
            } catch (deleteError) {
                console.error(
                    'Failed to delete failed Stripe transaction:',
                    deleteError
                );
            }

            throw stripeError;
        }
    } catch (error: any) {
        console.log(error?.code || error?.message || error);

        return res.status(500).json({
            message: error?.message || 'Unable to create checkout session'
        });
    }
};
