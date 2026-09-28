// Builds the site for GitHub Pages and force-pushes dist/ to the gh-pages branch.
// Usage: npm run deploy:pages   (requires `gh auth login` with access to the repo)
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const remote = out('git remote get-url origin');
const repo = remote.replace(/\.git$/, '').split('/').pop();
const dist = resolve('dist');

run('npm run build', { env: { ...process.env, BASE_PATH: `/${repo}/` } });
writeFileSync(resolve(dist, '.nojekyll'), ''); // serve files as-is
rmSync(resolve(dist, '.git'), { recursive: true, force: true });

const git = (args) => run(`git -c credential.helper= -c "credential.helper=!gh auth git-credential" ${args}`, { cwd: dist });
git('init -q -b gh-pages');
git('add -A');
git('-c user.name=deploy -c user.email=deploy@users.noreply.github.com commit -q -m "Deploy to GitHub Pages"');
git(`push -f ${remote} gh-pages`);
rmSync(resolve(dist, '.git'), { recursive: true, force: true });
console.log(`\n[signa] deployed → gh-pages branch of ${remote}`);
