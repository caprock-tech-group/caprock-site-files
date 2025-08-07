// build.js

// Import necessary tools
// 'contentful' is for fetching data from your CMS.
// 'fs' (file system) is for reading and writing files on your computer.
// 'path' helps create correct file paths that work on any operating system.
const contentful = require('contentful');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
// These are your secret keys for Contentful. We'll store them in a separate .env file for security.
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;

// --- Main Build Function ---
// This is the main function that runs everything.
async function build() {
    console.log('Starting the build process...');

    // 1. Set up the Contentful client
    const client = contentful.createClient({
        space: SPACE_ID,
        accessToken: ACCESS_TOKEN,
    });

    // 2. Fetch all blog post entries from Contentful
    console.log('Fetching blog posts from Contentful...');
    const entries = await client.getEntries({ content_type: 'blogPost' }); // Assumes your Content Model is named 'blogPost'

    if (!entries.items || entries.items.length === 0) {
        console.log('No blog posts found. Exiting.');
        return;
    }
    console.log(`Found ${entries.items.length} blog posts.`);

    // 3. Read the HTML templates
    console.log('Reading HTML templates...');
    const blogTemplate = fs.readFileSync(path.join(__dirname, 'blog.html'), 'utf-8');
    const postTemplate = fs.readFileSync(path.join(__dirname, 'post-template.html'), 'utf-8');

    // 4. Generate individual blog post pages
    console.log('Generating individual post pages...');
    for (const post of entries.items) {
        let newPostHtml = postTemplate; // Start with the template content

        // Replace placeholders with actual content from Contentful
        newPostHtml = newPostHtml.replace(/{{POST_TITLE}}/g, post.fields.title);
        newPostHtml = newPostHtml.replace(/{{POST_DATE}}/g, new Date(post.fields.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        newPostHtml = newPostHtml.replace(/{{POST_AUTHOR}}/g, post.fields.author);
        newPostHtml = newPostHtml.replace(/{{POST_IMAGE_URL}}/g, `https:${post.fields.featuredImage.fields.file.url}`);
        newPostHtml = newPostHtml.replace(/{{POST_IMAGE_ALT}}/g, post.fields.featuredImage.fields.description);
        
        // Convert Contentful's Rich Text to simple HTML
        let bodyHtml = '';
        post.fields.body.content.forEach(node => {
            if (node.nodeType === 'paragraph') {
                bodyHtml += `<p>${node.content.map(n => n.value).join('')}</p>`;
            }
        });
        newPostHtml = newPostHtml.replace('{{POST_BODY}}', bodyHtml);

        // Write the new HTML file
        const postFileName = `${post.fields.slug}.html`;
        fs.writeFileSync(path.join(__dirname, postFileName), newPostHtml);
        console.log(`- Created ${postFileName}`);
    }

    // 5. Generate the main blog listing page
    console.log('Generating main blog listing page...');
    let blogListHtml = '';
    for (const post of entries.items) {
        blogListHtml += `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <a href="${post.fields.slug}.html">
                    <img class="h-56 w-full object-cover" src="https:${post.fields.featuredImage.fields.file.url}" alt="${post.fields.featuredImage.fields.description}">
                    <div class="p-6">
                        <p class="text-sm text-gray-500">${new Date(post.fields.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <h3 class="mt-2 text-xl font-bold text-gray-900">${post.fields.title}</h3>
                    </div>
                </a>
            </div>
        `;
    }

    const finalBlogPageHtml = blogTemplate.replace('{{BLOG_POSTS_LIST}}', blogListHtml);
    fs.writeFileSync(path.join(__dirname, 'blog.html'), finalBlogPageHtml);
    console.log('- Updated blog.html with all posts.');

    console.log('Build process finished successfully! 🎉');
}

// Run the build function
build().catch(console.error);
