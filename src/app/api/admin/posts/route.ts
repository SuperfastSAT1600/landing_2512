import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

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
    featuredImageAlt: optionalStr,
    featureImage: optionalStr,
    focusKeyword: optionalStr,
    author: optionalStr,
    content: z.string().default("").or(z.null().transform(() => "")),
    originalId: optionalStr,
    ctaFeatured: z.boolean().optional().or(z.null().transform(() => undefined)),
    metaTitle: optionalStr,
    metaRobots: optionalStr,
});

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const queryId = searchParams.get('id');

        if (queryId) {
            const { data, error } = await supabaseAdmin
                .from('posts')
                .select('*')
                .eq('id', queryId)
                .single();

            if (error || !data) {
                return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                post: {
                    id: data.id,
                    title: data.title,
                    date: data.date,
                    category: data.category,
                    excerpt: data.excerpt,
                    description: data.description,
                    featuredImage: data.featured_image,
                    featuredImageAlt: data.featured_image_alt,
                    featureImage: data.feature_image,
                    focusKeyword: data.focus_keyword,
                    author: data.author,
                    tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
                    ctaFeatured: data.cta_featured,
                    content: data.content,
                    metaTitle: data.meta_title,
                    metaRobots: data.meta_robots,
                    updatedAt: data.updated_at,
                }
            });
        }

        const { data, error } = await supabaseAdmin
            .from('posts')
            .select('id, title, date, category, excerpt, description, featured_image, feature_image, author, tags, cta_featured')
            .order('date', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: "Failed to fetch posts" }, { status: 500 });
        }

        const posts = (data || []).map((row) => ({
            id: row.id,
            title: row.title,
            date: row.date,
            category: row.category,
            excerpt: row.excerpt,
            description: row.description,
            featuredImage: row.featured_image,
            featureImage: row.feature_image,
            author: row.author,
            tags: row.tags,
            ctaFeatured: row.cta_featured,
        }));

        return NextResponse.json({ success: true, posts });
    } catch {
        return NextResponse.json({ success: false, error: "Failed to fetch posts" }, { status: 500 });
    }
}

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
            featuredImageAlt,
            featureImage,
            focusKeyword,
            author,
            content,
            ctaFeatured,
            metaTitle,
            metaRobots,
        } = validation.data;

        // Determine final slug: Provided > Original > Generated from Title
        let finalSlug = providedSlug || originalId;

        if (!finalSlug) {
            finalSlug = title
                .toLowerCase()
                .replace(/ /g, '-')
                .replace(/[^\w-]+/g, '');
        }

        if (!/^[a-z0-9-]+$/.test(finalSlug)) {
            return NextResponse.json({ success: false, error: "Invalid slug format generated" }, { status: 400 });
        }

        // Handle rename: delete old record if ID changed
        if (originalId && originalId !== finalSlug) {
            await supabaseAdmin.from('posts').delete().eq('id', originalId);
        }

        // If setting as CTA featured, clear it from all other posts first
        if (ctaFeatured === true) {
            await supabaseAdmin
                .from('posts')
                .update({ cta_featured: false })
                .eq('cta_featured', true)
                .neq('id', finalSlug);
        }

        const tagsArray = tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

        const { error } = await supabaseAdmin
            .from('posts')
            .upsert({
                id: finalSlug,
                title,
                date: date || new Date().toISOString().slice(0, 10),
                category,
                excerpt: excerpt || null,
                description: description || null,
                featured_image: featuredImage || null,
                featured_image_alt: featuredImageAlt || null,
                feature_image: featureImage || null,
                focus_keyword: focusKeyword || null,
                author: author || 'SuperfastSAT',
                tags: tagsArray,
                content: content || '',
                cta_featured: ctaFeatured === true,
                meta_title: metaTitle || null,
                meta_robots: metaRobots || null,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            console.error("Supabase upsert error:", error);
            return NextResponse.json({ success: false, error: "Failed to save post" }, { status: 500 });
        }

        revalidatePath('/blog');
        revalidatePath('/');
        revalidatePath(`/blog/${finalSlug}`);
        revalidateTag('posts');

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

        const { error } = await supabaseAdmin
            .from('posts')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ success: false, error: "Failed to delete post" }, { status: 500 });
        }

        revalidatePath('/blog');
        revalidatePath('/');
        revalidatePath(`/blog/${id}`);
        revalidateTag('posts');

        return NextResponse.json({ success: true });

    } catch {
        return NextResponse.json({ success: false, error: "Failed to delete post" }, { status: 500 });
    }
}
