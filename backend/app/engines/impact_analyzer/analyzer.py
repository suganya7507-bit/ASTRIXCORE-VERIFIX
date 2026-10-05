"""Design Impact Analysis Engine - Analyzes RTL changes and predicts verification impact."""

import re
import difflib
from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Any, Tuple
from enum import Enum
from collections import defaultdict

from ..rtl_parser.parser import RTLParser, DesignModule


class ChangeType(str, Enum):
    ADDED = "added"
    MODIFIED = "modified"
    DELETED = "deleted"
    REFACTORED = "refactored"


class ImpactSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class VerificationImpact(str, Enum):
    ASSERTIONS_NEED_UPDATE = "assertions_need_update"
    TESTS_NEED_UPDATE = "tests_need_update"
    COVERAGE_NEED_UPDATE = "coverage_need_update"
    PLAN_NEED_UPDATE = "plan_need_update"
    NEW_VERIFICATION_NEEDED = "new_verification_needed"
    NO_IMPACT = "no_impact"


@dataclass
class RTLChange:
    change_id: str
    change_type: ChangeType
    module_name: str
    location: Dict[str, int]  # {start_line, end_line}
    old_code: str
    new_code: str
    affected_signals: List[str] = field(default_factory=list)
    affected_parameters: List[str] = field(default_factory=list)
    affected_ports: List[str] = field(default_factory=list)
    affected_states: List[str] = field(default_factory=list)
    description: str = ""


@dataclass
class ImpactAssessment:
    change_id: str
    severity: ImpactSeverity
    verification_impacts: List[VerificationImpact]
    affected_requirements: List[str] = field(default_factory=list)
    affected_assertions: List[str] = field(default_factory=list)
    affected_tests: List[str] = field(default_factory=list)
    affected_coverage_points: List[str] = field(default_factory=list)
    recommended_actions: List[str] = field(default_factory=list)
    risk_score: float = 0.0  # 0-100


@dataclass
class DesignImpactReport:
    comparison_id: str
    old_version: str
    new_version: str
    total_changes: int
    changes_by_type: Dict[str, int]
    changes_by_module: Dict[str, int]
    changes: List[RTLChange]
    impact_assessments: List[ImpactAssessment]
    overall_risk_score: float
    summary: str
    generated_at: str


