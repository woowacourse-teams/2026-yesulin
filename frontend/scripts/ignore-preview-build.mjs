import { fileURLToPath } from 'node:url';

const repository = 'woowacourse-teams/2026-yesulin';
const integrationBranches = new Set(['dev', 'main']);
const fullSha = /^[a-f0-9]{40}$/;
const ordinaryChanges = new Set(['added', 'modified', 'removed']);

async function getGitHubJson(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return response.json();
}

function isPullRequestPreview(env) {
  const repo = `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}`;
  return env.VERCEL_ENV === 'preview' && Boolean(env.VERCEL_GIT_COMMIT_REF)
    && !integrationBranches.has(env.VERCEL_GIT_COMMIT_REF) && repo === repository
    && /^[1-9]\d*$/.test(env.VERCEL_GIT_PULL_REQUEST_ID)
    && fullSha.test(env.VERCEL_GIT_COMMIT_SHA);
}

function matchesDeployment(pr, env) {
  return pr?.state === 'open' && pr.head?.sha === env.VERCEL_GIT_COMMIT_SHA
    && pr.head?.ref === env.VERCEL_GIT_COMMIT_REF && pr.head?.repo?.full_name === repository
    && pr.base?.repo?.full_name === repository && fullSha.test(pr.base?.sha)
    && Number.isInteger(pr.changed_files) && pr.changed_files > 0 && pr.changed_files < 300;
}

function isBackendPath(path) {
  return typeof path === 'string' && path.startsWith('backend/') && path.length > 'backend/'.length;
}

function isBackendFile(file) {
  if (!isBackendPath(file?.filename)) return false;
  if (file.status === 'renamed') return isBackendPath(file.previous_filename);
  return ordinaryChanges.has(file.status);
}

export async function shouldSkipPreview(env, read = getGitHubJson) {
  if (!isPullRequestPreview(env)) return false;
  try {
    const pr = await read(`pulls/${env.VERCEL_GIT_PULL_REQUEST_ID}`);
    if (!matchesDeployment(pr, env)) return false;
    const comparison = await read(`compare/${pr.base.sha}...${pr.head.sha}?per_page=1`);
    const files = comparison?.files;
    return Array.isArray(files) && files.length === pr.changed_files && files.every(isBackendFile);
  } catch {
    return false;
  }
}

async function run() {
  if (await shouldSkipPreview(process.env)) {
    console.log('Skipping preview build because the PR only changes backend/.');
    return 0;
  }
  console.log('Continuing the Vercel build.');
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await run();
