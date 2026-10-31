# Don't Give Up

A phone app (installable web app) that makes you finish the course you started.

- **Exam date first**: no booked exam, no goal. The plan works backwards from that date; the last 7 days are for practice exams.
- **Udemy lessons as a checklist**: paste the course link, then paste the "Course content" list copied from Udemy. Each lesson becomes a checkbox.
- **Daily target**: remaining lessons ÷ days left. Falling behind raises the target.
- **Proof of learning**: a day counts only with a lesson done *and* one thing you learned, in your own words.
- **Never miss twice**: miss 2 days and the app asks you to message your accountability buddy (WhatsApp/SMS).
- **Boring-middle warning** at 30–50%, where most people quit.
- **One course at a time**: the next course unlocks when you pass the exam. Quitting requires typing `I GIVE UP`.

Data stays on your phone (localStorage). Use Export in Settings for backups.

## Run locally

```
python3 -m http.server 8000   # open http://localhost:8000
npm test                      # parser tests
```

## Put it on your phone

1. In the repo: Settings → Pages → Source: **GitHub Actions**.
2. Merge to `main`. The workflow deploys to `https://<user>.github.io/<repo>/`.
3. Open that link on your phone → Share → **Add to Home Screen**.

Why not load lessons from the link alone? Udemy blocks other websites from reading its course data, so a pure phone app can't fetch it. Pasting the list takes about 30 seconds.
