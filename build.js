const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const simpleGit = require('simple-git');
const { google } = require('googleapis');

// --- CONFIGURATION ---
const POSTS_DIR = path.join(__dirname, 'posts');
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- YOUTUBE API CONFIG ---
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

// --- HELPER FUNCTIONS ---
function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function getFileCreationDate(filePath) {
    try {
        const git = simpleGit();
        const log = await git.log({ file: filePath, n: 1, format: '%aD' });
        return log.latest ? new Date(log.latest) : new Date();
    } catch (error) {
        console.warn(`Could not get git log for ${filePath}. Using current date.`, error);
        return new Date();
    }
}

// --- BLOG BUILDER ---
async function buildBlog() {
    console.log('\n--- Starting Blog Build ---');
    if (!fs.existsSync(POSTS_DIR)) {
        console.log("No 'posts' directory found. Skipping blog generation.");
        return [];
    }
    const postFiles = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md'));
    if (postFiles.length === 0) {
        console.log('No blog posts found.');
        return [];
    }

    const posts = [];
    for (const fileName of postFiles) {
        const filePath = path.join(POSTS_DIR, fileName);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const titleMatch = fileContents.match(/^\s*# (.*)/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled Post';
        const imageMatch = fileContents.match(/!\[(.*?)\]\((.*?)\)/);
        const featuredImage = imageMatch ? imageMatch[2] : `https://placehold.co/1200x600/1e293b/4ade80?text=${encodeURIComponent(title)}`;
        const featuredImageAlt = imageMatch ? imageMatch[1] : title;
        let bodyContent = fileContents.replace(/^\s*# (.*)/m, '').replace(/!\[(.*?)\]\((.*?)\)/, '').trim();
        
        posts.push({
            title,
            slug: slugify(title),
            author: "Nick Stevens, Founder/Owner at Caprock Technology Group",
            publicationDate: await getFileCreationDate(filePath),
            featuredImage,
            featuredImageAlt,
            body: marked(bodyContent),
        });
    }

    const sortedPosts = posts.sort((a, b) => b.publicationDate - a.publicationDate);
    console.log(`Processed ${sortedPosts.length} blog posts.`);
    return sortedPosts;
}

// --- VIDEO BUILDER ---
async function buildVideos() {
    console.log('\n--- Starting Video Build ---');
    if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
        console.log("YouTube API Key or Channel ID not found in environment variables. Skipping video generation.");
        return [];
    }

    try {
        const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });
        const response = await youtube.search.list({
            channelId: YOUTUBE_CHANNEL_ID,
            part: 'snippet',
            maxResults: 25, // You can adjust this number
            order: 'date',
            type: 'video',
        });

        if (!response.data.items) {
            console.log('No videos found on YouTube channel.');
            return [];
        }

        const videos = response.data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description.replace(/\n/g, '<br>'),
            thumbnail: item.snippet.thumbnails.high.url,
            publicationDate: new Date(item.snippet.publishedAt),
            author: item.snippet.channelTitle,
        }));
        
        console.log(`Found and processed ${videos.length} videos from YouTube.`);
        return videos;

    } catch (error) {
        console.error("Error fetching YouTube videos:", error.message);
        return [];
    }
}


