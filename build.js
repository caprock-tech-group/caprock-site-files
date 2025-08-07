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

    // 2. Fetch all blog post entries from Contentful
    console.log('Fetching blog posts from Contentful...');
    const entries = await client.getEntries({ content_type: 'blogPost' }); // Assumes your Content Model ID is 'blogPost'

    if (!entries.items || entries.items.length === 0) {
        console.log('No blog posts found. A blank blog page will be created.');
        // Still create a blog page, but with a "no posts" message
        const blogTemplate = fs.readFileSync(path.join(BUILD_DIR, 'blog.html'), 'utf-8');
        const noPostsHtml = '<p class="text-center col-span-full">No blog posts have been published yet. Check back soon!</p>';
        const finalBlogPageHtml = blogTemplate.replace('{{BLOG_POSTS_LIST}}', noPostsHtml);
        fs.writeFileSync(path.join(BUILD_DIR, 'blog.html'), finalBlogPageHtml);
        console.log('Build process finished.');
        return;
    }
    console.log(`Found ${entries.items.length} blog posts.`);

    // 3. Read the HTML templates
    console.log('Reading HTML templates...');
    const blogTemplate = fs.readFileSync(path.join(BUILD_DIR, 'blog.html'), 'utf-8');
    const postTemplate = fs.readFileSync(path.join(BUILD_DIR, 'post-template.html'), 'utf-8');

    // 4. Generate individual blog post pages
    console.log('Generating individual post pages...');
    for (const post of entries.items) {
        let newPostHtml = postTemplate;

        // Replace simple placeholders
        newPostHtml = newPostHtml.replace(/{{POST_TITLE}}/g, post.fields.title);
        newPostHtml = newPostHtml.replace(/{{POST_DATE}}/g, new Date(post.fields.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        newPostHtml = newPostHtml.replace(/{{POST_AUTHOR}}/g, post.fields.author);
        
        // Handle potential missing images gracefully
        if (post.fields.featuredImage && post.fields.featuredImage.fields.file) {
            newPostHtml = newPostHtml.replace(/{{POST_IMAGE_URL}}/g, `https:${post.fields.featuredImage.fields.file.url}`);
            newPostHtml = newPostHtml.replace(/{{POST_IMAGE_ALT}}/g, post.fields.featuredImage.fields.description || post.fields.title);
        } else {
            // Provide a fallback if no image is set
            newPostHtml = newPostHtml.replace(/{{POST_IMAGE_URL}}/g, 'https://placehold.co/1200x600/1e3a8a/ffffff?text=Image+Not+Available');
            newPostHtml = newPostHtml.replace(/{{POST_IMAGE_ALT}}/g, 'Placeholder image');
        }

        // Use the official renderer for the rich text body
        const bodyHtml = documentToHtmlString(post.fields.body);
        newPostHtml = newPostHtml.replace('{{POST_BODY}}', bodyHtml);

        // Write the new HTML file
        const postFileName = `${post.fields.slug}.html`;
        fs.writeFileSync(path.join(BUILD_DIR, postFileName), newPostHtml);
        console.log(`- Created ${postFileName}`);
    }

    // 5. Generate the main blog listing page
    console.log('Generating main blog listing page...');
    let blogListHtml = '';
    for (const post of entries.items) {
        const imageUrl = (post.fields.featuredImage && post.fields.featuredImage.fields.file) 
            ? `https:${post.fields.featuredImage.fields.file.url}` 
            : 'https://placehold.co/600x400/1e3a8a/ffffff?text=Image';
        const imageAlt = (post.fields.featuredImage && post.fields.featuredImage.fields.description) 
            ? post.fields.featuredImage.fields.description 
            : post.fields.title;

        blogListHtml += `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <a href="${post.fields.slug}.html">
                    <img class="h-56 w-full object-cover" src="${imageUrl}" alt="${imageAlt}">
                    <div class="p-6">
                        <p class="text-sm text-gray-500">${new Date(post.fields.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <h3 class="mt-2 text-xl font-bold text-gray-900">${post.fields.title}</h3>
                    </div>
                </a>
            </div>
        `;
    }

    const finalBlogPageHtml = blogTemplate.replace('{{BLOG_POSTS_LIST}}', blogListHtml);
    fs.writeFileSync(path.join(BUILD_DIR, 'blog.html'), finalBlogPageHtml);
    console.log('- Updated blog.html with all posts.');

    console.log('Build process finished successfully! 🎉');
}

// Run the build function and handle any potential errors
build().catch(error => {
    console.error('Build script failed:', error);
    process.exit(1); // Exit with a non-zero code to fail the Netlify build
});
