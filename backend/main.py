
from fastapi import FastAPI, HTTPException
from sqlalchemy import text

from database import engine
from routes.data import router as data_router
from routes.chat import router as chat_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AgriSense API",
    description=(
        "Multi-Scale Spatio-Temporal "
        "Crop Stress Synthesizer"
    ),
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://mystiboom.github.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register agricultural data endpoints
app.include_router(data_router)
# Register AI chatbot endpoints
app.include_router(chat_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to AgriSense API",
        "status": "running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "AgriSense"
    }


@app.get("/api/db-check")
def database_check():
    try:
        with engine.connect() as connection:

            result = connection.execute(
                text("""
                    SELECT
                        current_database() AS database,
                        version() AS postgres_version
                """)
            )

            row = result.mappings().one()

            extensions = connection.execute(
                text("""
                    SELECT extname, extversion
                    FROM pg_extension
                    WHERE extname IN ('postgis', 'vector')
                    ORDER BY extname
                """)
            ).mappings().all()

            return {
                "status": "connected",
                "database": row["database"],
                "postgres_version": row["postgres_version"],
                "extensions": [
                    dict(extension)
                    for extension in extensions
                ]
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )
