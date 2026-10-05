"""AI-Powered Requirement Parsing & Auto-Traceability API endpoints."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/requirements", tags=["AI Requirement Parsing & Traceability"])


class RequirementRequest(BaseModel):
    specification: str
    rtl_content: Optional[str] = None
    use_llm: bool = False
    doc_id: str = "spec_001"


class RequirementResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    priority: str
    source_text: str
    source_location: Dict[str, Any]
    extracted_entities: List[str]
    related_signals: List[str]
    related_modules: List[str]
    verification_objectives: List[str]
    assumptions: List[str]
    constraints: List[str]
    status: str


class TraceabilityMatrixResponse(BaseModel):
    summary: Dict[str, Any]
    requirements: Dict[str, Any]
    gaps: Dict[str, Any]


class LinkVerificationRequest(BaseModel):
    requirements: List[Dict[str, Any]]
    assertions: Optional[List[Dict[str, Any]]] = None
    tests: Optional[List[Dict[str, Any]]] = None
    coverage: Optional[List[Dict[str, Any]]] = None


@router.post("/parse", response_model=List[RequirementResponse])
async def parse_requirements(request: RequirementRequest):
    """Parse natural language specification into structured requirements with auto-traceability."""
    from app.engines.requirement_parser.parser import (
        AIRequirementParser, RequirementCategory, RequirementPriority, TraceabilityStatus
    )

    parser = AIRequirementParser()

    # Parse requirements from specification
    requirements = parser.parse_specification(request.specification, request.doc_id)

    # Link to RTL if provided
    if request.rtl_content:
        requirements = parser.link_to_rtl(requirements, request.rtl_content)

    # Convert to response format
    return [
        RequirementResponse(
            id=req.id,
            title=req.title,
            description=req.description,
            category=req.category.value,
            priority=req.priority.value,
            source_text=req.source_text,
            source_location=req.source_location,
            extracted_entities=req.extracted_entities,
            related_signals=req.related_signals,
            related_modules=req.related_modules,
            verification_objectives=req.verification_objectives,
            assumptions=req.assumptions,
            constraints=req.constraints,
            status=req.status.value,
        )
        for req in requirements
    ]


@router.post("/traceability", response_model=TraceabilityMatrixResponse)
async def build_traceability(request: LinkVerificationRequest):
    """Build complete traceability matrix linking requirements to verification artifacts."""
    from app.engines.requirement_parser.parser import (
        AIRequirementParser, ParsedRequirement, RequirementCategory, RequirementPriority, TraceabilityStatus
    )

    parser = AIRequirementParser()

    # Reconstruct ParsedRequirement objects
    requirements = []
    for req_data in request.requirements:
        req = ParsedRequirement(
            id=req_data["id"],
            title=req_data["title"],
            description=req_data["description"],
            category=RequirementCategory(req_data.get("category", "functional")),
            priority=RequirementPriority(req_data.get("priority", "medium")),
            source_text=req_data.get("source_text", ""),
            source_location=req_data.get("source_location", {}),
            extracted_entities=req_data.get("extracted_entities", []),
            related_signals=req_data.get("related_signals", []),
            related_modules=req_data.get("related_modules", []),
            verification_objectives=req_data.get("verification_objectives", []),
            assumptions=req_data.get("assumptions", []),
            constraints=req_data.get("constraints", []),
            status=TraceabilityStatus(req_data.get("status", "not_started")),
        )
        requirements.append(req)

    # Build initial matrix
    matrix = parser.build_traceability_matrix(requirements)

    # Update with verification artifacts
    matrix = parser.update_traceability(
        matrix,
        assertions=request.assertions,
        tests=request.tests,
        coverage=request.coverage,
    )

    return TraceabilityMatrixResponse(
        summary=matrix.export_traceability_report()["summary"],
        requirements=matrix.export_traceability_report()["requirements"],
        gaps=matrix.export_traceability_report()["gaps"],
    )


@router.post("/parse-file")
async def parse_requirements_from_file(
    file: UploadFile = File(...),
    rtl_file: Optional[UploadFile] = File(None),
    use_llm: bool = Form(False),
):
    """Parse requirements from uploaded specification file (PDF, Markdown, Text)."""
    content = await file.read()
    content_str = content.decode("utf-8", errors="ignore")

    rtl_content = None
    if rtl_file:
        rtl_content_bytes = await rtl_file.read()
        rtl_content = rtl_content_bytes.decode("utf-8", errors="ignore")

    request = RequirementRequest(
        specification=content_str,
        rtl_content=rtl_content,
        use_llm=use_llm,
        doc_id=file.filename or "uploaded_spec",
    )

    return await parse_requirements(request)


@router.post("/export-traceability")
async def export_traceability_report(request: LinkVerificationRequest, format: str = "json"):
    """Export traceability matrix as JSON, HTML, or CSV."""
    matrix_response = await build_traceability(request)

    if format == "json":
        return matrix_response

    elif format == "html":
        return _render_traceability_html(matrix_response)

    elif format == "csv":
        return _render_traceability_csv(matrix_response)

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


def _render_traceability_html(matrix: TraceabilityMatrixResponse) -> Dict:
    """Render traceability matrix as HTML document."""
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Traceability Matrix Report</title>
<style>
  body {{ font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; color: #1f2937; }}
  h1 {{ border-bottom: 2px solid #111827; padding-bottom: .5rem; }}
  h2 {{ margin-top: 2rem; border-bottom: 1px solid #d1d5db; padding-bottom: .25rem; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1rem 0; }}
  th, td {{ border: 1px solid #d1d5db; padding: .5rem .75rem; text-align: left; }}
  th {{ background: #f3f4f6; }}
  .status-verified {{ background: #dcfce7; color: #166534; }}
  .status-covered {{ background: #dbeafe; color: #1e40af; }}
  .status-test {{ background: #fef3c7; color: #92400e; }}
  .status-assertion {{ background: #fce7f3; color: #9d174d; }}
  .status-none {{ background: #fee2e2; color: #991b1b; }}
  .gap {{ background: #fef2f2; border-left: 4px solid #ef4444; padding: .75rem; margin: .5rem 0; }}
  .summary-card {{ display: inline-block; background: #f3f4f6; padding: 1rem; margin: .5rem; border-radius: .5rem; min-width: 120px; text-align: center; }}
</style>
</head>
<body>
<h1>Traceability Matrix Report</h1>
<p>Generated: {datetime.utcnow().isoformat()}</p>

<h2>Summary</h2>
<div>
  <span class="summary-card"><strong>{matrix['summary'].get('total_requirements', 0)}</strong><br>Total Requirements</span>
  <span class="summary-card" style="background:#dcfce7"><strong>{matrix['summary'].get('verified', 0)}</strong><br>Verified</span>
  <span class="summary-card" style="background:#dbeafe"><strong>{matrix['summary'].get('coverage_mapped', 0)}</strong><br>Coverage Mapped</span>
  <span class="summary-card" style="background:#fef3c7"><strong>{matrix['summary'].get('test_generated', 0)}</strong><br>Tests Generated</span>
  <span class="summary-card" style="background:#fce7f3"><strong>{matrix['summary'].get('assertion_written', 0)}</strong><br>Assertions Written</span>
  <span class="summary-card" style="background:#fee2e2"><strong>{matrix['summary'].get('not_started', 0)}</strong><br>Not Started</span>
</div>

<h2>Requirements Traceability</h2>
<table>
<tr>
  <th>ID</th><th>Title</th><th>Category</th><th>Priority</th>
  <th>Status</th><th>Modules</th><th>Signals</th>
  <th>Assertions</th><th>Tests</th><th>Coverage</th>
</tr>"""

    for req_id, req in matrix["requirements"].items():
        status_class = {
            "verified": "status-verified",
            "coverage_mapped": "status-covered",
            "test_generated": "status-test",
            "assertion_written": "status-assertion",
            "not_started": "status-none",
        }.get(req["status"], "")

        html += f"""
<tr>
  <td>{req['id']}</td>
  <td>{req['title']}</td>
  <td>{req['category']}</td>
  <td>{req['priority']}</td>
  <td class="{status_class}">{req['status'].replace('_', ' ').title()}</td>
  <td>{", ".join(req['related_modules']) or "—"}</td>
  <td>{", ".join(req['related_signals']) or "—"}</td>
  <td>{len(req['assertions'])}</td>
  <td>{len(req['tests'])}</td>
  <td>{len(req['coverage_points'])}</td>
</tr>"""

    html += """
</table>

<h2>Gaps Analysis</h2>"""

    if matrix["gaps"]["unverified_requirements"]:
        html += "<h3>Unverified Requirements</h3>"
        for req_id in matrix["gaps"]["unverified_requirements"]:
            req = matrix["requirements"].get(req_id, {})
            html += f'<div class="gap"><strong>{req_id}</strong>: {req.get("title", "Unknown")}</div>'

    if matrix["gaps"]["orphan_assertions"]:
        html += f"<h3>Orphan Assertions ({len(matrix['gaps']['orphan_assertions'])})</h3>"
        html += "<ul>" + "".join(f"<li>{a}</li>" for a in matrix["gaps"]["orphan_assertions"]) + "</ul>"

    if matrix["gaps"]["orphan_tests"]:
        html += f"<h3>Orphan Tests ({len(matrix['gaps']['orphan_tests'])})</h3>"
        html += "<ul>" + "".join(f"<li>{t}</li>" for t in matrix["gaps"]["orphan_tests"]) + "</ul>"

    html += """
</body>
</html>"""

    return {"content": html, "format": "html"}


def _render_traceability_csv(matrix: TraceabilityMatrixResponse) -> Dict:
    """Render traceability matrix as CSV."""
    import csv
    import io

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Requirement ID", "Title", "Category", "Priority", "Status",
        "Related Modules", "Related Signals",
        "Assertions Count", "Tests Count", "Coverage Points Count",
        "Assertions", "Tests", "Coverage Points"
    ])

    for req_id, req in matrix["requirements"].items():
        writer.writerow([
            req["id"], req["title"], req["category"], req["priority"], req["status"],
            "; ".join(req["related_modules"]),
            "; ".join(req["related_signals"]),
            len(req["assertions"]), len(req["tests"]), len(req["coverage_points"]),
            "; ".join(req["assertions"]),
            "; ".join(req["tests"]),
            "; ".join(req["coverage_points"]),
        ])

    return {"content": output.getvalue(), "format": "csv"}