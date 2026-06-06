// Static deploy to GitHub Pages WITHOUT GitHub Actions.
//
//   npm run deploy:pages
//
// Builds the app, then force-pushes the built dist/ to the gh-pages branch.
// GitHub Pages serves that branch directly (Settings > Pages > Deploy from a
// branch), so no Actions workflow is involved. Re-run after editing data.
import { execSync } from 'node:child_process'
import { copyFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' })
const capture = (cmd, cwd = root) => execSync(cmd, { cwd }).toString().trim()

const origin = capture('git remote get-url origin')

run('npm run build')

// SPA + Pages niceties: disable Jekyll, and serve index.html on unknown paths.
writeFileSync(path.join(dist, '.nojekyll'), '')
copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))

// Publish dist as an isolated gh-pages branch via a throwaway git repo.
run('git init -q -b gh-pages', dist)
run('git add -A', dist)
run('git -c user.name="deploy" -c user.email="deploy@local" commit -q -m "Deploy to GitHub Pages"', dist)
run(`git push -q -f ${origin} gh-pages`, dist)
run('rm -rf .git', dist)

const match = origin.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
if (match) {
  const [, owner, repo] = match
  console.log(`\nDeployed to gh-pages. Live URL (after Pages is enabled):`)
  console.log(`https://${owner}.github.io/${repo}/`)
} else {
  console.log('\nDeployed to gh-pages.')
}