// --- MAIN BUILD PROCESS ---
async function main() {
    console.log('Starting site build...');
    
    // 1. Clean and prepare public directory
    fs.emptyDirSync(PUBLIC_DIR);
    fs.copySync(__dirname, PUBLIC_DIR, {
        dereference: true,
        filter: (src) => {
            const base = path.basename(src);
            return base !== 'public' && base !== 'node_modules' && base !== 'posts';
        }
    });

    // 2. Build Blog and Video content in parallel
    const [posts, videos] = await Promise.all([buildBlog(), buildVideos()]);

    // 3. Read HTML Templates from the new public directory
    const indexTemplate = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
    const blogTemplate = fs.readFileSync(path.join(PUBLIC_DIR, 'blog.html'), 'utf-8');
    const postTemplate = fs.readFileSync(path.join(PUBLIC_DIR, 'post-template.html'), 'utf-8');
    const videosTemplate = fs.readFileSync(path.join(PUBLIC_DIR, 'videos.html'), 'utf-8');
    const videoTemplate = fs.readFileSync(path.join(PUBLIC_DIR, 'video-template.html'), 'utf-8');

    // 4. Populate Blog Pages
    let blogListHtml = '';
    posts.forEach(post => {
        let newPostHtml = postTemplate.replace(/{{POST_TITLE}}/g, post.title)
                                    .replace(/{{POST_DATE}}/g, post.publicationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' }))
                                    .replace(/{{POST_AUTHOR}}/g, post.author)
                                    .replace(/{{POST_IMAGE_URL}}/g, post.featuredImage)
                                    .replace(/{{POST_IMAGE_ALT}}/g, post.featuredImageAlt)
                                    .replace('{{POST_BODY}}', post.body);
        fs.writeFileSync(path.join(PUBLIC_DIR, `${post.slug}.html`), newPostHtml);
        blogListHtml += `
            <a href="${post.slug}.html" class="glass-card rounded-2xl overflow-hidden group transform hover:-translate-y-2 transition-transform duration-300">
                <img class="w-full h-48 object-cover" src="${post.featuredImage}" alt="${post.featuredImageAlt}">
                <div class="p-6">
                    <h3 class="text-xl font-bold text-white mb-2">${post.title}</h3>
                    <p class="text-sm text-gray-400">Published on ${post.publicationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' })}</p>
                </div>
            </a>`;
    });
    const finalBlogPage = blogTemplate.replace('{{BLOG_POSTS_LIST}}', blogListHtml || '<p class="text-center col-span-full">No blog posts found.</p>');
    fs.writeFileSync(path.join(PUBLIC_DIR, 'blog.html'), finalBlogPage);

    // 5. Populate Homepage Latest Insights
    const latestPostsHtml = posts.slice(0, 3).map(post => `
        <a href="${post.slug}.html" class="glass-card rounded-2xl overflow-hidden group transform hover:-translate-y-2 transition-transform duration-300">
            <img class="w-full h-48 object-cover" src="${post.featuredImage}" alt="${post.featuredImageAlt}">
            <div class="p-6">
                <h3 class="text-xl font-bold text-white mb-2">${post.title}</h3>
                <p class="text-sm text-gray-400">Published on ${post.publicationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' })}</p>
            </div>
        </a>`).join('');
    const finalIndexPage = indexTemplate.replace('{{LATEST_POSTS}}', latestPostsHtml || '');
    fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), finalIndexPage);

    // 6. Populate Video Pages
    let videoListHtml = '';
    videos.forEach(video => {
        const videoSlug = slugify(video.title);
        let newVideoHtml = videoTemplate.replace(/{{VIDEO_TITLE}}/g, video.title)
                                    .replace(/{{VIDEO_DATE}}/g, video.publicationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' }))
                                    .replace(/{{VIDEO_AUTHOR}}/g, video.author)
                                    .replace('{{VIDEO_DESCRIPTION}}', video.description)
                                    .replace('{{VIDEO_EMBED}}', `<iframe src="https://www.youtube.com/embed/${video.id}" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
        fs.writeFileSync(path.join(PUBLIC_DIR, `${videoSlug}.html`), newVideoHtml);
        videoListHtml += `
            <a href="${videoSlug}.html" class="glass-card rounded-2xl overflow-hidden group transform hover:-translate-y-2 transition-transform duration-300">
                <img class="w-full h-48 object-cover" src="${video.thumbnail}" alt="${video.title}">
                <div class="p-6">
                    <h3 class="text-xl font-bold text-white mb-2">${video.title}</h3>
                     <p class="text-sm text-gray-400">Published on ${video.publicationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' })}</p>
                </div>
            </a>`;
    });
    const finalVideosPage = videosTemplate.replace('{{VIDEOS_LIST}}', videoListHtml || '<p class="text-center col-span-full">No videos found.</p>');
    fs.writeFileSync(path.join(PUBLIC_DIR, 'videos.html'), finalVideosPage);

    console.log('\n✅ Site build complete! Files are in the /public directory.');
}

main().catch(error => console.error(error));

