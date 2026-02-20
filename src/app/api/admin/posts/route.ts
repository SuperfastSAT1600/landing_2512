import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Define the content directory
const postsDirectory = path.join(process.cwd(), 'src/posts');

// Ensure directory exists
if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true });
}

// ... imports

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const queryId = searchParams.get('id');

        // ... (rest of the logic remains the same, but for brevity I am replacing the block)
        // Case 1: Fetch Single Post (With Content)
        if (queryId) {
            const fullPath = path.join(postsDirectory, `${queryId}.md`);
            if (fs.existsSync(fullPath)) {
                const fileContents = fs.readFileSync(fullPath, 'utf8');
                const matterResult = matter(fileContents);
                return NextResponse.json({
                    success: true,
                    post: {
                        id: queryId,
                        ...matterResult.data,
                        content: matterResult.content
                    }
                });
            } else {
                return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
            }
        }

        // Case 2: Fetch List (Metadata Only)
        // Ensure directory exists for listing
        if (!fs.existsSync(postsDirectory)) {
            return NextResponse.json({ success: true, posts: [] });
        }

        const fileNames = fs.readdirSync(postsDirectory);
        const posts = fileNames.map((fileName) => {
            const id = fileName.replace(/\.md$/, '');
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, 'utf8');
            const matterResult = matter(fileContents);

            return {
                id,
                ...matterResult.data,
            };
        });

        // Sort by date descending
        posts.sort((a: any, b: any) => (a.date < b.date ? 1 : -1));

        return NextResponse.json({ success: true, posts });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to fetch posts" }, { status: 500 });
    }
}

import { z } from 'zod';

// ... existing code ...

const optionalStr = z.string().optional().or(z.literal('').transform(() => undefined)).or(z.null().transform(() => undefined));

const PostSchema = z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional().or(z.literal('')).or(z.null().transform(() => undefined)),
    date: optionalStr,
    category: z.string().default("SAT RW"),
    excerpt: optionalStr,
    description: optionalStr,
    tags: optionalStr,
    featuredImage: optionalStr,
    featureImage: optionalStr,
    author: optionalStr,
    content: z.string().default("").or(z.null().transform(() => "")),
    originalId: optionalStr,
    ctaFeatured: z.boolean().optional().or(z.null().transform(() => undefined)),
});

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = await request.json();
        const validation = PostSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error.issues[0].message }, { status: 400 });
        }

        const {
            originalId,
            title,
            slug: providedSlug,
            date,
            category,
            excerpt,
            description,
            tags,
            featuredImage,
            featureImage,
            author,
            content,
            ctaFeatured,
        } = validation.data;

        // Determine final slug: Provided > or Original > or Generated from Title
        let finalSlug = providedSlug || originalId;

        if (!finalSlug) {
            finalSlug = title
                .toLowerCase()
                .replace(/ /g, '-')
                .replace(/[^\w-]+/g, ''); // Basic sanitization for auto-generated slug
        }

        // Final Safety Check on Slug (Double-check)
        if (!/^[a-z0-9-]+$/.test(finalSlug)) {
            return NextResponse.json({ success: false, error: "Invalid slug format generated" }, { status: 400 });
        }

        const fileName = finalSlug + '.md';
        const fullPath = path.join(postsDirectory, fileName);

        // Prevent directory traversal (redundant check if regex passes, but good for defense in depth)
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            return NextResponse.json({ success: false, error: "Invalid filename" }, { status: 400 });
        }

        // Rename logic: If originalId exists AND differs from finalSlug, rename (delete old)
        if (originalId && originalId !== finalSlug) {
            const oldPath = path.join(postsDirectory, `${originalId}.md`);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // If this post is being set as CTA featured, clear it from all other posts first
        if (ctaFeatured === true) {
            const allFiles = fs.readdirSync(postsDirectory).filter(f => f.endsWith('.md'));
            for (const f of allFiles) {
                const fSlug = f.replace(/\.md$/, '');
                if (fSlug === finalSlug) continue;
                const fPath = path.join(postsDirectory, f);
                const fContents = fs.readFileSync(fPath, 'utf8');
                const parsed = matter(fContents);
                if (parsed.data.ctaFeatured === true) {
                    delete parsed.data.ctaFeatured;
                    fs.writeFileSync(fPath, matter.stringify(parsed.content, parsed.data), 'utf8');
                }
            }
        }

        const frontMatter: any = {
            title,
            date,
            category,
        };

        if (excerpt) frontMatter.excerpt = excerpt;
        if (description) frontMatter.description = description;
        if (tags) frontMatter.tags = tags.split(',').map((t: string) => t.trim());
        if (featuredImage) frontMatter.featuredImage = featuredImage;
        if (featureImage) frontMatter.featureImage = featureImage;
        if (author) frontMatter.author = author;
        if (ctaFeatured === true) frontMatter.ctaFeatured = true;

        const fileContent = matter.stringify(content, frontMatter);

        fs.writeFileSync(fullPath, fileContent, 'utf8');

        return NextResponse.json({ success: true, id: finalSlug });

    } catch (error) {
        console.error("Save Error:", error);
        return NextResponse.json({ success: false, error: "Failed to save post" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: "No ID provided" }, { status: 400 });
        }

        if (!/^[a-z0-9-]+$/.test(id)) {
            return NextResponse.json({ success: false, error: "Invalid post ID" }, { status: 400 });
        }

        const fullPath = path.join(postsDirectory, `${id}.md`);

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
        }

    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to delete post" }, { status: 500 });
    }
}

function isAuthenticated(request: NextRequest): boolean {
    const authHeader = request.headers.get('x-admin-key');
    const secretKey = process.env.ADMIN_SECRET_KEY;
    // Security: If no secret key is set in env, fail closed (secure by default)
    if (!secretKey) {
        console.error("Admin API blocked: ADMIN_SECRET_KEY is not set in environment.");
        return false;
    }
    return authHeader === secretKey;
}
