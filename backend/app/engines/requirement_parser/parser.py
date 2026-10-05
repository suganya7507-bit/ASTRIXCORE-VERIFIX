"""AI-Powered Requirement Parser with Auto-Traceability.

Parses natural language specifications, extracts structured requirements,
and automatically generates traceability links to RTL, assertions, tests,
coverage, and simulations.
"""

import re
import json
import uuid
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Set
from enum import Enum
from datetime import datetime

from ..rtl_parser.parser import RTLParser, DesignModule
from ..spec_parser.parser import SpecParser


class RequirementCategory(str, Enum):
    FUNCTIONAL = "functional"
    PERFORMANCE = "performance"
    TIMING = "timing"
    POWER = "power"
    SECURITY = "security"
    RESET = "reset"
    INTERFACE = "interface"
    STATE_MACHINE = "state_machine"
    DATA_INTEGRITY = "data_integrity"
    ERROR_HANDLING = "error_handling"


class RequirementPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TraceabilityStatus(str, Enum):
    NOT_STARTED = "not_started"
    ASSERTION_WRITTEN = "assertion_written"
    TEST_GENERATED = "test_generated"
    COVERAGE_MAPPED = "coverage_mapped"
    VERIFIED = "verified"
    UNKNOWN = "unknown"


@dataclass
class ParsedRequirement:
    id: str
    title: str
    description: str
    category: RequirementCategory
    priority: RequirementPriority
    source_text: str
    source_location: Dict[str, Any]  # {doc_id, section, line}
    extracted_entities: List[str] = field(default_factory=list)  # signal/module names
    related_signals: List[str] = field(default_factory=list)
    related_modules: List[str] = field(default_factory=list)
    verification_objectives: List[str] = field(default_factory=list)
    assumptions: List[str] = field(default_factory=list)
    constraints: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

    # Traceability links
    assertions: List[str] = field(default_factory=list)  # assertion IDs
    tests: List[str] = field(default_factory=list)  # test IDs
    coverage_points: List[str] = field(default_factory=list)
    simulations: List[str] = field(default_factory=list)
    status: TraceabilityStatus = TraceabilityStatus.NOT_STARTED


@dataclass
class TraceabilityMatrix:
    """Complete traceability from requirements to verification artifacts."""
    requirements: Dict[str, ParsedRequirement] = field(default_factory=dict)
    requirement_to_assertion: Dict[str, List[str]] = field(default_factory=dict)
    requirement_to_test: Dict[str, List[str]] = field(default_factory=dict)
    requirement_to_coverage: Dict[str, List[str]] = field(default_factory=dict)
    assertion_to_requirement: Dict[str, List[str]] = field(default_factory=dict)
    test_to_requirement: Dict[str, List[str]] = field(default_factory=dict)

    # Coverage gaps
    unverified_requirements: List[str] = field(default_factory=list)
    orphan_assertions: List[str] = field(default_factory=list)
    orphan_tests: List[str] = field(default_factory=list)


