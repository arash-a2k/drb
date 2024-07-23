# Instructions
This project is based on `expo-router` and its static serving. Components are created with vanila react html components. `Expo` is only used because of expo router and static serving. For styling `tailwind` is used.

## How to Deploy
1. First run `pre-export`. This will remove everything under `public/assets/*`, creates the file `.nojekyll` which is used by github I gusess. Then copies everything from `assets/* ` to `public/assets/`. 

The reason is that when running locally, you can refer the html image tags to `/assets/*` and it will be found and served by expo, but after deployment, github cannot server form assets and only from everything under `public`. This could also be the way that expo router works. **If you want to server from `assets/*` you cannot use direct html img tags, and should Image components from react native.**

2. Then run `pre-deploy` to export the static web by the help of expo
3. Then run `deploy`
This runs `gh-pages -t -d dist --cname dr-khatayee.com`
It run github pages and passes the directory which the project is exported to using `-d`. **Impoartant** `--cname` must be passed so github can serve from a custom domain.
**Important** github repository must be configured to be the one which hosts the github pages. Furthermore, it is at the moment configured to serve from a different branch than master. So whenever this branch is changed, github will serve a new version of the website.  

4.**Important** the `google<somehashstring>.html` file must be there to prove the ownership of the site to Google search I guess.

5. **Important** CNAME file must be there at the root for github to work with custom domains.


## How does development/expo web works
- `+html.jsx` is a static file which covers the template of all genarated html files. It cannot have react logic and all the JS logic will only be run during export/deployment and under ndoeJS env.
- `_layout.jsx` is used to cover for common template of all of the pages. For example the context providers, header, footer etc.

- components are under `/components`
- Pages are under `app/`
- Everything under `app/` is used to serve the website.
- Translations are handled with the help of language hook and translation .json file under each page or components.

- `app/index.js` is for the index page. so `dr-khatayee.com/`.
- Any path under `app/` will be used by the expo router to serve static pages. For example `app/about-us.jsx` will server `dr-khatayee.com/about-us` and `app/dental-implants/index.jsx` for `dr-khatayee.com/dental-implants/`.



## Things to take care while development
### Tailwind Configuration
Take care how to configure tailwind config. For example on this configuration of `tailwind.config.js` `module.exports = {
  content: [
      "./pug/*.pug",
      "./html/*.html",
      "./pages/**/*.{js,tsx,ts,jsx}",
      "./components/**/*.{js,tsx,ts,jsx}",
      // Ensure this points to your source code...
      './*.{js,tsx,ts,jsx}',
    // If you use a `src` folder, add: './src/**/*.{js,tsx,ts,jsx}'
    // Do the same with `components`, `hooks`, `styles`, or any other top-level folders...
  ], ...`

For the content part it is important to make sure only pages and components or anything react related is configured. A bad configuration will include as well node_modules, which will cause the run and export procedures taking forever.