class DesignImpactAnalyzer:
    """Analyzes RTL design changes and predicts verification impact."""

    def __init__(self):
        self.rtl_parser = RTLParser()

    def analyze_impact(self, old_rtl: str, new_rtl: str, old_version: str = "v1", new_version: str = "v2") -> DesignImpactReport:
        """Compare two RTL versions and generate impact analysis."""
        # Parse both versions
        old_modules = self.rtl_parser.parse(old_rtl)
        new_modules = self.rtl_parser.parse(new_rtl)

        # Build module maps
        old_map = {m.name: m for m in old_modules}
        new_map = {m.name: m for m in new_modules}

        # Detect changes
        changes = self._detect_changes(old_map, new_map, old_rtl, new_rtl)

        # Assess impacts
        impact_assessments = []
        for change in changes:
            assessment = self._assess_impact(change, old_map, new_map)
            impact_assessments.append(assessment)

        # Calculate overall metrics
        changes_by_type = defaultdict(int)
        changes_by_module = defaultdict(int)
        for change in changes:
            changes_by_type[change.change_type.value] += 1
            changes_by_module[change.module_name] += 1

        overall_risk = sum(a.risk_score for a in impact_assessments) / max(len(impact_assessments), 1)

        return DesignImpactReport(
            comparison_id=f"diff_{old_version}_{new_version}",
            old_version=old_version,
            new_version=new_version,
            total_changes=len(changes),
            changes_by_type=dict(changes_by_type),
            changes_by_module=dict(changes_by_module),
            changes=changes,
            impact_assessments=impact_assessments,
            overall_risk_score=overall_risk,
            summary=self._generate_summary(changes, impact_assessments),
            generated_at=__import__('datetime').datetime.utcnow().isoformat(),
        )

    def _detect_changes(self, old_map: Dict[str, DesignModule], new_map: Dict[str, DesignModule],
                        old_rtl: str, new_rtl: str) -> List[RTLChange]:
        """Detect changes between two RTL versions."""
        changes = []
        change_id = 0

        all_module_names = set(old_map.keys()) | set(new_map.keys())

        for module_name in all_module_names:
            old_module = old_map.get(module_name)
            new_module = new_map.get(module_name)

            if old_module is None and new_module is not None:
                # Module added
                change_id += 1
                changes.append(RTLChange(
                    change_id=f"CHG-{change_id:04d}",
                    change_type=ChangeType.ADDED,
                    module_name=module_name,
                    location={"start_line": new_module.start_line or 0, "end_line": new_module.end_line or 0},
                    old_code="",
                    new_code=self._extract_module_code(new_rtl, new_module),
                    affected_signals=[p.name for p in new_module.ports] + [s.name for s in new_module.signals],
                    affected_parameters=list(new_module.parameters.keys()),
                    affected_ports=[p.name for p in new_module.ports],
                    description=f"New module '{module_name}' added",
                ))

            elif old_module is not None and new_module is None:
                # Module deleted
                change_id += 1
                changes.append(RTLChange(
                    change_id=f"CHG-{change_id:04d}",
                    change_type=ChangeType.DELETED,
                    module_name=module_name,
                    location={"start_line": old_module.start_line or 0, "end_line": old_module.end_line or 0},
                    old_code=self._extract_module_code(old_rtl, old_module),
                    new_code="",
                    affected_signals=[p.name for p in old_module.ports] + [s.name for s in old_module.signals],
                    affected_parameters=list(old_module.parameters.keys()),
                    affected_ports=[p.name for p in old_module.ports],
                    description=f"Module '{module_name}' deleted",
                ))

            elif old_module and new_module:
                # Module exists in both - detect modifications
                module_changes = self._detect_module_changes(old_module, new_module, old_rtl, new_rtl)
                for chg in module_changes:
                    change_id += 1
                    chg.change_id = f"CHG-{change_id:04d}"
                    changes.append(chg)

        return changes

    def _detect_module_changes(self, old_module: 'DesignModule', new_module: 'DesignModule',
                               old_rtl: str, new_rtl: str) -> List[RTLChange]:
        """Detect changes within a module."""
        changes = []

        # Compare ports
        old_ports = {p.name: p for p in old_module.ports}
        new_ports = {p.name: p for p in new_module.ports}

        for port_name in set(old_ports.keys()) | set(new_ports.keys()):
            old_port = old_ports.get(port_name)
            new_port = new_ports.get(port_name)

            if old_port is None:
                # Port added
                changes.append(self._create_change(
                    "ADDED", old_module.name, f"Port '{port_name}' added",
                    "", f"{new_port.direction.value} {new_port.width or ''} {port_name}".strip(),
                    affected_ports=[port_name]
                ))
            elif new_port is None:
                # Port deleted
                changes.append(self._create_change(
                    "DELETED", old_module.name, f"Port '{port_name}' removed",
                    f"{old_port.direction.value} {old_port.width or ''} {port_name}".strip(), "",
                    affected_ports=[port_name]
                ))
            elif old_port.direction != new_port.direction or old_port.width != new_port.width:
                # Port modified
                changes.append(self._create_change(
                    "MODIFIED", old_module.name, f"Port '{port_name}' modified",
                    f"{old_port.direction.value} {old_port.width or ''} {port_name}".strip(),
                    f"{new_port.direction.value} {new_port.width or ''} {port_name}".strip(),
                    affected_ports=[port_name]
                ))

        # Compare parameters
        old_params = set(old_module.parameters) if isinstance(old_module.parameters, list) else set(old_module.parameters.keys())
        new_params = set(new_module.parameters) if isinstance(new_module.parameters, list) else set(new_module.parameters.keys())

        for param in old_params - new_params:
            changes.append(self._create_change(
                "DELETED", old_module.name, f"Parameter '{param}' removed",
                f"parameter {param}", "",
                affected_parameters=[param]
            ))

        for param in new_params - old_params:
            changes.append(self._create_change(
                "ADDED", old_module.name, f"Parameter '{param}' added",
                "", f"parameter {param}",
                affected_parameters=[param]
            ))

        for param in old_params & new_params:
            # Note: can't compare values since parameters is a list
            pass

        # Compare signals
        old_signals = {s.name: s for s in old_module.signals}
        new_signals = {s.name: s for s in new_module.signals}

        for sig_name in old_signals.keys() ^ new_signals.keys():
            if sig_name in old_signals:
                changes.append(self._create_change(
                    "DELETED", old_module.name, f"Signal '{sig_name}' removed",
                    f"{old_signals[sig_name].signal_type.value} {sig_name}", "",
                    affected_signals=[sig_name]
                ))
            else:
                changes.append(self._create_change(
                    "ADDED", old_module.name, f"Signal '{sig_name}' added",
                    "", f"{new_signals[sig_name].signal_type.value} {sig_name}",
                    affected_signals=[sig_name]
                ))

        # Compare FSM states
        old_fsm_states = {s.name for fsm in old_module.fsm_info for s in fsm.states}
        new_fsm_states = {s.name for fsm in new_module.fsm_info for s in fsm.states}

        for state in old_fsm_states - new_fsm_states:
            changes.append(self._create_change(
                "DELETED", old_module.name, f"FSM state '{state}' removed",
                f"state {state}", "",
                affected_states=[state]
            ))

        for state in new_fsm_states - old_fsm_states:
            changes.append(self._create_change(
                "ADDED", old_module.name, f"FSM state '{state}' added",
                "", f"state {state}",
                affected_states=[state]
            ))

        # Compare always blocks (structural changes)
        old_always_count = len(old_module.always_blocks)
        new_always_count = len(new_module.always_blocks)

        if old_always_count != new_always_count:
            changes.append(self._create_change(
                "MODIFIED", old_module.name, f"Always block count changed ({old_always_count} -> {new_always_count})",
                f"{old_always_count} always blocks", f"{new_always_count} always blocks",
                description="Always block structure changed"
            ))

        # Compare instances
        old_instances = {i.get('name', i.get('instance_name', '')) for i in old_module.instances}
        new_instances = {i.get('name', i.get('instance_name', '')) for i in new_module.instances}

        for inst in old_instances - new_instances:
            changes.append(self._create_change(
                "DELETED", old_module.name, f"Instance '{inst}' removed",
                f"instance {inst}", "",
                description=f"Submodule instance '{inst}' removed"
            ))

        for inst in new_instances - old_instances:
            changes.append(self._create_change(
                "ADDED", old_module.name, f"Instance '{inst}' added",
                "", f"instance {inst}",
                description=f"Submodule instance '{inst}' added"
            ))

        return changes

    def _create_change(self, change_type: str, module_name: str, description: str,
                       old_code: str, new_code: str, **kwargs) -> RTLChange:
        return RTLChange(
            change_id="",  # Will be set by caller
            change_type=ChangeType(change_type.lower()),
            module_name=module_name,
            location={"start_line": 0, "end_line": 0},
            old_code=old_code,
            new_code=new_code,
            description=description,
            **kwargs
        )

    def _extract_module_code(self, rtl: str, module) -> str:
        """Extract module code from RTL."""
        if module.start_line and module.end_line:
            lines = rtl.split('\n')
            start = max(0, (module.start_line or 1) - 1)
            end = min(len(lines), module.end_line or len(lines))
            return '\n'.join(lines[start:end])
        return ""

    def _assess_impact(self, change: RTLChange, old_map: Dict, new_map: Dict) -> 'ImpactAssessment':
        """Assess verification impact of a change."""
        severity = self._calculate_severity(change)
        verification_impacts = self._determine_verification_impacts(change)
        risk_score = self._calculate_risk_score(change, severity)

        return ImpactAssessment(
            change_id=change.change_id,
            severity=severity,
            verification_impacts=verification_impacts,
            recommended_actions=self._generate_recommendations(change, verification_impacts),
            risk_score=risk_score,
        )

    def _calculate_severity(self, change: RTLChange) -> ImpactSeverity:
        """Calculate severity based on change type and affected elements."""
        if change.change_type == ChangeType.DELETED:
            return ImpactSeverity.CRITICAL
        elif change.change_type == ChangeType.ADDED:
            return ImpactSeverity.HIGH
        elif change.change_type == ChangeType.MODIFIED:
            # Check what was modified
            if change.affected_ports:
                return ImpactSeverity.HIGH
            elif change.affected_parameters:
                return ImpactSeverity.MEDIUM
            elif change.affected_signals:
                return ImpactSeverity.MEDIUM
            elif change.affected_states:
                return ImpactSeverity.HIGH
            return ImpactSeverity.MEDIUM
        return ImpactSeverity.LOW

    def _determine_verification_impacts(self, change: RTLChange) -> List[VerificationImpact]:
        """Determine what verification artifacts are impacted."""
        impacts = []

        if change.affected_ports:
            impacts.extend([
                VerificationImpact.ASSERTIONS_NEED_UPDATE,
                VerificationImpact.TESTS_NEED_UPDATE,
                VerificationImpact.COVERAGE_NEED_UPDATE,
                VerificationImpact.PLAN_NEED_UPDATE,
            ])

        if change.affected_parameters:
            impacts.append(VerificationImpact.ASSERTIONS_NEED_UPDATE)
            impacts.append(VerificationImpact.TESTS_NEED_UPDATE)

        if change.affected_signals:
            impacts.extend([
                VerificationImpact.ASSERTIONS_NEED_UPDATE,
                VerificationImpact.COVERAGE_NEED_UPDATE,
            ])

        if change.affected_states:
            impacts.extend([
                VerificationImpact.ASSERTIONS_NEED_UPDATE,
                VerificationImpact.TESTS_NEED_UPDATE,
                VerificationImpact.COVERAGE_NEED_UPDATE,
            ])

        if change.change_type == ChangeType.ADDED:
            impacts.append(VerificationImpact.NEW_VERIFICATION_NEEDED)

        if change.change_type == ChangeType.DELETED:
            impacts.append(VerificationImpact.PLAN_NEED_UPDATE)

        if not impacts:
            impacts.append(VerificationImpact.NO_IMPACT)

        return list(set(impacts))

    def _calculate_risk_score(self, change: RTLChange, severity: ImpactSeverity) -> float:
        """Calculate risk score 0-100."""
        base_scores = {
            ImpactSeverity.CRITICAL: 90,
            ImpactSeverity.HIGH: 70,
            ImpactSeverity.MEDIUM: 40,
            ImpactSeverity.LOW: 15,
            ImpactSeverity.NONE: 0,
        }
        score = base_scores.get(severity, 0)

        # Adjust for scope
        scope_factor = min(len(change.affected_ports) * 5 + len(change.affected_signals) * 3 +
                          len(change.affected_states) * 10 + len(change.affected_parameters) * 2, 50)

        return min(score + scope_factor, 100)

    def _generate_recommendations(self, change: RTLChange, impacts: List[VerificationImpact]) -> List[str]:
        """Generate recommended actions for verification team."""
        recommendations = []

        if VerificationImpact.ASSERTIONS_NEED_UPDATE in impacts:
            recommendations.append("Review and update assertions for affected signals/ports")
        if VerificationImpact.TESTS_NEED_UPDATE in impacts:
            recommendations.append("Regenerate or update tests covering modified interfaces")
        if VerificationImpact.COVERAGE_NEED_UPDATE in impacts:
            recommendations.append("Update coverage model and re-run coverage analysis")
        if VerificationImpact.PLAN_NEED_UPDATE in impacts:
            recommendations.append("Update verification plan to reflect interface changes")
        if VerificationImpact.NEW_VERIFICATION_NEEDED in impacts:
            recommendations.append("Create new verification components for added functionality")

        if change.change_type == ChangeType.DELETED:
            recommendations.append("Archive or remove obsolete verification artifacts")
        if change.change_type == ChangeType.ADDED:
            recommendations.append("Create verification plan for new module/interface")

        return recommendations

    def _generate_summary(self, changes: List[RTLChange], assessments: List[ImpactAssessment]) -> str:
        """Generate human-readable summary."""
        type_counts = defaultdict(int)
        for c in changes:
            type_counts[c.change_type.value] += 1

        critical_count = sum(1 for a in assessments if a.severity == ImpactSeverity.CRITICAL)
        high_count = sum(1 for a in assessments if a.severity == ImpactSeverity.HIGH)

        lines = [
            f"Design Impact Analysis Summary",
            f"=" * 40,
            f"Total Changes: {len(changes)}",
            f"  Added: {type_counts.get('added', 0)}",
            f"  Modified: {type_counts.get('modified', 0)}",
            f"  Deleted: {type_counts.get('deleted', 0)}",
            f"",
            f"Severity Distribution:",
            f"  Critical: {critical_count}",
            f"  High: {high_count}",
            f"  Medium: {sum(1 for a in assessments if a.severity == ImpactSeverity.MEDIUM)}",
            f"  Low: {sum(1 for a in assessments if a.severity == ImpactSeverity.LOW)}",
            f"",
            f"Overall Risk Score: {sum(a.risk_score for a in assessments) / max(len(assessments), 1):.1f}/100",
            f"",
            f"Key Verification Impacts:",
        ]

        impact_counts = defaultdict(int)
        for a in assessments:
            for impact in a.verification_impacts:
                impact_counts[impact.value] += 1

        for impact, count in sorted(impact_counts.items(), key=lambda x: -x[1]):
            lines.append(f"  {impact}: {count} changes")

        return "\n".join(lines)


# Convenience function for API
async def analyze_design_impact(old_rtl: str, new_rtl: str, old_version: str = "v1", new_version: str = "v2") -> DesignImpactReport:
    """Analyze design impact between two RTL versions."""
    analyzer = DesignImpactAnalyzer()
    return analyzer.analyze_impact(old_rtl, new_rtl, old_version, new_version)