class AIRequirementParser:
    """AI-powered requirement parser with RTL-aware traceability."""

    def __init__(self, llm_client=None):
        self.llm_client = llm_client
        self.rtl_parser = RTLParser()
        self.spec_parser = SpecParser()

        # Patterns for requirement extraction
        self.requirement_patterns = [
            r"(?:shall|must|should)\s+(.+?)(?:\.|$)",
            r"(?:requirement|req)[\s\-:]*(.+?)(?:\.|$)",
            r"(?:verify|check|ensure)\s+(?:that\s+)?(.+?)(?:\.|$)",
            r"(?:the\s+\w+\s+)?(?:shall|will)\s+(.+?)(?:\.|$)",
        ]

    def parse_specification(self, spec_content: str, doc_id: str = "spec_001") -> List[ParsedRequirement]:
        """Parse a specification document into structured requirements."""
        requirements = []

        # First, try LLM-based parsing if available
        if self.llm_client:
            llm_requirements = self._parse_with_llm(spec_content, doc_id)
            if llm_requirements:
                return llm_requirements

        # Fallback: rule-based parsing
        return self._parse_rule_based(spec_content, doc_id)

    def _parse_with_llm(self, spec_content: str, doc_id: str) -> Optional[List[ParsedRequirement]]:
        """Use LLM to extract structured requirements."""
        try:
            prompt = self._build_llm_prompt(spec_content)
            response = self.llm_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert verification engineer extracting requirements from specifications."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            return self._parse_llm_response(response.choices[0].message.content, doc_id)
        except Exception:
            return None

    def _build_llm_prompt(self, spec_content: str) -> str:
        return f"""Extract all verification requirements from this specification. Return JSON with format:
{{
  "requirements": [
    {{
      "id": "REQ-001",
      "title": "Brief title",
      "description": "Full description",
      "category": "functional|performance|timing|power|security|reset|interface|state_machine|data_integrity|error_handling",
      "priority": "critical|high|medium|low",
      "source_text": "Original text from spec",
      "source_location": {{"doc_id": "spec_001", "section": "3.2", "line": 45}},
      "extracted_entities": ["signal_name", "module_name"],
      "related_signals": ["clk", "rst", "data_in"],
      "related_modules": ["fifo", "controller"],
      "verification_objectives": ["objective1", "objective2"],
      "assumptions": ["assumption1"],
      "constraints": ["constraint1"]
    }}
  ]
}}

Specification:
{spec_content[:15000]}"""

    def _parse_llm_response(self, response: str, doc_id: str) -> List[ParsedRequirement]:
        data = json.loads(response)
        requirements = []
        for i, req_data in enumerate(data.get("requirements", [])):
            req = ParsedRequirement(
                id=req_data.get("id", f"REQ-{i+1:03d}"),
                title=req_data.get("title", f"Requirement {i+1}"),
                description=req_data.get("description", ""),
                category=RequirementCategory(req_data.get("category", "functional")),
                priority=RequirementPriority(req_data.get("priority", "medium")),
                source_text=req_data.get("source_text", ""),
                source_location=req_data.get("source_location", {"doc_id": doc_id}),
                extracted_entities=req_data.get("extracted_entities", []),
                related_signals=req_data.get("related_signals", []),
                related_modules=req_data.get("related_modules", []),
                verification_objectives=req_data.get("verification_objectives", []),
                assumptions=req_data.get("assumptions", []),
                constraints=req_data.get("constraints", []),
            )
            requirements.append(req)
        return requirements

    def _parse_rule_based(self, spec_content: str, doc_id: str) -> List[ParsedRequirement]:
        """Rule-based requirement extraction as fallback."""
        requirements = []
        lines = spec_content.split("\n")
        req_id = 0

        for line_num, line in enumerate(lines):
            line = line.strip()
            for pattern in self.requirement_patterns:
                matches = re.finditer(pattern, line, re.IGNORECASE)
                for match in matches:
                    req_id += 1
                    req_text = match.group(1).strip()
                    if len(req_text) < 10:  # Skip too short
                        continue

                    req = ParsedRequirement(
                        id=f"REQ-{req_id:03d}",
                        title=req_text[:80],
                        description=req_text,
                        category=self._classify_category(req_text),
                        priority=self._infer_priority(req_text),
                        source_text=req_text,
                        source_location={"doc_id": doc_id, "line": line_num + 1},
                        extracted_entities=self._extract_entities(req_text),
                    )
                    requirements.append(req)
        return requirements

    def _classify_category(self, text: str) -> RequirementCategory:
        text_lower = text.lower()
        if any(kw in text_lower for kw in ["reset", "power on", "initialization"]):
            return RequirementCategory.RESET
        elif any(kw in text_lower for kw in ["timing", "clock", "cycle", "latency", "setup", "hold"]):
            return RequirementCategory.TIMING
        elif any(kw in text_lower for kw in ["power", "energy", "consumption"]):
            return RequirementCategory.POWER
        elif any(kw in text_lower for kw in ["secure", "encrypt", "authenticat", "access control", "trust"]):
            return RequirementCategory.SECURITY
        elif any(kw in text_lower for kw in ["interface", "protocol", "handshake", "bus", "axi", "apb"]):
            return RequirementCategory.INTERFACE
        elif any(kw in text_lower for kw in ["state", "fsm", "state machine", "transition"]):
            return RequirementCategory.STATE_MACHINE
        elif any(kw in text_lower for kw in ["data integrity", "crc", "parity", "checksum", "ecc"]):
            return RequirementCategory.DATA_INTEGRITY
        elif any(kw in text_lower for kw in ["error", "exception", "fault", "recover", "retry"]):
            return RequirementCategory.ERROR_HANDLING
        elif any(kw in text_lower for kw in ["performance", "throughput", "bandwidth", "rate"]):
            return RequirementCategory.PERFORMANCE
        return RequirementCategory.FUNCTIONAL

    def _infer_priority(self, text: str) -> RequirementPriority:
        text_lower = text.lower()
        if any(kw in text_lower for kw in ["critical", "safety", "must not", "shall not fail", "mandatory"]):
            return RequirementPriority.CRITICAL
        elif any(kw in text_lower for kw in ["shall", "must", "required"]):
            return RequirementPriority.HIGH
        elif any(kw in text_lower for kw in ["should", "recommended", "preferred"]):
            return RequirementPriority.MEDIUM
        return RequirementPriority.LOW

    def _extract_entities(self, text: str) -> List[str]:
        """Extract signal/module names from requirement text."""
        # Look for capitalized words that look like identifiers
        pattern = r'\b[A-Z][A-Z0-9_]*\b'
        entities = re.findall(pattern, text)
        # Filter common words
        common = {"SHALL", "MUST", "SHOULD", "THE", "AND", "OR", "IF", "THEN", "WHEN", "WHILE", "REQ", "ID"}
        return [e for e in entities if e not in common and len(e) > 2]

    def link_to_rtl(self, requirements: List[ParsedRequirement], rtl_content: str) -> List[ParsedRequirement]:
        """Link requirements to RTL modules and signals."""
        modules = self.rtl_parser.parse(rtl_content)
        all_signals = set()
        all_modules = {m.name for m in modules}

        for module in modules:
            all_signals.update([p.name for p in module.ports])
            all_signals.update([s.name for s in module.signals])

        for req in requirements:
            # Link modules
            req.related_modules = [m for m in all_modules if m.lower() in req.description.lower()]
            # Link signals
            req.related_signals = [s for s in all_signals if s.lower() in req.description.lower()]

            # If no direct matches, try extracted entities
            if not req.related_modules:
                req.related_modules = [e for e in req.extracted_entities if e in all_modules]
            if not req.related_signals:
                req.related_signals = [e for e in req.extracted_entities if e in all_signals]

        return requirements

    def build_traceability_matrix(self, requirements: List[ParsedRequirement]) -> TraceabilityMatrix:
        """Build initial traceability matrix from requirements."""
        matrix = TraceabilityMatrix()
        for req in requirements:
            matrix.requirements[req.id] = req
            matrix.unverified_requirements.append(req.id)
        return matrix

    def update_traceability(self, matrix: TraceabilityMatrix,
                            assertions: List[Dict] = None,
                            tests: List[Dict] = None,
                            coverage: List[Dict] = None) -> TraceabilityMatrix:
        """Update traceability matrix with verification artifacts."""
        if assertions:
            for assertion in assertions:
                assertion_id = assertion.get("id") or assertion.get("name", "")
                # Match by related modules/signals
                for req_id, req in matrix.requirements.items():
                    if self._assertion_matches_requirement(assertion, req):
                        matrix.requirement_to_assertion.setdefault(req_id, []).append(assertion_id)
                        matrix.assertion_to_requirement.setdefault(assertion_id, []).append(req_id)
                        req.assertions.append(assertion_id)

        if tests:
            for test in tests:
                test_id = test.get("id") or test.get("name", "")
                for req_id, req in matrix.requirements.items():
                    if self._test_matches_requirement(test, req):
                        matrix.requirement_to_test.setdefault(req_id, []).append(test_id)
                        matrix.test_to_requirement.setdefault(test_id, []).append(req_id)
                        req.tests.append(test_id)

        if coverage:
            for cov in coverage:
                cov_id = cov.get("id", "")
                for req_id, req in matrix.requirements.items():
                    if self._coverage_matches_requirement(cov, req):
                        matrix.requirement_to_coverage.setdefault(req_id, []).append(cov_id)
                        req.coverage_points.append(cov_id)

        # Update statuses
        for req_id, req in matrix.requirements.items():
            if req.coverage_points and req.tests and req.assertions:
                req.status = TraceabilityStatus.VERIFIED
            elif req.coverage_points and req.tests:
                req.status = TraceabilityStatus.COVERAGE_MAPPED
            elif req.tests:
                req.status = TraceabilityStatus.TEST_GENERATED
            elif req.assertions:
                req.status = TraceabilityStatus.ASSERTION_WRITTEN
            else:
                req.status = TraceabilityStatus.NOT_STARTED

        # Find gaps
        matrix.unverified_requirements = [
            req_id for req_id, req in matrix.requirements.items()
            if req.status == TraceabilityStatus.NOT_STARTED
        ]

        return matrix

    def _assertion_matches_requirement(self, assertion: Dict, req: ParsedRequirement) -> bool:
        assertion_text = (assertion.get("assertion_code", "") + assertion.get("explanation", "")).lower()
        req_text = (req.description + " " + " ".join(req.related_signals + req.related_modules)).lower()
        # Better tokenization: use regex word boundaries, strip punctuation
        req_keywords = set(re.findall(r'\b\w{4,}\b', req_text))
        assertion_keywords = set(re.findall(r'\b\w{4,}\b', assertion_text))
        overlap = req_keywords & assertion_keywords
        return len(overlap) >= 2

    def _test_matches_requirement(self, test: Dict, req: ParsedRequirement) -> bool:
        test_text = (test.get("test_code", "") + test.get("verification_objective", "")).lower()
        req_text = (req.description + " " + " ".join(req.related_signals + req.related_modules)).lower()
        req_keywords = set(re.findall(r'\b\w{4,}\b', req_text))
        test_keywords = set(re.findall(r'\b\w{4,}\b', test_text))
        overlap = req_keywords & test_keywords
        return len(overlap) >= 2

    def _coverage_matches_requirement(self, coverage: Dict, req: ParsedRequirement) -> bool:
        cov_details = str(coverage.get("details", {}))
        req_text = (req.description + " " + " ".join(req.related_signals + req.related_modules)).lower()
        req_keywords = set(re.findall(r'\b\w{4,}\b', req_text))
        cov_keywords = set(re.findall(r'\b\w{4,}\b', cov_details.lower()))
        overlap = req_keywords & cov_keywords
        return len(overlap) >= 2

    def export_traceability_report(self, matrix: TraceabilityMatrix) -> Dict:
        """Export traceability matrix as structured report."""
        return {
            "summary": {
                "total_requirements": len(matrix.requirements),
                "verified": sum(1 for r in matrix.requirements.values() if r.status == TraceabilityStatus.VERIFIED),
                "coverage_mapped": sum(1 for r in matrix.requirements.values() if r.status == TraceabilityStatus.COVERAGE_MAPPED),
                "test_generated": sum(1 for r in matrix.requirements.values() if r.status == TraceabilityStatus.TEST_GENERATED),
                "assertion_written": sum(1 for r in matrix.requirements.values() if r.status == TraceabilityStatus.ASSERTION_WRITTEN),
                "not_started": sum(1 for r in matrix.requirements.values() if r.status == TraceabilityStatus.NOT_STARTED),
            },
            "requirements": {
                req_id: {
                    "id": req.id,
                    "title": req.title,
                    "category": req.category.value,
                    "priority": req.priority.value,
                    "status": req.status.value,
                    "assertions": req.assertions,
                    "tests": req.tests,
                    "coverage_points": req.coverage_points,
                    "related_modules": req.related_modules,
                    "related_signals": req.related_signals,
                }
                for req_id, req in matrix.requirements.items()
            },
            "gaps": {
                "unverified_requirements": matrix.unverified_requirements,
                "orphan_assertions": matrix.orphan_assertions,
                "orphan_tests": matrix.orphan_tests,
            }
        }