/**
 * Migration script: src/posts/*.md → Supabase posts table
 *
 * Prerequisites:
 * 1. Create the posts table in Supabase (see plan for SQL)
 * 2. Set environment variables in .env.local:
 *    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/migrate-posts.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually (no dotenv dependency needed in Node 20+)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
    }
    console.log('Loaded .env.local');
} else {
    console.warn('.env.local not found — relying on existing environment variables');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, serviceKey);

// Parse frontmatter from markdown (minimal gray-matter replacement)
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { data: {}, content };

    const frontmatterStr = match[1];
    const body = match[2] || '';
    const data = {};

    for (const line of frontmatterStr.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();
        // Remove surrounding quotes
        value = value.replace(/^['"]|['"]$/g, '');
        // Parse arrays like: [item1, item2] or - item (simple)
        if (value.startsWith('[') && value.endsWith(']')) {
            data[key] = value
                .slice(1, -1)
                .split(',')
                .map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
        } else if (value === 'true') {
            data[key] = true;
        } else if (value === 'false') {
            data[key] = false;
        } else {
            data[key] = value;
        }
    }

    return { data, content: body.trim() };
}

async function migrate() {
    const postsDir = path.join(rootDir, 'src', 'posts');

    if (!fs.existsSync(postsDir)) {
        console.error(`Posts directory not found: ${postsDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));
    console.log(`Found ${files.length} markdown files to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
        const id = file.replace(/\.md$/, '');
        const filePath = path.join(postsDir, file);
        const rawContent = fs.readFileSync(filePath, 'utf8');

        const { data, content } = parseFrontmatter(rawContent);

        // Build the tags array
        let tags = [];
        if (data.tags) {
            tags = Array.isArray(data.tags) ? data.tags : [data.tags];
        }

        const record = {
            id,
            title: data.title || id,
            date: data.date || new Date().toISOString().slice(0, 10),
            category: data.category || 'SAT RW',
            excerpt: data.excerpt || null,
            description: data.description || null,
            featured_image: data.featuredImage || null,
            feature_image: data.featureImage || null,
            author: data.author || 'SuperfastSAT',
            tags,
            content,
            cta_featured: data.ctaFeatured === true || data.cta_featured === true,
        };

        const { error } = await supabase.from('posts').upsert(record);

        if (error) {
            console.error(`  ✗ ${id}: ${error.message}`);
            errorCount++;
        } else {
            console.log(`  ✓ ${id}`);
            successCount++;
        }
    }

    console.log(`\nMigration complete: ${successCount} succeeded, ${errorCount} failed`);
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
