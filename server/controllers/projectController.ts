import { Request, Response } from "express";
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';

const getRouteParamId = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

// Controller functions to Make Revision

export const makeRevision = async (req: Request, res: Response) => {
    const userId = req.userId;

    try {
        const projectId = getRouteParamId(req.params.projectId);
        const { message } = req.body;

        if (!projectId) {
            return res.status(400).json({ message: 'Invalid project id' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!userId || !user) {
            return res.status(401).json({ message: 'Unauthorized ' });
        }
        if (user.credits < 5) {
            return res.status(403).json({ message: 'add more credits to make changes ' });
        }

        if (!message || message.trim() === '') {
            return res.status(400).json({ message: 'Please enter a valid prompt.' });
        }

        const currentProject = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId }
        });

        if (!currentProject) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: message,
                projectId
            }
        });

        await prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: 5 } }
        });

        // Enhance user prompt
        const promptEnhanceResponse = await openai.chat.completions.create({
            model: "poolside/laguna-s-2.1:free",
            messages: [
                {
                    role: "system",
                    content: `
                    You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                    Enhance this by:
                    1. Being specific about what elements to change
                    2. Mentioning design details (colors, spacing, sizes)
                    3. Clarifying the desired outcome
                    4. Using clear technical terms

                    Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).`
                },
                {
                    role: "user",
                    content: `user's request: "${message}"`
                }
            ]
        });

        const enhancedPrompt = promptEnhanceResponse.choices[0]?.message.content || '';

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                projectId
            }
        });

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'Now making changes to your website...',
                projectId
            }
        });

        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: "poolside/laguna-s-2.1:free",
            messages: [
                {
                    role: 'system',
                    content: `
                    You are an expert web developer. 

                    CRITICAL REQUIREMENTS:
                    - Return ONLY the complete updated HTML code with the requested changes.
                    - Use Tailwind CSS for ALL styling (NO custom CSS).
                    - Use Tailwind utility classes for all styling changes.
                    - Include all JavaScript in <script> tags before closing </body>
                    - Make sure it's a complete, standalone HTML document with Tailwind CSS
                    - Return the HTML Code Only, nothing else

                    Apply the requested changes while maintaining the Tailwind CSS styling approach.`
                },
                {
                    role: 'user',
                    content: `Here is the current website code: "${currentProject.current_code}" The user wants this change: "${enhancedPrompt}"`
                }
            ]
        });

        const code = (codeGenerationResponse.choices[0]?.message.content || '')
            .replace(/```[a-z]*\n?/gi, '')
            .replace(/```$/g, '')
            .trim();

        if (!code) {
            await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: "Unable to generate the code, please try again",
                    projectId
                }
            });
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 5 } }
            });
            return;
        }

        const version = await prisma.version.create({
            data: {
                code,
                description: 'changes made',
                projectId
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've made the changes to your website! You can now preview it",
                projectId
            }
        })

        await prisma.websiteProject.update({
            where: { id: projectId },
            data: {
                current_code: code,
                current_version_index: version.id
            }
        })

        res.json({ message: 'Change made successfully' })
    } catch (error: any) {
        await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: 5 } }
        });
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller function to rollback to a specific version
export const rollbackToVersion = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const projectId = getRouteParamId(req.params.projectId);
        const versionId = getRouteParamId(req.params.versionId);

        if (!projectId || !versionId) {
            return res.status(400).json({ message: 'Invalid project or version id' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId }
        })

        if (!project) {
            return res.status(404).json({ message: 'project not found' });
        }

        const version = await prisma.version.findFirst({
            where: { id: versionId, projectId }
        });

        if (!version) {
            return res.status(404).json({ message: 'version not found' });
        }
        await prisma.websiteProject.update({
            where: { id: projectId, userId },
            data: {
                current_code: version.code,
                current_version_index: version.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've rolled back your website to selected version. you can now preview it",
                projectId
            }
        })

        res.json({ message: 'version rolled back' });
    } catch (error: any) {
        console.log(error.code || error.message);
    }
}

// Controller Function to Delete a project

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const projectId = getRouteParamId(req.params.projectId);

        if (!projectId) {
            return res.status(400).json({ message: 'Invalid project id' });
        }

        await prisma.websiteProject.delete({
            where: { id: projectId, userId },
        })

        res.json({ message: 'Project delete successfully' });
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller For Getting project code for preview
export const getProjectPreview = async (req: Request, res: Response) => {
    try {
        const projectId = getRouteParamId(req.params.projectId);

        if (!projectId) {
            return res.status(400).json({ message: 'Invalid project id' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId },
            include: {
                conversation: {
                    orderBy: { timestamp: 'asc' }
                },
                versions: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        if (!project || !project.current_code) {
            return res.status(404).json({ message: 'project not found' });
        }

        res.json({ project });
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Get Published projects
export const getPublishedProjects = async (req: Request, res: Response) => {
    try {

        const projects = await prisma.websiteProject.findMany({
            where: { isPublished: true },
            include: { user: true }
        })

        res.json({ projects });
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

//Get a single project by id 
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const projectId = getRouteParamId(req.params.projectId);

        if (!projectId) {
            return res.status(400).json({ message: 'Invalid project id' });
        }

        const project = await prisma.websiteProject.findFirst({
            where: { id: projectId },
        })

        if (!project || project.isPublished === false || !project.current_code) {
            return res.status(404).json({ message: 'project not found' });
        }

        res.json({ code: project.current_code });
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller to save project code

export const saveProjectCode = async (req: Request, res: Response) => {
    try {

        const userId = req.userId;
        const projectId = getRouteParamId(req.params.projectId);
        const { code } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!code) {
            return res.status(400).json({ message: 'code is required' });
        }
        if (!projectId) {
            return res.status(400).json({ message: 'Invalid project id' });
        }
        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId }
        })

        if (!project) {
            return res.status(404).json({ message: 'project not found' });
        }

        await prisma.websiteProject.update({
            where: { id: projectId },
            data: { current_code: code, current_version_index: '' }
        })
        res.json({ message: 'project saved successfully' });
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}
