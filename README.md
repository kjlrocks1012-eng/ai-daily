# AI Daily

A phone app that shows the week's AI news, updated automatically every Monday morning. Every story links to a trusted source.

How it works: every Monday, GitHub runs `scripts/fetch-news.mjs`. The script asks Claude (through the Claude API, with web search limited to trusted outlets) for the week's top AI stories and saves them to `news.json`. GitHub Pages hosts the app for free, and you add it to your phone's home screen.

You'll need a computer for setup, which takes about 20 minutes. After that, it runs on its own.

## 1. Get a Claude API key

1. Go to https://console.anthropic.com and create an account. This is separate from your Claude.ai chat subscription.
2. Under **Billing**, add a payment method and a small amount of credit ($5 is plenty to start).
3. In the Console's settings, make sure **web search** is enabled for your organization. The script won't work without it.
4. Under **API Keys**, create a key and copy it. Keep it private and never paste it into any file in this project.

Cost: web search is billed per search (currently $10 per 1,000 searches) plus normal model usage. One weekly run uses about 12 searches, so expect well under a few dollars a month. Check https://docs.anthropic.com/en/docs/build-with-claude/tool-use/web-search-tool for current rates.

## 2. Create the GitHub repository

1. Create a free account at https://github.com if you don't have one.
2. Click **New repository**. Name it `ai-daily`, set it to **Public** (free Pages hosting needs this), and click **Create repository**.
3. Click **uploading an existing file**. Drag in everything from this folder *except* the `.github` folder: `index.html`, `manifest.json`, `sw.js`, `news.json`, `README.md`, and the `icons` and `scripts` folders. Then click **Commit changes**.
4. Add the workflow file. Computers often hide folders starting with a dot, so create it by hand:
   - Click **Add file → Create new file**.
   - In the name box, type `.github/workflows/update-news.yml`. The slashes create the folders automatically.
   - Open `.github/workflows/update-news.yml` from this folder in a text editor, copy everything, paste it in, and click **Commit changes**.

## 3. Add your API key as a secret

1. In the repository, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `ANTHROPIC_API_KEY`. Value: paste your key. Click **Add secret**.

GitHub encrypts the secret, so nobody visiting your repository can see it.

## 4. Turn on the website

1. Go to **Settings → Pages**.
2. Under **Source**, pick **Deploy from a branch**, choose the `main` branch and the `/ (root)` folder, then click **Save**.
3. After a minute or two the page shows your app's address, something like `https://yourname.github.io/ai-daily/`.

## 5. Load the first stories

1. Go to the **Actions** tab. If asked, click the button to enable workflows.
2. Choose **Update news** on the left, then click **Run workflow**.
3. Wait 1 to 3 minutes for a green check mark. If you see a red X, click into it to read the error (see Troubleshooting).
4. Open your app's address. The stories should be there.

From now on it updates every Monday at about 8:00am New York time (7:00am in winter). You can click **Run workflow** any time for an extra update.

## 6. Put it on your phone

- **iPhone:** open the address in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** open it in Chrome, tap the **⋮** menu, then **Add to Home screen** or **Install app**.

It opens full-screen with its own icon, and it can show the last stories you loaded even when you're offline.

## Customizing

All changes go in `scripts/fetch-news.mjs` (edit it on GitHub with the pencil icon):

- **Trusted sources:** edit the `TRUSTED` list. Only stories from those sites can appear.
- **Topics:** edit `CATEGORIES`. If you add or rename one, also update `CATS` near the bottom of `index.html` so it gets a color and label.
- **Number of stories:** change "15 to 25" in the prompt.
- **Schedule:** in `update-news.yml`, change the `cron` line. `0 12 * * 1-5` runs every weekday, for example. Times are in UTC.

## Troubleshooting

- **"Missing ANTHROPIC_API_KEY secret":** step 3 wasn't saved, or the name is spelled differently.
- **API error 401:** the key is wrong or was deleted. Create a new one and update the secret.
- **API error mentioning web search:** web search isn't enabled for your Console organization (step 1.3).
- **"Could not read Claude's reply as JSON":** this happens occasionally. Run the workflow again.
- **Push failed / permission denied:** go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions**.
- **App shows old stories:** close and reopen it. The app always checks for new stories first.

## Before using it for work

The repository is public, so its code and the news list are visible to anyone with the link. Your API key stays hidden. If you plan to use this on a company device or with a company account, check with your IT team first.
