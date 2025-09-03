const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const simpleGit = require('simple-git');
const { google } = require('googleapis');

// --- Configuration ---
const BUILD_DIR = path.join(__dirname, 'public');
const POSTS_DIR = path.join(__dirname, 'posts');
const STATIC_DIR = __dirname;

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

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

// --- Core Build Functions ---

async function buildBlog() {
    console.log('--- Starting Blog Build ---');
    if (!fs.existsSync(POSTS_DIR)) {
        console.log("No 'posts' directory found. Skipping blog generation.");
        return { posts: [], latestPostsHtml: '' };
    }
    
    const postFiles = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md'));
    if (postFiles.length === 0) {
        console.log('No blog posts found.');
        return { posts: [], latestPostsHtml: '' };
    }

    const git = simpleGit();
    const posts = await Promise.all(postFiles.map(async (fileName) => {
        try {
            const filePath = path.join(POSTS_DIR, fileName);
            const fileContents = fs.readFileSync(filePath, 'utf8');
            
            const titleMatch = fileContents.match(/^\s*# (.*)/m);
            const title = titleMatch ? titleMatch[1] : 'Untitled Post';

            const imageMatch = fileContents.match(/!\[(.*?)\]\((.*?)\)/);
            const featuredImage = imageMatch ? imageMatch[2] : 'https://placehold.co/1200x600/1e293b/4ade80?text=Caprock+Tech';
            const featuredImageAlt = imageMatch ? imageMatch[1] : 'Blog post image';

            let bodyContent = fileContents.replace(/^\s*# (.*)/m, '').replace(/!\[(.*?)\]\((.*?)\)/, '').trim();

            const log = await git.log({ file: filePath, n: 1 });
            const publicationDate = log.latest ? new Date(log.latest.date) : new Date();

            return {
                title,
                slug: slugify(title),
                author: "Nick Stevens, Founder/Owner at Caprock Technology Group",
                publicationDate,
                featuredImage,
                featuredImageAlt,
                body: marked(bodyContent),
            };
        } catch (error) {
            console.error(`Error processing post: ${fileName}. Skipping.`, error);
            return null;
        }
    }));

    const validPosts = posts.filter(p => p !== null).sort((a, b) => b.publicationDate - a.publicationDate);
    console.log(`Found and processed ${validPosts.length} blog posts.`);

    // Generate HTML for latest posts (for homepage)
    let latestPostsHtml = '';
    validPosts.slice(0, 3).forEach(post => {
        latestPostsHtml += `
            <div class="glass-card rounded-xl overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
                <a href="${post.slug}.html">
                    <img class="h-56 w-full object-cover" src="${post.featuredImage}" alt="${post.featuredImageAlt}">
                    <div class="p-6">
                        <p class="text-sm text-gray-400">${post.publicationDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <h3 class="mt-2 text-xl font-bold text-white">${post.title}</h3>
                    </div>
                </a>
            </div>`;
    });

    return { posts: validPosts, latestPostsHtml };
}

async function buildVideos() {
    console.log('--- Starting Video Build ---');
    if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
        console.log('YouTube API Key or Channel ID not found. Skipping video generation.');
        return [];
    }

    try {
        const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });
        const response = await youtube.search.list({
            channelId: YOUTUBE_CHANNEL_ID,
            part: 'snippet',
            maxResults: 12,
            order: 'date',
            type: 'video'
        });

        const videos = response.data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.high.url
        }));
        console.log(`Found and processed ${videos.length} videos from YouTube.`);
        return videos;
    } catch (error) {
        console.error('Error fetching YouTube videos:', error.message);
        return [];
    }
}

// --- Main Build Process ---

