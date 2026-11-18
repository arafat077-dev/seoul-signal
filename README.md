# Seoul Signal

An interactive 3D atlas for choosing where to test an electronics shop in Seoul. Compare districts, shortlist places to visit, and calculate the weekly sales a pilot would need to break even. A course project by Group 2, Sejong University.

## Publish this copy to GitHub Pages (free, no terminal)

1. Extract the ZIP on your computer. Inside it you will find `docs`, `tests`, `tools`, and this README. Keep the `docs` folder intact.
2. In [GitHub → New repository](https://github.com/new), choose your account as owner, use the repository name `seoul-signal`, and select **Public**. Leave the README, license and `.gitignore` options off, then click **Create repository**.
3. On the empty repository's **Quick setup** screen, click **uploading an existing file**. If the repository already has a first commit, use **Add file → Upload files**. From inside the extracted ZIP folder, drag `docs`, `tests`, `tools`, and `README.md` onto the upload area. Commit to `main`. On the Code tab you should see `docs/index.html` when you click into `docs`.
4. In **Settings → Pages → Build and deployment**, select **Deploy from a branch**. Choose **main**, then **/docs**, then **Save**. If no branch is selectable, first complete step 3 and refresh Settings.
5. Wait for the Pages deployment to finish, then use **Visit site** on the same Settings page. This is the public link to share. Future commits to `main` update the site automatically.

No build command, paid plan for this public repository, API key, or model download is required for the standard guide. For official details see [GitHub Pages: publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Try the project

- **Overview**: rotate the map or select one of the 25 districts.
- **Explorer**: compare sales, transaction counts and sales per transaction over 22 quarters.
- **Pilot planner**: select a category and rank by won gained or by growth rate. Enter your expenses and contribution margin; download a scouting brief with an on-site checklist.
- **Ask Signal**: try “I want to sell laptops. My weekly fixed costs are ₩3 million and my margin is 25%. Where should I test?” The built-in guide works immediately. Optional on-device language interpretation requires HTTPS, a compatible GPU and a separate model download.

## Data, limits and reproducing the results

Seoul Metropolitan Government, [Estimated Sales by Autonomous District (OA-22176)](https://data.seoul.go.kr/dataList/OA-22176/S/1/datasetView.do), via Seoul Open Data Plaza and Seoul Credit Guarantee Foundation (KOGL Type 1, attribution). See the [team notebook](https://colab.research.google.com/drive/1UMpTsgrLMeF_hGisMtOV9yVqcE9Nt0kW?usp=sharing).

The snapshot covers Q1 2021–Q2 2026: 25 districts, three categories and 1,637 of 1,650 expected observations. Gaps were left missing. Of 75 district–category pairs, 74 had complete Q1 and Q2 data in 2025 and 2026; 11 passed the pilot rule. Shortlists use nominal district-level sales estimates. They do not establish individual store demand, profit or rent. A user's budget and margin are scenarios.

All public web assets are in `docs/`, including aggregate CSVs, matching rules, evidence and attribution. See `docs/assets/map-sources.txt`, `docs/assets/licenses/`, and `docs/assets/vendor/` for third-party sources and notices. The GitHub Pages edition uses relative URLs, so links work under a repository path.

- `node tests/decision-checks.cjs` checks sales, ranking, missing observations, budget calculations and the guide against the project results.
- `python tools/prepare_data.py <path-to-extracted-project-demo-kit>` regenerates the data snapshot using the original Group 2 export.
- `python tools/portable.py` rebuilds `docs/Seoul_Signal_Offline.html` after changes.
- To preview locally: `python -m http.server 8000 --directory docs`, then open `http://localhost:8000`. Or open `docs/Seoul_Signal_Offline.html` directly for a self-contained demo.
