
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from database import engine

router = APIRouter(
    prefix="/api",
    tags=["Agricultural Data"]
)


# --------------------------------------------------
# COMMON DATABASE FUNCTION
# --------------------------------------------------

def fetch_all(query, params=None):
    """Execute a SELECT query and return JSON-friendly rows."""

    with engine.connect() as connection:
        result = connection.execute(
            text(query),
            params or {}
        )

        return [
            dict(row)
            for row in result.mappings().all()
        ]


# --------------------------------------------------
# 1. REGIONS API
# --------------------------------------------------

@router.get("/regions")
def get_regions(
    level: str | None = None
):
    query = """
        SELECT
            r.region_id,
            r.region_name,
            r.region_level,
            r.parent_region_id,
            p.region_name AS parent_region

        FROM regions r

        LEFT JOIN regions p
            ON r.parent_region_id = p.region_id

        WHERE (
            CAST(:level AS VARCHAR) IS NULL
            OR r.region_level = CAST(:level AS VARCHAR)
        )

        ORDER BY r.region_id;
    """

    try:
        return fetch_all(
            query,
            {"level": level}
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# --------------------------------------------------
# 2. CROP OBSERVATIONS API
# --------------------------------------------------

@router.get("/crop-observations")
def get_crop_observations(
    region_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=500)
):

    query = """
        SELECT
            c.observation_id,
            c.region_id,
            r.region_name,
            c.crop_type,
            c.observed_at,
            c.ndvi,
            c.evi,
            c.stress_score,
            c.stress_level,
            c.data_source

        FROM crop_observations c

        JOIN regions r
            ON c.region_id = r.region_id

        WHERE (
            CAST(:region_id AS BIGINT) IS NULL
            OR c.region_id = CAST(:region_id AS BIGINT)
        )

        ORDER BY c.observed_at DESC

        LIMIT CAST(:limit AS INTEGER);
    """

    try:
        return fetch_all(
            query,
            {
                "region_id": region_id,
                "limit": limit
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# --------------------------------------------------
# 3. WEATHER API
# --------------------------------------------------

@router.get("/weather")
def get_weather(
    region_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=500)
):

    query = """
        SELECT
            w.weather_id,
            w.region_id,
            r.region_name,
            w.recorded_at,
            w.rainfall_mm,
            w.temperature_c,
            w.humidity_pct,
            w.wind_speed,
            w.data_source

        FROM weather_records w

        JOIN regions r
            ON w.region_id = r.region_id

        WHERE (
            CAST(:region_id AS BIGINT) IS NULL
            OR w.region_id = CAST(:region_id AS BIGINT)
        )

        ORDER BY w.recorded_at DESC

        LIMIT CAST(:limit AS INTEGER);
    """

    try:
        return fetch_all(
            query,
            {
                "region_id": region_id,
                "limit": limit
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# --------------------------------------------------
# 4. SOIL API
# --------------------------------------------------

@router.get("/soil")
def get_soil(
    region_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=500)
):

    query = """
        SELECT
            s.soil_id,
            s.region_id,
            r.region_name,
            s.recorded_at,
            s.soil_moisture_pct,
            s.soil_ph,
            s.nitrogen,
            s.phosphorus,
            s.potassium,
            s.data_source

        FROM soil_records s

        JOIN regions r
            ON s.region_id = r.region_id

        WHERE (
            CAST(:region_id AS BIGINT) IS NULL
            OR s.region_id = CAST(:region_id AS BIGINT)
        )

        ORDER BY s.recorded_at DESC

        LIMIT CAST(:limit AS INTEGER);
    """

    try:
        return fetch_all(
            query,
            {
                "region_id": region_id,
                "limit": limit
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# --------------------------------------------------
# 5. COMBINED CROP STRESS SUMMARY API
# --------------------------------------------------

@router.get("/stress-summary")
def get_stress_summary():

    query = """
        WITH crop_summary AS (

            SELECT
                region_id,
                ROUND(AVG(ndvi), 4) AS avg_ndvi,
                ROUND(AVG(evi), 4) AS avg_evi,
                MAX(observed_at) AS latest_observation

            FROM crop_observations

            GROUP BY region_id
        ),

        latest_crop AS (

            SELECT DISTINCT ON (region_id)
                region_id,
                stress_score AS latest_stress,
                stress_level AS latest_stress_level

            FROM crop_observations

            ORDER BY region_id, observed_at DESC
        ),

        weather_summary AS (

            SELECT
                region_id,
                ROUND(AVG(rainfall_mm), 2) AS avg_rainfall,
                ROUND(AVG(temperature_c), 2) AS avg_temperature,
                ROUND(AVG(humidity_pct), 2) AS avg_humidity

            FROM weather_records

            GROUP BY region_id
        ),

        soil_summary AS (

            SELECT
                region_id,
                ROUND(AVG(soil_moisture_pct), 2)
                    AS avg_soil_moisture,
                ROUND(AVG(soil_ph), 2) AS avg_soil_ph

            FROM soil_records

            GROUP BY region_id
        )

        SELECT
            r.region_id,
            r.region_name,
            r.region_level,

            c.avg_ndvi,
            c.avg_evi,
            c.latest_observation,

            lc.latest_stress,
            lc.latest_stress_level,

            w.avg_rainfall,
            w.avg_temperature,
            w.avg_humidity,

            s.avg_soil_moisture,
            s.avg_soil_ph

        FROM regions r

        LEFT JOIN crop_summary c
            ON r.region_id = c.region_id

        LEFT JOIN latest_crop lc
            ON r.region_id = lc.region_id

        LEFT JOIN weather_summary w
            ON r.region_id = w.region_id

        LEFT JOIN soil_summary s
            ON r.region_id = s.region_id

        WHERE r.region_level = 'field'
          AND c.region_id IS NOT NULL

        ORDER BY lc.latest_stress DESC NULLS LAST;
    """

    try:
        return fetch_all(query)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
