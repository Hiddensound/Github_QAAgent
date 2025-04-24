// qa_pr_agent_with_fallback.js (CommonJS + LangChain-compatible with fallback & ESM-safe fetch)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const cheerio = require('cheerio');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Prompt chain setup
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful QA assistant. Based on the GitHub PR info, respond only with markdown-formatted QA summary, scenarios, and test cases."],
  ["user", `Title: {title}\nAuthor: {author}\nJIRA Links: {jiraLinks}\nPreview Links: {previewLinks}\nFiles Changed:\n{filesChanged}`],
]);

const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY,
});
const outputParser = new StringOutputParser();
const chain = prompt.pipe(model).pipe(outputParser);


function askQuestion(query) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    return new Promise(resolve => {
      rl.question(query, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }
  

function extractLinksFromHtml(html) {
  const $ = cheerio.load(html);
  return $('a[href]').map((_, el) => $(el).attr('href')).get();
}

function extractAllVercelPreviews(links) {
  return links.filter(url =>
    url.endsWith('.vercel.app') ||
    url.match(/^https?:\/\/[^\s/]+\.vercel\.app(\/|$)/)
  );
}

function debugPRInfo(prInfo, source) {
  const debugOutput = [
    `\n=== Debug PR Info (from ${source}) ===`,
    `Title: ${prInfo.title}`,
    `Author: ${prInfo.author}`,
    `JIRA Links: ${prInfo.jiraLinks.join(', ') || 'None'}`,
    `Preview Links: ${prInfo.previewLinks.join(', ') || 'None'}`,
    `Files Changed (${prInfo.filesChanged.length}):`,
    ...prInfo.filesChanged.map(f => `- ${f}`),
    '==================\n'
  ];
  console.log(debugOutput.join('\n'));
  return debugOutput.join('\n');
}

function getSanitizedFilename(prUrl) {
  const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) return `qa-summary-${Date.now()}.md`;
  const [, owner, repo, pr] = match;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${owner}-${repo}-pr${pr}-${timestamp}.md`;
}

async function fetchPRHtml(prUrl) {
  const response = await fetch(prUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`HTML fetch failed. Status: ${response.status}`);
  return await response.text();
}

async function fetchPRFromGitHubAPI(prUrl) {
  const match = prUrl.match(/github\.com\/(.+?)\/(.+?)\/pull\/(\d+)/);
  if (!match) throw new Error('Invalid GitHub PR URL format');

  const [, owner, repo, pull_number] = match;
  const headers = {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'qa-pr-agent'
  };

  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`, { headers });
  if (!prRes.ok) throw new Error(`GitHub API PR fetch failed: ${prRes.status}`);
  const prData = await prRes.json();

  const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/files`, { headers });
  if (!filesRes.ok) throw new Error(`GitHub API file fetch failed: ${filesRes.status}`);
  const filesData = await filesRes.json();

  const commentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${pull_number}/comments`, { headers });
  const commentsData = await commentsRes.ok ? await commentsRes.json() : [];

  const allUrls = [
    ...(prData.body?.match(/https?:\/\/[^\s)]+/gi) || []),
    ...commentsData.flatMap(c => c.body?.match(/https?:\/\/[^\s)]+/gi) || [])
  ];

  const previewLinks = extractAllVercelPreviews(allUrls);
  const jiraLinks = prData.body?.match(/https?:\/\/[^\s]+jira[^\s)]+/gi) || [];

  return {
    title: prData.title,
    author: prData.user.login,
    jiraLinks,
    previewLinks,
    filesChanged: filesData.map(f => f.filename),
  };
}

function extractPRInfo(html) {
  const $ = cheerio.load(html);
  const title = $('span.js-issue-title').text().trim();
  const author = $('a.author').first().text().trim();
  const filesChanged = $('a.Link--primary[href*="/files"]').map((_, el) => $(el).text().trim()).get();
  const jiraLinks = $('a[href*="jira"]').map((_, el) => $(el).attr('href')).get();
  const allLinks = extractLinksFromHtml(html);
  const previewLinks = extractAllVercelPreviews(allLinks);
  return { title, author, jiraLinks, previewLinks, filesChanged };
}

async function postCommentToGitHub(prUrl, commentBody) {
  const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) throw new Error('Invalid GitHub PR URL format');
  const [, owner, repo, pull_number] = match;

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${pull_number}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'qa-bot',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: commentBody }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to post comment: ${response.status} - ${errorText}`);
  }
  console.log('✅ QA summary posted to GitHub PR.');
}

(async () => {
  const input = await askQuestion('Enter GitHub PR URL(s), comma-separated: ');
  const prUrls = input.split(',').map(url => url.trim());

  for (const url of prUrls) {
    console.log(`\n--- QA Summary for ${url} ---`);
    try {
      let prInfo, debugLog;
      try {
        const html = await fetchPRHtml(url);
        console.log('✔ HTML fetch succeeded.');
        prInfo = extractPRInfo(html);
        debugLog = debugPRInfo(prInfo, 'HTML');
      } catch (htmlErr) {
        console.warn(`HTML fetch failed (${htmlErr.message}). Trying GitHub API...`);
        prInfo = await fetchPRFromGitHubAPI(url);
        debugLog = debugPRInfo(prInfo, 'API');
      }

      const summary = await chain.invoke({
        title: prInfo.title,
        author: prInfo.author,
        jiraLinks: prInfo.jiraLinks.join(', ') || 'None',
        previewLinks: prInfo.previewLinks.join(', ') || 'None',
        filesChanged: prInfo.filesChanged.map(f => `- ${f}`).join('\n') || 'None'
      });

      console.log(summary);
      const post = await askQuestion('Post this QA summary to GitHub PR? (yes/no): ');
      if (post.toLowerCase().startsWith('y')) {
        await postCommentToGitHub(url, summary);
      }

      const markdownOutput = `# QA Summary for ${url}\n\n\n\n## PR Info\n\n${debugLog}\n\n## QA Summary\n\n${summary}`;
      const filename = path.join('qa_outputs', getSanitizedFilename(url));
      fs.mkdirSync('qa_outputs', { recursive: true });
      fs.writeFileSync(filename, markdownOutput);
      console.log(`📁 QA summary saved to ${filename}`);

    } catch (err) {
      console.error(`❌ Error processing ${url}: ${err.message}`);
    }
  }
})();