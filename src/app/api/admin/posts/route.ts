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
    try {
        const { searchParams } = new URL(request.url);
        const queryId = searchParams.get('id');

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
                        content: matterResult.content // Include content
                    }
                });
            } else {
                return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
            }
        }

        // Case 2: Fetch List (Metadata Only)
        const fileNames = fs.readdirSync(postsDirectory);
        const posts = fileNames.map((fileName) => {
            const id = fileName.replace(/\.md$/, '');
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, 'utf8');
            const matterResult = matter(fileContents);

            return {
                id,
                ...matterResult.data,
                // No content for list view
            };
        });

        // Sort by date descending
        posts.sort((a: any, b: any) => (a.date < b.date ? 1 : -1));

        return NextResponse.json({ success: true, posts });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to fetch posts" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            originalId, // If editing existing
            title,
            date,
            category,
            description, // Meta Description
            tags, // Keywords
            featuredImage,
            author,
            content // Markdown body
        } = body;

        // Generate ID (Slug) from title if not provided/editing
        // Simple slugify: lowercase, replace spaces with hyphens, remove non-chars
        const slug = title
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');

        // If editing and ID changed, we could delete old file, but for MVP let's stick to simple overwrite or new
        // For safety in this MVP, we use the passed ID if editing, or new slug if new.

        const fileName = (originalId || slug) + '.md';
        const fullPath = path.join(postsDirectory, fileName);

        const frontMatter: any = {
            title,
            date,
            category,
        };

        // Add SEO fields if they exist
        if (description) frontMatter.description = description;
        if (tags) frontMatter.tags = tags.split(',').map((t: string) => t.trim()); // Store as array
        if (featuredImage) frontMatter.featuredImage = featuredImage;
        if (author) frontMatter.author = author;

        const fileContent = matter.stringify(content || '', frontMatter);

        fs.writeFileSync(fullPath, fileContent, 'utf8');

        // If we renamed (originalId !== newSlug), we might want to delete old, but let's handle that in DELETE for now
        // or just simpler update logic.

        return NextResponse.json({ success: true, id: originalId || slug });

    } catch (error) {
        console.error("Save Error:", error);
        return NextResponse.json({ success: false, error: "Failed to save post" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: "No ID provided" }, { status: 400 });
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
