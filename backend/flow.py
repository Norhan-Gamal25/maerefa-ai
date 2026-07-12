"""
MaerefaFlow — CrewAI Flow orchestrator.
Fix 3: Per-request state isolation (always fresh MaerefaState).
Fix 4: Crew stability guards (try/except + FALLBACK_RESPONSES).
Fix 5: Guardrail fallback — run_guardrail now catches exceptions so the
       flow never fails at the @start() step.
Fix 7: Sentinel blocked flag — if the sentinel sets blocked=True the flow
       routes to "blocked" and returns an error without running any crew.
"""
import logging
from crewai.flow.flow import Flow, listen, router, start
from backend.models.schemas import MaerefaState, SentinelOutput
from backend.config.fallbacks import FALLBACK_RESPONSES
from backend.crews.guardrail_crew import run_guardrail_crew
from backend.crews.kids_crew import run_kids_crew
from backend.crews.college_crew import run_college_crew
from backend.crews.researcher_crew import run_researcher_crew

_DEFAULT_BLOCK_REASON = (
    "That request cannot be processed. "
    "Maerefa Online covers Mathematics, Physics, Chemistry, and Computer Science "
    "for educational purposes only."
)


class MaerefaFlow(Flow[MaerefaState]):

    @start()
    def run_guardrail(self):
        try:
            result = run_guardrail_crew(self.state.raw_prompt, self.state.mode or None)
        except Exception as exc:
            logging.exception("guardrail_crew failed: %s", exc)
            mode = self.state.mode if self.state.mode in ("kids", "college", "researcher") else "college"
            result = SentinelOutput(
                mode=mode,
                domain="general",
                safe_prompt=self.state.raw_prompt,
                visual_prompt=(
                    f"abstract geometric STEM visualization of {self.state.raw_prompt}, "
                    "sacred geometry, fractal patterns, no living beings"
                ),
            )
        self.state.mode = result.mode
        self.state.domain = result.domain
        self.state.safe_prompt = result.safe_prompt
        self.state.visual_prompt = result.visual_prompt
        self.state.language_hint = self.state.raw_prompt  # preserve original language
        self.state.agent_trace.append("STEM Sentinel (GLM-5.2)")
        # Propagate block decision into state so route_by_mode can act on it
        if result.blocked:
            self.state.mode = "blocked"
            self.state.safe_prompt = result.block_reason or _DEFAULT_BLOCK_REASON

    @router(run_guardrail)
    def route_by_mode(self) -> str:
        mode = self.state.mode
        if mode == "blocked":
            return "blocked"
        if mode in ("kids", "college", "researcher"):
            return mode
        return "college"  # safe default

    @listen("blocked")
    def run_blocked(self):
        """No-op handler — blocked requests produce no crew output."""
        pass

    @listen("kids")
    def run_kids(self):
        try:
            output = run_kids_crew(
                self.state.safe_prompt,
                self.state.visual_prompt,
                self.state.domain,
                self.state.language_hint,
            )
            self._apply_output(output)
        except Exception as exc:
            logging.exception("kids_crew failed: %s", exc)
            self._apply_output(FALLBACK_RESPONSES["kids"])

    @listen("college")
    def run_college(self):
        try:
            output = run_college_crew(
                self.state.safe_prompt,
                self.state.visual_prompt,
                self.state.domain,
                self.state.language_hint,
            )
            self._apply_output(output)
        except Exception as exc:
            logging.exception("college_crew failed: %s", exc)
            self._apply_output(FALLBACK_RESPONSES["college"])

    @listen("researcher")
    def run_researcher(self):
        try:
            output = run_researcher_crew(
                self.state.safe_prompt,
                self.state.visual_prompt,
                self.state.domain,
                self.state.language_hint,
            )
            self._apply_output(output)
        except Exception as exc:
            logging.exception("researcher_crew failed: %s", exc)
            self._apply_output(FALLBACK_RESPONSES["researcher"])

    def _apply_output(self, output: dict) -> None:
        self.state.explanation = output.get("explanation", {})
        self.state.wonder_cards = output.get("wonder_cards", [])
        self.state.quiz = output.get("quiz", {})
        self.state.image_url = output.get("image_url")
        self.state.agent_trace.extend(output.get("agent_trace", []))


def run_maerefa_flow(prompt: str, mode_hint: str | None = None) -> dict:
    """
    Convenience entry point. Fix 6: always creates a fresh MaerefaState.
    Pass initial state via constructor — Flow.state has no setter in this
    version of CrewAI and cannot be assigned after instantiation.
    """
    initial = MaerefaState(
        raw_prompt=prompt,
        mode=mode_hint or "",
    )
    flow = MaerefaFlow(initial_state=initial)
    flow.kickoff()
    return flow.state.model_dump()
