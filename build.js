// build.js

// Import necessary tools
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');   // For converting Markdown body to HTML

// --- Configuration ---
const POSTS_DIR = path.join(__dirname, 'posts');
const BUILD_DIR = path.join(__dirname); 

// --- Helper Functions ---
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

// --- Main Build Function ---
async function build() {
    console.log('Starting the smart Markdown build process...');

    // 1. Read all Markdown files from the 'posts' directory
    if (!fs.existsSync(POSTS_DIR)) {
        console.log("No 'posts' directory found. Skipping blog generation.");
        return;
    }
    const postFiles = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md'));

    if (postFiles.length === 0) {
        console.log('No blog posts found in the /posts directory.');
        return;
    }

    // 2. Parse each post file to automatically extract its content and metadata
    const posts = postFiles.map(fileName => {
        const fileContents = fs.readFileSync(path.join(POSTS_DIR, fileName), 'utf8');
        
        // Auto-extract Title (first H1 on any line)
        const titleMatch = fileContents.match(/^# (.*)/m); // 'm' flag for multiline matching
        const title = titleMatch ? titleMatch[1] : 'Untitled Post';

        // Auto-extract Featured Image (first image in the post)
        const imageMatch = fileContents.match(/!\[(.*?)\]\((.*?)\)/);
        const featuredImage = imageMatch ? imageMatch[2] : 'https://placehold.co/1200x600/1e3a8a/ffffff?text=Image+Not+Available';
        const featuredImageAlt = imageMatch ? imageMatch[1] : 'Blog post image';

        // Remove the title and first image from the body content before rendering
        let bodyContent = fileContents.replace(/^# (.*)/m, '').replace(/!\[(.*?)\]\((.*?)\)/, '').trim();
        
        return {
            title: title,
            slug: slugify(title),
            author: "Nick Stevens, Founder/Owner at Caprock Technology Group",
            publicationDate: new Date().toISOString(), // Use current date
            featuredImage: featuredImage,
            featuredImageAlt: featuredImageAlt,
            body: marked(bodyContent),
        };
    }).sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));

    console.log(`Found and processed ${posts.length} blog posts.`);

    // 3. Read the HTML templates
    const indexTemplate = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf-8');
    const blogTemplate = fs.readFileSync(path.join(BUILD_DIR, 'blog.html'), 'utf-8');
    const postTemplate = fs.readFileSync(path.join(BUILD_DIR, 'post-template.html'), 'utf-8');

    // 4. Generate individual blog post pages
    console.log('Generating individual post pages...');
    posts.forEach(post => {
        let newPostHtml = postTemplate;
        newPostHtml = newPostHtml.replace(/{{POST_TITLE}}/g, post.title);
        newPostHtml = newPostHtml.replace(/{{POST_DATE}}/g, new Date(post.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        newPostHtml = newPostHtml.replace(/{{POST_AUTHOR}}/g, post.author);
        newPostHtml = newPostHtml.replace(/{{POST_IMAGE_URL}}/g, post.featuredImage);
        newPostHtml = newPostHtml.replace(/{{POST_IMAGE_ALT}}/g, post.featuredImageAlt);
        newPostHtml = newPostHtml.replace('{{POST_BODY}}', post.body);

        const postFileName = `${post.slug}.html`;
        fs.writeFileSync(path.join(BUILD_DIR, postFileName), newPostHtml);
        console.log(`- Created ${postFileName}`);
    });

    // 5. Generate the main blog listing page
    console.log('Generating main blog listing page...');
    let blogListHtml = '';
    posts.forEach(post => {
        blogListHtml += `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <a href="${post.slug}.html">
                    <img class="h-56 w-full object-cover" src="${post.featuredImage}" alt="${post.featuredImageAlt}">
                    <div class="p-6">
                        <p class="text-sm text-gray-500">${new Date(post.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <h3 class="mt-2 text-xl font-bold text-gray-900">${post.title}</h3>
                    </div>
                </a>
            </div>
        `;
    });
    const finalBlogPageHtml = blogTemplate.replace('{{BLOG_POSTS_LIST}}', blogListHtml);
    fs.writeFileSync(path.join(BUILD_DIR, 'blog.html'), finalBlogPageHtml);
    console.log('- Updated blog.html with all posts.');

    // 6. Generate the "Latest Insights" section for the homepage
    console.log('Generating "Latest Insights" section for homepage...');
    const latestPosts = posts.slice(0, 3);
    let latestPostsHtml = '';
    latestPosts.forEach(post => {
        latestPostsHtml += `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <a href="${post.slug}.html">
                    <img class="h-56 w-full object-cover" src="${post.featuredImage}" alt="${post.featuredImageAlt}">
                    <div class="p-6">
                        <p class="text-sm text-gray-500">${new Date(post.publicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <h3 class="mt-2 text-xl font-bold text-gray-900">${post.title}</h3>
                    </div>
                </a>
            </div>
        `;
    });
    const finalIndexPageHtml = indexTemplate.replace('{{LATEST_POSTS}}', latestPostsHtml);
    fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), finalIndexPageHtml);
    console.log('- Updated index.html with latest posts.');

    console.log('Build process finished successfully! 🎉');
}

build().catch(error => {
    console.error('Build script failed:', error);
    process.exit(1);
});
