# Netball MVP Voting App — GitHub + Firebase Setup Guide

Total time: about 20 minutes. You only ever do this once.

---

## PART 1: Install Node.js (if you don't have it)

1. Go to https://nodejs.org and download the **LTS** version
2. Run the installer (just click through)
3. Open **Terminal** (Mac) or **Command Prompt** (Windows)
4. Confirm it worked: `node -v` should print a version number

---

## PART 2: Create your Firebase project (for the database)

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it `netball-mvp-voting`
3. Disable Google Analytics → click **Create project** → **Continue**

### Enable Firestore

4. Left menu → **Firestore Database** → **Create database**
5. Choose **"Start in test mode"** → **Next**
6. Pick a location near you (e.g. `australia-southeast1`) → **Enable**

### Get your Firebase config

7. Click the ⚙️ gear → **Project settings**
8. Scroll to **"Your apps"** → click the **`</>`** (Web) icon
9. Name it `mvp-app` → **Register app**
10. Copy the `firebaseConfig` block — you'll need it in a moment:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  ...
};
```

---

## PART 3: Create a GitHub repository

1. Go to https://github.com and sign in (or create a free account)
2. Click **"New"** (green button, top left)
3. Name the repo: `mvp-voting-app`
4. Leave it **Public** (required for free GitHub Pages)
5. Click **Create repository**
6. Leave this page open — you'll need the URL shortly

---

## PART 4: Set up the app files

1. Unzip the project folder you downloaded
2. Open `src/firebase.js` in any text editor
3. Replace all the placeholder values with your actual Firebase config from Part 2
4. Save the file
5. Open `package.json` and replace `YOUR_GITHUB_USERNAME` in the `homepage` line with your actual GitHub username (e.g. `https://kasmith.github.io/mvp-voting-app`)
6. Save the file

---

## PART 5: Upload and deploy

Open Terminal / Command Prompt, then run these commands one at a time:

```bash
# Go into the project folder (adjust the path to where you unzipped it)
cd path/to/mvp-voting-app

# Install all dependencies (takes a minute)
npm install

# Set up Git and connect to your GitHub repo
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/mvp-voting-app.git
git push -u origin main

# Deploy to GitHub Pages (builds the app and publishes it)
npm run deploy
```

That's it! After a minute or two, your app will be live at:

**`https://YOUR_GITHUB_USERNAME.github.io/mvp-voting-app`**

Share that URL with your team — it works on any phone or computer.

---

## PART 6: Enable GitHub Pages (first time only)

GitHub Pages may need to be manually pointed to the right branch:

1. Go to your repo on GitHub
2. Click **Settings** → **Pages** (left menu)
3. Under "Branch", select **gh-pages** → click **Save**

---

## Updating the app in future

If you ever need to make changes to the app, edit the files, then run:

```bash
npm run deploy
```

That's all — it rebuilds and republishes automatically.

---

## Troubleshooting

**"gh-pages: command not found"**
→ Run `npm install` again to make sure all dependencies installed

**App loads but votes don't save**
→ Check `src/firebase.js` — make sure all placeholder values were replaced with real ones

**"Permission denied" on Firestore**
→ Go to Firebase Console → Firestore → Rules tab → paste this and Publish:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /mvp/votes {
      allow read, write: if true;
    }
  }
}
```

**Page shows blank screen**
→ Make sure the `homepage` in `package.json` exactly matches your GitHub username and repo name

---

## Your app details

- **Live URL:** `https://YOUR_GITHUB_USERNAME.github.io/mvp-voting-app`
- **PIN for results & reset:** 3743
- **Players:** Layla, Lilly, Olivia, Mahli, Zoe, Chloe, Manha, Heidi, Indi, Zara
- **Rounds:** 19
- **Voting system:** 3, 2, 1 points per round
