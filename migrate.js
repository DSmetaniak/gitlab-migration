const axios = require('axios').default;
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const winston = require('winston')

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'migrate.log' })
    ]
});


// Getting the environment variables
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const GITLAB_GROUP = process.env.GITLAB_GROUP;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG;

if (!GITLAB_TOKEN || !GITHUB_TOKEN || !GITLAB_GROUP || !GITHUB_ORG) {
    logger.error("Error: Not all environment variables are configured");
    process.exit(1);
}

// Reading the list of repositories from the repo.txt file
const REPO_LIST_FILE = path.join(__dirname, 'repo.txt');
if (!fs.existsSync(REPO_LIST_FILE)) {
    logger.error(`Error: File ${REPO_LIST_FILE} not found`);
    process.exit(1);
}

const REPO_NAMES = fs.readFileSync(REPO_LIST_FILE, 'utf8')
    .split('\n')
    .map(repo => repo.trim())
    .filter(repo => repo.length > 0);

if (REPO_NAMES.length === 0) {
    logger.error("Error: File repo.txt is empty");
    process.exit(1);
}

// API endpoints
const GITLAB_API = `https://gitlab.com/api/v4/groups/${GITLAB_GROUP}/projects?per_page=100`;
const GITHUB_API = `https://api.github.com/user/repos`;

// Getting a list of repositories from GitLab
async function getGitLabRepos() {
    logger.info("Getting a list of repositories from GitLab...");
    try {
        const response = await axios.get(GITLAB_API, {
            headers: { "PRIVATE-TOKEN": GITLAB_TOKEN },
        });

        return response.data.reduce((acc, repo) => {
            if (REPO_NAMES.includes(repo.name)) {
                acc.push({
                    name: repo.name,
                    gitlab_url: repo.http_url_to_repo,
                    correct_path: repo.path_with_namespace
                });
            }
            return acc;
        }, []);
    } catch (error) {
        logger.error("Fetching repositories from GitLab failed:", error);
        process.exit(1);
    }
}

// Check if the repository is already on GitHub
async function checkGitHubRepoExists(repoName) {
    try {
        await axios.get(`https://api.github.com/repos/${GITHUB_ORG}/${repoName}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        logger.warn(`Repository ${repoName} already exists on GitHub. Skip...`);
        return true;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return false; // No repository → you can migrate
        }
        logger.error(`Repository checkout error ${repoName} in GitHub:`, error);
        process.exit(1);
    }
}

// Create a repository on GitHub
async function createGitHubRepo(repoName) {
    logger.info(`Create a repository ${repoName} in GitHub...`);
    try {
        await axios.post(
            GITHUB_API,
            { name: repoName, private: true },
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );
        return `https://github.com/${GITHUB_ORG}/${repoName}.git`;
    } catch (error) {
        if (error.response && error.response.status === 422) {
            console.log(`Repository ${repoName} already exists on GitHub. Skip...`);
            return `https://github.com/${GITHUB_ORG}/${repoName}.git`;
        }
        logger.error(`Error creating a repository ${repoName} in GitHub:`, error);
        process.exit(1);
    }
}

// Migrate the repository
async function migrateRepo(repo) {
    logger.info(`Starting the migration ${repo.name}...`);

    // Check if the repository is already on GitHub
    const existsOnGitHub = await checkGitHubRepoExists(repo.name);
    if (existsOnGitHub) {
        return;
    }

    // Create a repository on GitHub
    const gitHubUrl = await createGitHubRepo(repo.name);

    const localPath = path.join(__dirname, repo.name);
    try {
        logger.info(`Clonning ${repo.name}...`);
        const gitlabUrlWithToken = repo.gitlab_url.replace("https://", `https://oauth2:${GITLAB_TOKEN}@`);
        execSync(`git clone --mirror ${gitlabUrlWithToken} ${localPath}`, { stdio: 'inherit' });

        logger.info(`Download ${repo.name} in GitHub...`);
        execSync(`cd ${localPath} && git remote set-url --push origin ${gitHubUrl} && git push --mirror`, { stdio: 'inherit' });

        fs.rmSync(localPath, { recursive: true, force: true });

        logger.info(`Repository ${repo.name} successfully transferred!`);
    } catch (error) {
        logger.error(`Migration error ${repo.name}:`, error);
    }
}

// The main process of migration
(async () => {
    const repos = await getGitLabRepos();
    if (repos.length === 0) {
        logger.warn("No repositories for migration");
        process.exit(0);
    }

    for (const repo of repos) {
        await migrateRepo(repo);
    }

    logger.info("Selected repositories have been successfully migrated");
})();

