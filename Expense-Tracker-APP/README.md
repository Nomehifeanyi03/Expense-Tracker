# Expense Tracker: where things are

Run it: `npm install`, then `npm run dev`, and open the address it prints.

## The folders

| Folder or file | What it is for |
|---|---|
| `index.html` | The one web page. The app is drawn inside it. |
| `src/main.jsx` | Starts the app. |
| `src/App.jsx` | Decides which screen to show: welcome, sign-in, or the tracker. |
| `src/lib.js` | The rules: categories, totals, budget warnings, notifications, dates. |
| `src/hooks/useAuth.jsx` | Accounts, sign-in and saving data in the browser. |
| `src/hooks/useAppRoute.js` | Makes the Back and Forward buttons work on sign-in screens. |
| `src/components/` | Pieces shown on the screen: Welcome, Navbar (menu), Display (header), Footer, SignIn, Dialog (pop-up). |
| `src/pages/` | One file per tracker page: Dashboard, Transactions, AddEntry, Budgets, Categories, Reports, Notifications, Settings. `shared.jsx` holds pieces that several pages use. |
| `src/*.css` and `components/*/*.css` | Colours, layout and look. |
| `src/assets/` | Images. |

## How data flows

1. A page calls `changeData(...)`, which passes the change to `useAuth`.
2. `useAuth` makes a copy of the data, applies the change and saves it in the browser.
3. The screen redraws with the new numbers.

Saved data is stored under the key `expense-tracker-v1`.

## The sign-in switch

`src/hooks/useAuth.jsx` has a switch called `SKIP_LOGIN`.

- `SKIP_LOGIN = true`: the app opens straight to the dashboard with a demo account and sample data. Logout and Delete account do nothing.
- `SKIP_LOGIN = false`: the Welcome page and the sign-up and sign-in screens are shown again.
