// build.js

// Import necessary tools
const contentful = require('contentful');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const fs = require('fs');
const path = require('path');

// Load environment variables for local testing
require('dotenv').config();

// --- Configuration ---
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;
const BUILD_DIR = path.join(__dirname); // The directory where final files will be placed

// --- Main Build Function ---
async function build() {
    console.log('Starting the build process...');

    // 1. Set up the Contentful client
    const client = contentful.createClient({
        space: SPACE_ID,
        accessToken: ACCESS_TOKEN,
    });

    // 2. Fetch all blog post entries from Contentful, sorted by publication date
    console.log('Fetching blog posts from Contentful...');
    const entries = await client.getEntries({ 
        content_type: 'blogPost',
        order: '-fields.publicationDate' // Sort by publication date, newest first
    });

    // Read the HTML templates
    console.log('Reading HTML templates...');
    const indexTemplate = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf-8');
    const blogTemplate = fs.readFileSync(path.join(BUILD_DIR, 'blog.html'), 'utf-8');
    const postTemplate = fs.readFileSync(path.join(BUILD_DIR, 'post-template.html'), 'utf-8');

    if (!entries.items || entries.items.length === 0) {
        console.log('No blog posts found. Creating blank blog page and homepage section.');
        // Create a blank blog page
        const noPostsHtml = '<p class="text-center col-span-full">No blog posts have been published yet. Check back soon!</p>';
        const finalBlogPageHtml = blogTemplate.replace('{{BLOG_POSTS_LIST}}', noPostsHtml);
        fs.writeFileSync(path.join(BUILD_DIR, 'blog.html'), finalBlogPageHtml);
        
        // Create a blank "Latest Insights" section on the homepage
        const finalIndexPageHtml = indexTemplate.replace('{{LATEST_POSTS}}', noPostsHtml);
        fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), finalIndexPageHtml);
        
        console.log('Build process finished.');
        return;
    }
    console.log(`Found ${entries.items.length} blog posts.`);

    // 3. Generate individual blog post pages
    console.log('Generating individual post pages...');
    for (const post of entries.items) {
        const fields = post.fields;
        if (!fields.slug) {
            console.warn(`- Skipping post with missing slug: "${fields.title || 'Untitled'}"`);
            continue;
        }

        let newPostHtml = postTemplate;

        newPostHtml = newPostHtml.replace(/{{POST_TITLE}}/g, fields.title || 'Untitled Post');
        const postDate = fields.publicationDate ? new Date(fields.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No Date';
        newPostHtml = newPostHtml.replace(/{{POST_DATE}}/g, postDate);
        newPostHtml = newPostHtml.replace(/{{POST_AUTHOR}}/g, fields.author || 'Anonymous');
        
        if (fields.featuredImage && fields.featuredImage.fields.file) {
            newPostHtml = newPostHtml.replace(/{{POST_IMAGE_URL}}/g, `https:${fields.featuredImage.fields.file.url}`);
            newPostHtml = newPostHtml.replace(/{{POST_IMAGE_ALT}}/g, fields.featuredImage.fields.description || fields.title || 'Blog post image');
        } else {
            newPostHtml = newPostHtml.replace(/{{POST_IMAGE_URL}}/g, 'https://placehold.co/1200x600/1e3a8a/ffffff?text=Image+Not+Available');
            newPostHtml = newPostHtml.replace(/{{POST_IMAGE_ALT}}/g, 'Placeholder image');
        }

        const bodyHtml = fields.body ? documentToHtmlString(fields.body) : '<p>This post has no content.</p>';
        newPostHtml = newPostHtml.replace('{{POST_BODY}}', bodyHtml);

        const postFileName = `${fields.slug}.html`;
        fs.writeFileSync(path.join(BUILD_DIR, postFileName), newPostHtml);
        console.log(`- Created ${postFileName}`);
    }

    // 4. Generate the main blog listing page
    console.log('Generating main blog listing page...');
    let blogListHtml = '';
    for (const post of entries.items) {
        const fields = post.fields;
        if (!fields.slug) continue;

        const imageUrl = (fields.featuredImage && fields.featuredImage.fields.file) 
            ? `https:${fields.featuredImage.fields.file.url}` 
            : 'https://placehold.co/600x400/1e3a8a/ffffff?text=Image';
        const imageAlt = (fields.featuredImage && fields.featuredImage.fields.description) 
            ? fields.featuredImage.fields.description 
            : fields.title || 'Blog post image';
        const postDate = fields.publicationDate ? new Date(fields.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No Date';

        blogListHtml += `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <a href="${fields.slug}.html">
                    <img class="h-56 w-full object-cover" src="${imageUrl}" alt="${imageAlt}">
                    <div class="p-6">
                        <p class="text-sm text-gray-500">${postDate}</p>
                        <h3 class="mt-2 text-xl font-bold text-gray-900">${fields.title || 'Untitled Post'}</h3>
                    </div>
                </a>
            </div>
        `;
    }
    const finalBlogPageHtml = blogTemplate.replace('{{BLOG_POSTS_LIST}}', blogListHtml);
    fs.writeFileSync(path.join(BUILD_DIR, 'blog.html'), finalBlogPageHtml);
    console.log('- Updated blog.html with all posts.');

    // 5. Generate the "Latest Insights" section for the homepage
    console.log('Generating "Latest Insights" section for homepage...');
    const latestPosts = entries.items.slice(0, 3); // Get the 3 most recent posts
    let latestPostsHtml = '';
    for (const post of latestPosts) {
        const fields = post.fields;
        if (!fields.slug) continue;

        const imageUrl = (fields.featuredImage && fields.featuredImage.fields.file) 
            ? `https:${fields.featuredImage.fields.file.url}` 
            : 'https://placehold.co/600x400/1e3a8a/ffffff?text=Image';
        const imageAlt = (fields.featuredImage && fields.featuredImage.fields.description) 
            ? fields.featuredImage.fields.description 
            : fields.title || 'Blog post image';
        const postDate = fields.publicationDate ? new Date(fields.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No Date';

        latestPostsHtml += `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <a href="${fields.slug}.html">
                    <img class="h-56 w-full object-cover" src="${imageUrl}" alt="${imageAlt}">
                    <div class="p-6">
                        <p class="text-sm text-gray-500">${postDate}</p>
                        <h3 class="mt-2 text-xl font-bold text-gray-900">${fields.title || 'Untitled Post'}</h3>
                    </div>
                </a>
            </div>
        `;
    }
    const finalIndexPageHtml = indexTemplate.replace('{{LATEST_POSTS}}', latestPostsHtml);
    fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), finalIndexPageHtml);
    console.log('- Updated index.html with latest posts.');

    console.log('Build process finished successfully! 🎉');
}

// Run the build function and handle any potential errors
build().catch(error => {
    console.error('Build script failed:', error);
    process.exit(1); // Exit with a non-zero code to fail the Netlify build
});
