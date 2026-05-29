# ERW Dashboard

Enhanced Rock Weathering (ERW) analytics dashboard for Indian rivers — built with React + FastAPI + MongoDB.

## Stack

- **Frontend**: React 19, Tailwind CSS, shadcn/ui, Recharts, React Router
- **Backend**: FastAPI (Python), MongoDB via Motor
- **AI**: OpenAI GPT-4o chat integration
- **Deploy**: Vercel (frontend + Python serverless API)

## Local Development

### Prerequisites
- Node.js 18+, Yarn
- Python 3.12+
- MongoDB instance (local or Atlas)

### Backend
```bash
cd api
pip install -r ../requirements.txt
# Create .env from .env.example and fill values
uvicorn index:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
# Create .env with: REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

### 2. Import into Vercel
- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repo
- Vercel auto-detects `vercel.json` — no framework override needed

### 3. Set Environment Variables in Vercel Dashboard
| Variable | Description |
|---|---|
| `MONGO_URL` | MongoDB Atlas connection string |
| `DB_NAME` | Database name (e.g. `erw_db`) |
| `OPENAI_API_KEY` | OpenAI API key for chat |
| `CORS_ORIGINS` | Your Vercel domain (e.g. `https://your-app.vercel.app`) |
| `REACT_APP_BACKEND_URL` | Same as your Vercel domain |

### 4. Deploy
Vercel will build the React frontend and deploy the FastAPI as a Python serverless function.

> **First run**: The API will auto-seed MongoDB from `das1.xlsx` on cold start. Subsequent starts skip seeding.

## Project Structure

```
├── api/
│   └── index.py          # FastAPI app (Vercel Python function)
├── frontend/
│   ├── src/
│   │   ├── pages/        # AnalyticsPage, SimulatorPage, MapPage, GraphPage, DataPage
│   │   ├── components/   # Shell, ChartCard, ChatWidget, shadcn/ui
│   │   ├── lib/api.js    # Axios API calls
│   │   └── App.js
│   └── package.json
├── das1.xlsx             # Seed data (ERW results)
├── requirements.txt      # Python dependencies
├── vercel.json           # Vercel build & routing config
└── .env.example          # Environment variable template
```
