workflow "Deploy to gh-pages" {
  resolves = ["Deploy to GitHub Pages"]
  on = "push"
}

action "Deploy to GitHub Pages" {
  uses = "JamesIves/github-pages-deploy-action@1.1.1"
  env = {
    BRANCH = "gh-pages"
    BUILD_SCRIPT = "npm install && npm run build"
    FOLDER = "dist"
    CNAME = "exploretrees.sg"
  }
  secrets = ["GITHUB_TOKEN"]
}