async function main() {
    console.log('Starting site build...');

    // 1. Clean and prepare the build directory
    fs.ensureDirSync(BUILD_DIR);
    fs.emptyDirSync(BUILD_DIR);
    console.log('Build directory cleaned.');

    // 2. Copy static files (HTML templates, images, etc.)
    const staticFiles = fs.readdirSync(STATIC_DIR).filter(file => 
        !['.git', 'node_modules', 'posts', 'public', 'build.js', 'package.json', 'package-lock.json', 'netlify.toml', 'youtube-setup.md'].includes(file)
    );
    staticFiles.forEach(file => {
        fs.copySync(path.join(STATIC_DIR, file), path.join(BUILD_DIR, file));
    });
    console.log('Static files copied to build directory.');


    // 3. Fetch all data concurrently
    const [blogData, videos] = await Promise.all([
        buildBlog(),
        buildVideos()
    ]);

    const { posts, latestPostsHtml } = blogData;

    // 4. Read the HTML templates from the BUILD directory
    const indexTemplate = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf-8');
    const blogTemplate = fs.readFileSync(path.join(BUILD_DIR, 'blog.html'), 'utf-8');
    const postTemplate = fs.readFileSync(path.join(BUILD_DIR, 'post-template.html'), 'utf-8');
    const videosTemplate = fs.readFileSync(path.join(BUILD_DIR, 'videos.html'), 'utf-8');
    const videoTemplate = fs.readFileSync(path.join(BUILD_DIR, 'video-template.html'), 'utf-8');

    // 5. Build Blog Pages
    let blogListHtml = '';
    posts.forEach(post => {
        // Create individual post page
        let newPostHtml = postTemplate
            .replace(/{{POST_TITLE}}/g, post.title)
            .replace(/{{POST_DATE}}/g, post.publicationDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' }))
            .replace(/{{POST_AUTHOR}}/g, post.author)
            .replace(/{{POST_IMAGE_URL}}/g, post.featuredImage)
            .replace(/{{POST_IMAGE_ALT}}/g, post.featuredImageAlt)
            .replace('{{POST_BODY}}', post.body);
        fs.writeFileSync(path.join(BUILD_DIR, `${post.slug}.html`), newPostHtml);

        // Add to main blog list
        blogListHtml += `
            <div class="glass-card rounded-xl overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
                <a href="${post.slug}.html">
                    <img class="h-56 w-full object-cover" src="${post.featuredImage}" alt="${post.featuredImageAlt}">
                    <div class="p-6">
                         <p class="text-sm text-gray-400">${post.publicationDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <h3 class="mt-2 text-xl font-bold text-white">${post.title}</h3>
                    </div>
                </a>
            </div>`;
    });
    const finalBlogPageHtml = blogTemplate.replace('{{BLOG_POSTS_LIST}}', blogListHtml);
    fs.writeFileSync(path.join(BUILD_DIR, 'blog.html'), finalBlogPageHtml);
    console.log('Finished generating blog pages.');

    // 6. Build Video Pages
    let videoListHtml = '';
    videos.forEach(video => {
        // Create individual video page
        let newVideoHtml = videoTemplate
            .replace(/{{VIDEO_TITLE}}/g, video.title)
            .replace(/{{VIDEO_ID}}/g, video.id)
            .replace(/{{VIDEO_DESCRIPTION}}/g, video.description);
        fs.writeFileSync(path.join(BUILD_DIR, `video-${video.id}.html`), newVideoHtml);

        // Add to main video list
        videoListHtml += `
            <div class="glass-card rounded-xl overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
                <a href="video-${video.id}.html">
                    <img class="w-full object-cover" src="${video.thumbnail}" alt="${video.title}">
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-white">${video.title}</h3>
                    </div>
                </a>
            </div>`;
    });
    const finalVideosPageHtml = videosTemplate.replace('{{VIDEOS_LIST}}', videoListHtml || '<p class="text-center col-span-full">No videos found. Check back soon!</p>');
    fs.writeFileSync(path.join(BUILD_DIR, 'videos.html'), finalVideosPageHtml);
    console.log('Finished generating video pages.');

    // 7. Update Homepage with latest posts
    const finalIndexHtml = indexTemplate.replace('{{LATEST_POSTS}}', latestPostsHtml || '<p class="text-center col-span-full">No recent posts found.</p>');
    fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), finalIndexHtml);
    console.log('Homepage updated with latest posts.');

    console.log('Build process finished successfully!');
}

main().catch(error => {
    console.error('Build process failed:', error);
    process.exit(1);
});

