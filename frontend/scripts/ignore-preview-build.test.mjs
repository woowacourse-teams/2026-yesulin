import { describe, expect, it, vi } from 'vitest';
import { shouldSkipPreview } from './ignore-preview-build.mjs';

const full_name = 'woowacourse-teams/2026-yesulin';
const preview = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_REPO_OWNER: 'woowacourse-teams',
  VERCEL_GIT_REPO_SLUG: '2026-yesulin',
  VERCEL_GIT_COMMIT_REF: 'fix/example',
  VERCEL_GIT_PULL_REQUEST_ID: '42',
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
};
const base = { repo: { full_name }, sha: 'b'.repeat(40) };
const head = { repo: { full_name }, sha: preview.VERCEL_GIT_COMMIT_SHA, ref: preview.VERCEL_GIT_COMMIT_REF };
const backend = { filename: 'backend/src/Example.java', status: 'modified' };
const frontend = { filename: 'frontend/src/example.ts', status: 'modified' };

function pullRequest(files, overrides = {}) {
  return vi.fn()
    .mockResolvedValueOnce({ state: 'open', base, head, changed_files: files.length, ...overrides })
    .mockResolvedValueOnce({ files });
}

describe('Vercel PR preview', () => {
  it('skips only after comparing the verified base and deployment SHA', async () => {
    const read = pullRequest([backend, { ...backend, filename: 'backend/src/Old.java', status: 'removed' }]);
    await expect(shouldSkipPreview(preview, read)).resolves.toBe(true);
    expect(read.mock.calls).toEqual([['pulls/42'], [`compare/${base.sha}...${head.sha}?per_page=1`]]);
  });

  it.each([
    [frontend],
    [backend, frontend],
    [backend, { filename: 'package-lock.json', status: 'modified' }],
    [{ ...frontend, status: 'removed' }],
    [{ ...backend, status: 'renamed', previous_filename: frontend.filename }],
    [{ ...frontend, status: 'renamed', previous_filename: backend.filename }],
    [{ ...backend, status: 'renamed' }],
    [{ filename: 'backend-other/config.yml', status: 'modified' }],
    [],
  ].map((files) => ({ files })))('builds with changes $files', async ({ files }) => {
    await expect(shouldSkipPreview(preview, pullRequest(files))).resolves.toBe(false);
  });

  it('skips a rename entirely inside backend/', async () => {
    const read = pullRequest([{ ...backend, status: 'renamed', previous_filename: 'backend/src/Old.java' }]);
    await expect(shouldSkipPreview(preview, read)).resolves.toBe(true);
  });

  it.each([
    { VERCEL_ENV: 'production' },
    { VERCEL_GIT_COMMIT_REF: 'dev' },
    { VERCEL_GIT_COMMIT_REF: 'main' },
    { VERCEL_GIT_COMMIT_REF: '' },
    { VERCEL_GIT_PULL_REQUEST_ID: '' },
    { VERCEL_GIT_COMMIT_SHA: 'unknown' },
    { VERCEL_GIT_REPO_OWNER: 'fork' },
  ])('builds outside confirmed PR previews (%o)', async (overrides) => {
    const read = vi.fn();
    await expect(shouldSkipPreview({ ...preview, ...overrides }, read)).resolves.toBe(false);
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    { head: { ...head, sha: base.sha } },
    { head: { ...head, ref: 'fix/other' } },
    { head: { ...head, repo: { full_name: 'fork/2026-yesulin' } } },
    { base: null },
    { changed_files: 2 },
    { changed_files: 300 },
    { state: 'closed' },
  ])('builds when PR metadata cannot confirm the comparison (%o)', async (overrides) => {
    await expect(shouldSkipPreview(preview, pullRequest([backend], overrides))).resolves.toBe(false);
  });

  it('builds when GitHub is unavailable or omits the file list', async () => {
    const unavailable = vi.fn().mockRejectedValue(new Error('GitHub API unavailable'));
    const missingFiles = pullRequest([backend]);
    missingFiles.mockReset().mockResolvedValueOnce({ state: 'open', base, head, changed_files: 1 })
      .mockResolvedValueOnce({});
    await expect(shouldSkipPreview(preview, unavailable)).resolves.toBe(false);
    await expect(shouldSkipPreview(preview, missingFiles)).resolves.toBe(false);
  });
});
