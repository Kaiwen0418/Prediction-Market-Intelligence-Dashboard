from typing import Literal

from fastapi import APIRouter, Query

from app.schemas.research import ResearchOverviewResponse, ResearchStateSummaryResponse
from app.services.research import get_research_overview, get_research_summary

router = APIRouter(prefix="/api/research", tags=["research"])


@router.get("/states/{state}/summary", response_model=ResearchStateSummaryResponse)
async def get_state_summary(
    state: str,
    party: Literal["Democrat", "Republican"] = Query(default="Republican"),
) -> ResearchStateSummaryResponse:
    return get_research_summary(state, party)


@router.get("/states/overview", response_model=ResearchOverviewResponse)
async def get_states_overview(
    party: Literal["Democrat", "Republican"] = Query(default="Republican"),
) -> ResearchOverviewResponse:
    return get_research_overview(party)
