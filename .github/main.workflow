workflow "Deploy to gh-pages" {
  resolves = ["Deploy to GitHub Pages"]
  on = "push"
}

action "master branch only" {
  uses = "actions/bin/filter@master"
  args = "branch master"
}

action "Deploy to GitHub Pages" {
  uses = "JamesIves/github-pages-deploy-action@master"
  env = {
    BRANCH = "gh-pages"
    BUILD_SCRIPT = "npm install && npm run build"
    FOLDER = "dist"
    CNAME = "exploretrees.sg"
  }
  secrets = ["ACCESS_TOKEN"]
  needs = ["master branch only"]
}
