// build.js

// Import necessary tools
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const simpleGit = require('simple-git');

// --- Configuration ---
const POSTS_DIR = path.join(__dirname, 'posts');
const BUILD_DIR = path.join(__dirname); 
const git = simpleGit();

// --- Helper Functions ---
function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// --- Main Build Function ---
async function build() {
    console.log('Starting the smart Markdown build process...');

    if (!fs.existsSync(POSTS_DIR)) {
        console.log("No 'posts' directory found. Skipping blog generation.");
        // Still need to handle homepage placeholder if no posts exist
        const indexTemplate = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf-8');
        const finalIndexHtml = indexTemplate.replace('{{LATEST_POSTS}}', '<p class="text-gray-400 col-span-full text-center">No recent posts found.</p>');
        fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), finalIndexHtml);
        return;
    }
    
    const postFiles = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md'));

    if (postFiles.length === 0) {
        console.log('No blog posts found in the /posts directory.');
        const indexTemplate = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf-8');
        const finalIndexHtml = indexTemplate.replace('{{LATEST_POSTS}}', '<p class="text-gray-400 col-span-full text-center">No recent posts found.</p>');
        fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), finalIndexHtml);
        return;
    }

    const posts = await Promise.all(postFiles.map(async (fileName) => {
        const filePath = path.join(POSTS_DIR, fileName);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        
        const titleMatch = fileContents.match(/^\s*# (.*)/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled Post';

        const imageMatch = fileContents.match(/!\[(.*?)\]\((.*?)\)/);
        const featuredImage = imageMatch ? imageMatch[2] : 'https://placehold.co/1200x600/0f172a/a3e635?text=Caprock+Tech';
        const featuredImageAlt = imageMatch ? imageMatch[1] : 'Blog post image';

        let bodyContent = fileContents.replace(/^\s*# (.*)/m, '').replace(/!\[(.*?)\]\((.*?)\)/, '').trim();

        // Get the creation date from Git history
        let publicationDate;
        try {
            const log = await git.log({ file: filePath });
            publicationDate = log.latest ? new Date(log.latest.date) : new Date();
             // In a log sorted by date, the last entry is the oldest (creation)
            if (log.all.length > 0) {
                publicationDate = new Date(log.all[log.all.length - 1].date);
            }
        } catch (error) {
            console.error(`Could not get Git history for ${fileName}. Using current date.`, error);
            publicationDate = new Date();
        }

        return {
            title: title,
            slug: slugify(title),
            author: "Nick Stevens, Founder/Owner at Caprock Technology Group",
            publicationDate: publicationDate.toISOString(),
            featuredImage: featuredImage,
            featuredImageAlt: featuredImageAlt,
            body: marked(bodyContent),
        };
    }));

    posts.sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
    console.log(`Found and processed ${posts.length} blog posts.`);

    // Read templates
    const indexTemplate = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf-8');
    const blogTemplate = fs.readFileSync(path.join(BUILD_DIR, 'blog.html'), 'utf-8');
    const postTemplate = fs.readFileSync(path.join(BUILD_DIR, 'post-template.html'), 'utf-8');

    // Generate individual post pages
    posts.forEach(post => {
        const postDate = new Date(post.publicationDate);
        const formattedDate = postDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Chicago'
        });

        let newPostHtml = postTemplate;
        newPostHtml = newPostHtml.replace(/{{POST_TITLE}}/g, post.title);
        newPostHtml = newPostHtml.replace(/{{POST_DATE}}/g, formattedDate);
        newPostHtml = newPostHtml.replace(/{{POST_AUTHOR}}/g, post.author);
        newPostHtml = newPostHtml.replace(/{{POST_IMAGE_URL}}/g, post.featuredImage);
        newPostHtml = newPostHtml.replace(/{{POST_IMAGE_ALT}}/g, post.featuredImageAlt);
        newPostHtml = newPostHtml.replace('{{POST_BODY}}', post.body);

        const postFileName = `${post.slug}.html`;
        fs.writeFileSync(path.join(BUILD_DIR, postFileName), newPostHtml);
    });
    console.log('Finished generating individual post pages.');

    // Generate blog listing page
    let blogListHtml = '';
    posts.forEach(post => {
        const postDate = new Date(post.publicationDate);
        const formattedDate = postDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Chicago'
        });
        blogListHtml += `
            <div class="glass-card p-6 rounded-xl transform hover:-translate-y-2 transition-transform duration-300">
                <a href="${post.slug}.html">
                    <img class="rounded-lg mb-4 h-56 w-full object-cover" src="${post.featuredImage}" alt="${post.featuredImageAlt}">
                    <p class="text-sm text-gray-400">${formattedDate}</p>
                    <h3 class="mt-2 text-xl font-bold text-white hover:text-brand-blue transition-colors">${post.title}</h3>
                </a>
            </div>
        `;
    });
    const finalBlogPageHtml = blogTemplate.replace('{{BLOG_POSTS_LIST}}', blogListHtml);
    fs.writeFileSync(path.join(BUILD_DIR, 'blog.html'), finalBlogPageHtml);
    console.log('Updated blog.html with all posts.');

    // Generate "Latest Insights" for homepage
    let latestPostsHtml = '';
    const latestPosts = posts.slice(0, 3);
    latestPosts.forEach(post => {
        const postDate = new Date(post.publicationDate);
        const formattedDate = postDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Chicago'
        });
        latestPostsHtml += `
            <div class="glass-card p-6 rounded-xl transform hover:-translate-y-2 transition-transform duration-300">
                <a href="${post.slug}.html">
                    <img class="rounded-lg mb-4 h-56 w-full object-cover" src="${post.featuredImage}" alt="${post.featuredImageAlt}">
                    <p class="text-sm text-gray-400">${formattedDate}</p>
                    <h3 class="mt-2 text-xl font-bold text-white hover:text-brand-blue transition-colors">${post.title}</h3>
                </a>
            </div>
        `;
    });
    const finalIndexHtml = indexTemplate.replace('{{LATEST_POSTS}}', latestPostsHtml);
    fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), finalIndexHtml);
    console.log('Updated index.html with latest posts.');
}

build().catch(error => {
    console.error('Build process failed:', error);
    process.exit(1);
});
