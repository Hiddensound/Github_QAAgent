# GitHub QA_PR Agent

This is a task-specific, tool-augmented AI agent built with LangChain to generate **QA summaries and test case suggestions** for GitHub Pull Requests. It dynamically interprets the content of a PR, reasons over the changes using an LLM (OpenAI or Anthropic Claude), and generates rich, markdown-based QA deliverables. Optionally, it can even post these summaries directly back to the PR via the GitHub API.

---

## ✨ What Makes This an Agent (Not Just a Script)?

| Characteristic             | Agent Behavior                                                                 |
|---------------------------|---------------------------------------------------------------------------------|
| 🎯 Goal-oriented          | Designed to summarize PRs and generate QA coverage insights automatically.     |
| 📚 Context-aware          | Adapts responses based on the PR's contents, changes, and comments.            |
| 🧠 Uses AI Reasoning      | Leverages LLMs (OpenAI or Claude) for semantic understanding and test planning. |
| 🤝 Interactive Autonomy   | Asks user whether to post to GitHub, acts accordingly.                         |
| 🧩 Modular & Chain-driven | Uses LangChain chains and prompts for structured orchestration.                 |

> **Note:** This is not a general-purpose agent like AutoGPT or a multi-agent system like CrewAI. It's a focused, intelligent tool — **a copilot agent for QA teams.**

---

## 📦 Installation Guide

### 1. Clone this Repo
```bash
git clone <your-repo-url>
cd <your-repo-folder>
```

### 2. Install Dependencies
Make sure you have Node.js v18+.
```bash
npm install dotenv node-fetch cheerio readline fs path \
            @langchain/core @langchain/openai @langchain/anthropic
```

### 3. Create a `.env` File
```bash
touch .env
```

Then add the following environment variables:
```env
# For OpenAI
OPENAI_API_KEY=your-openai-key

# For Anthropic (Claude)
ANTHROPIC_API_KEY=your-anthropic-api-key

# For GitHub API (classic token)
GITHUB_TOKEN=your-classic-github-token
```
> 🛡️ **Important**: The `GITHUB_TOKEN` must be a classic personal access token (not a fine-grained one), and it must have the following scopes:
> - `repo` for private repositories
> - `public_repo` for public repositories
> This allows read access to pull requests, comments, and associated metadata.

### 4. Run the Agent (OpenAI Version)
```bash
node githubAgent-openai.js
```

### 5. Run the Agent (Claude Version)
```bash
node githubAgent-claude.js
```

It will prompt you for GitHub PR URLs:
```
Enter GitHub PR URL(s), comma-separated:
```

---

## 🤖 Powered by LangChain

LangChain is a framework for building applications with large language models. In this project, we use:

- **PromptTemplates** to format system and user inputs
- **Models**: `ChatOpenAI` or `ChatAnthropic`
- **OutputParser** to get clean markdown
- **Chain Composition**: prompt → model → parser

This structure enables flexible, traceable, and modular use of LLMs in agentic workflows.

---

## 🧠 What It Can Do

- Extract PR metadata (title, author, files changed, etc.)
- Parse links, detect Vercel preview URLs
- Generate:
  - A markdown-formatted QA summary
  - Suggested test scenarios and test cases
- Prompt user for action: save to markdown or post back to GitHub PR
- Handle fallback from HTML to GitHub API if PR page is inaccessible

---

## 📁 Output

Each PR summary is saved in `qa_outputs/` as:
```
<owner>-<repo>-pr<PR#>-<timestamp>.md
```
You’ll find a QA summary + debug info inside.

---

## 🔜 Roadmap (Future Enhancements)
- [ ] CLI Flag Support 
- [ ] Local CSV/PR file support
- [ ] CI/CD compatible wrapper
- [ ] CLI Tool Publish
- [ ] Adding RAG for contextful responses

---

## 🙌 Credits
Built by a QA engineer exploring AI-driven workflows using LangChain, GitHub APIs, and LLMs.

Have feedback or feature requests? Feel free to fork this repo and contribute!

---

> **This is more than just a script — it’s a smart, AI-augmented assistant that brings context-awareness and QA knowledge into your PR process.**

