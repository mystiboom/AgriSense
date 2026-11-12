# AgriSense 🌱
### Intelligent Agricultural Monitoring and AI-Powered Insights

AgriSense is a web-based agricultural monitoring platform that brings together crop health observations, soil conditions, weather information, regional monitoring, and AI-powered agricultural assistance.

The platform combines structured agricultural data with Retrieval-Augmented Generation (RAG) to provide contextual answers using stored agricultural knowledge and available field data.

## Features

### 1. Overview Dashboard
- Agricultural health summary.
- Key crop and environmental indicators.
- Regional monitoring overview.

### 2. Field Monitoring
- Monitor individual agricultural fields.
- View NDVI, EVI, and crop stress indicators.
- Explore historical crop observations.
- Identify fields requiring attention.

### 3. Region Explorer
- Explore the regional hierarchy.
- View district, block, and field-level information.
- Compare agricultural health indicators across regions.

### 4. Soil and Weather Monitoring
- View soil moisture and pH measurements.
- Access available nitrogen, phosphorus, and potassium readings.
- Monitor rainfall, temperature, humidity, and wind speed.
- Explore historical environmental observations.

### 5. AI Agricultural Assistant
- Ask natural-language questions about agricultural conditions.
- Retrieve relevant information from the agricultural knowledge base.
- Combine retrieved knowledge with available crop, soil, and weather observations.
- View supporting knowledge sources.
- Maintain conversation history and continue previous conversations.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| UI and animations | Framer Motion, Lucide React |
| HTTP requests | Axios |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Vector search | pgvector |
| Spatial database support | PostGIS |
| Database access | SQLAlchemy, Psycopg |
| AI integration | Google Gemini API |
| Embeddings | Gemini Embedding API |
| AI architecture | Retrieval-Augmented Generation (RAG) |

## Project Structure

```text
AgriSense/
├── backend/
│   ├── routes/
│   │   ├── chat.py
│   │   └── data.py
│   ├── services/
│   │   ├── embedding_service.py
│   │   ├── rag_service.py
│   │   └── vector_store.py
│   ├── database.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the application:

- Python 3.10 or later
- Node.js and npm
- PostgreSQL
- PostgreSQL extensions: **pgvector** and **PostGIS**
- Google Gemini API key

## Database Setup

1. Install PostgreSQL and ensure the PostgreSQL server is running.
2. Install and enable the pgvector and PostGIS extensions.
3. Create a database named `agrisense`.
4. Enable the extensions in the database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
```

5. Configure the required database tables and populate them with the agricultural data and knowledge documents used by the application.

The AI assistant uses vector embeddings stored in PostgreSQL for similarity-based knowledge retrieval.

## Backend Setup

Open a terminal in the project root.

### 1. Create and activate a virtual environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r backend/requirements.txt
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` directory using `.env.example` as a reference.

Configure:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agrisense
DB_USER=postgres
DB_PASSWORD=your_database_password

GEMINI_API_KEY=your_gemini_api_key
```

Use your own database credentials and Gemini API key.

### 4. Start the backend

From the project root:

```powershell
uvicorn main:app --reload --app-dir backend
```

Backend API:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

Open another terminal in the project root.

### 1. Install dependencies

```powershell
cd frontend
npm install
```

### 2. Configure the API URL

Create a `.env` file inside `frontend` using `.env.example` as a reference:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

### 3. Start the frontend

```powershell
npm run dev
```

The Vite development server will provide the local application URL, usually:

```text
http://localhost:5173
```

## Production Build

To generate a production frontend build:

```powershell
cd frontend
npm run build
```

The production output is generated in:

```text
frontend/dist/
```

## AI Architecture

The AI assistant follows a Retrieval-Augmented Generation workflow:

1. The user submits a natural-language question.
2. The question is converted into a vector embedding using the Gemini embedding model.
3. Relevant knowledge documents are retrieved from PostgreSQL using pgvector similarity search.
4. Relevant agricultural observations, including crop, soil, and weather information, are retrieved from the database.
5. Retrieved context is passed to the Gemini language model.
6. The generated response is returned with relevant knowledge sources.
7. Conversation messages are stored to support persistent chat history and contextual follow-up questions.

## Important Notes

- The application requires a configured PostgreSQL database containing the required schema and agricultural records.
- The AI assistant requires a valid Gemini API key.
- Database credentials and API keys must be kept private.
- The frontend API URL and backend CORS configuration must be updated appropriately when deploying the application.
- Agricultural observations are dependent on the data available in the database.

## Project

**AgriSense — Intelligent Agricultural Monitoring and AI-Powered Insights**
