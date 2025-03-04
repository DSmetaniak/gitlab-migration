# GitLab to GitHub Migration Script

This script allows you to automatically migrate selected repositories from GitLab to GitHub while preserving the full history of commits, tags, and branches.

## Features

- Migrates only selected repositories (list in `repo.txt`).
- Preserves commit history, tags, and branches.
- Automatically creates repositories on GitHub (if they do not already exist).
- Skips repositories that have already been migrated.
- Deletes temporary files after migration.
- Can be run locally or in GitHub Actions.

## Requirements

Before running, make sure you have installed:

- Node.js (check: `node -v`)
- Git (check: `git --version`)
- GitHub and GitLab API tokens

## Installation

1. **Clone the repository (or create a new folder):**
   ```bash
   mkdir gitlab-migration && cd gitlab-migration
   ```

2. **Install the required dependencies:**
   ```bash
   npm init -y  # Creates package.json
   npm install axios  # Installs the axios library
   ```

## Obtaining API Tokens

### GitLab Personal Access Token (`GITLAB_TOKEN`)

1. Go to **GitLab** → **Settings** → **Access Tokens**  
   👉 [GitLab Tokens](https://gitlab.com/-/profile/personal_access_tokens)
2. Create a token with the following permissions:
   - ✅ `read_api`
   - ✅ `read_repository`
   - ✅ `write_repository`
3. Save the token and run:
   ```bash
   export GITLAB_TOKEN="your_gitlab_token"
   ```

### GitLab Group/User Name (`GITLAB_GROUP`)

1. Go to **GitLab** → **Your Groups**
2. Copy the group or username from the URL:
   ```
   https://gitlab.com/my-group
   ```
3. Run the command:
   ```bash
   export GITLAB_GROUP="my-group"
   ```

### GitHub Personal Access Token (`GITHUB_TOKEN`)

1. Go to **GitHub** → **Settings** → **Developer settings** → **Personal access tokens**  
   👉 [GitHub Tokens](https://github.com/settings/tokens)
2. Create a token with the following permissions:
   - ✅ `repo`
   - ✅ `read:org`
   - ✅ `admin:repo_hook`
3. Save the token and run:
   ```bash
   export GITHUB_TOKEN="your_github_token"
   ```

### GitHub Organization/User Name (`GITHUB_ORG`)

1. If migrating to a **personal profile**, set `GITHUB_ORG` to your GitHub username.
2. If migrating to an **organization**, open **GitHub → Your Organizations**  
   👉 [GitHub Organizations](https://github.com/settings/organizations)
3. Run the command:
   ```bash
   export GITHUB_ORG="your-github-org"
   ```

## Preparing the `repo.txt` File

Create `repo.txt` with a list of repositories to be migrated (one per line):
```bash
bestrong
photo-print
```

## Running the Migration

Once you have configured the tokens and created the repository list, run the script:
```bash
node migrate.js
```

## Expected Output

- Retrieved repository list from GitLab
- Skipped repositories that were already migrated
- Cloned selected repositories
- Pushed to GitHub
- Removed temporary files

Example console output:
```
Retrieving repository list from GitLab...
Starting migration of bestrong...
Repository bestrong already exists on GitHub. Skipping...
Starting migration of photo-print...
Creating repository photo-print on GitHub...
Cloning photo-print...
Pushing photo-print to GitHub...
Repository photo-print successfully migrated!
Selected repositories successfully migrated!
```

## Common Issues and Solutions

### ❌ "No repositories for migration!"
✔ Ensure `repos.txt` contains the correct repository names.  
✔ Check the GitLab API using:
```bash
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "https://gitlab.com/api/v4/groups/$GITLAB_GROUP/projects?per_page=100"
```

### ❌ "Error creating repository on GitHub (404)"
✔ Ensure `GITHUB_ORG` is correctly set.  
✔ Run the check:
```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/orgs/$GITHUB_ORG
```

## Conclusion
🎯 **This script allows you to easily and quickly migrate selected repositories from GitLab to GitHub** without unnecessary steps.

💡 **If you have any questions or need additional features – feel free to ask! 🚀🔥**

