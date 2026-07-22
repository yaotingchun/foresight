"""
Forecast Service

Loads infra_metrics.csv, detects anomaly windows using the trained OutageDetector,
and computes a simple rolling-mean forecast for the next 30 minutes.

Exposes:
  - get_metric_forecast(component_id, metric, hours) -> dict
  - get_forecast_summary(component_id)              -> str  (AI-written)
"""
from __future__ import annotations

import os, sys, json
import numpy as np
import pandas as pd
from datetime import timedelta

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.outage_detector import OutageDetector, FEATURES

# ── module-level cache so we don't re-read 66 MB on every request ──────────
_metrics_df: pd.DataFrame | None = None
_detector: OutageDetector | None = None

DISPLAY_METRICS = {
    "cpu_pct":               "CPU (%)",
    "memory_pct":            "Memory (%)",
    "latency_ms":            "Latency (ms)",
    "error_rate":            "Error Rate (%)",
    "log_error_rate_per_min":"Log Error Rate (/min)",
}

# Keys that come out of infra_metrics.csv (rename from the raw header)
_RAW_RENAME = {"error_rate_pct": "error_rate"}


def _load(data_dir: str):
    global _metrics_df, _detector
    if _metrics_df is not None:
        return

    path = os.path.join(data_dir, "infra_metrics.csv")
    df = pd.read_csv(path, parse_dates=["timestamp"])
    df = df.rename(columns=_RAW_RENAME)
    if "log_error_rate_per_min" not in df.columns:
        df["log_error_rate_per_min"] = 0.0
    _metrics_df = df

    det = OutageDetector()
    det.fit(df)
    _detector = det
    print("ForecastService: data loaded and detector fitted.")


def _ensure_loaded(data_dir: str):
    if _metrics_df is None:
        _load(data_dir)


# ── helpers ────────────────────────────────────────────────────────────────

def _downsample(series: pd.Series, target_points: int = 300) -> pd.Series:
    """Resample a time-indexed series to ~target_points evenly-spaced rows."""
    if len(series) <= target_points:
        return series
    freq = max(1, len(series) // target_points)
    return series.iloc[::freq]


def _anomaly_windows(flagged_df: pd.DataFrame, gap_minutes: int = 5) -> list[dict]:
    """Merge nearby anomaly timestamps into contiguous [start, end] windows."""
    if flagged_df.empty:
        return []
    ts = pd.to_datetime(flagged_df["timestamp"]).sort_values()
    gap = pd.Timedelta(minutes=gap_minutes)
    windows, start, prev = [], ts.iloc[0], ts.iloc[0]
    for t in ts.iloc[1:]:
        if t - prev > gap:
            windows.append({"start": start.isoformat(), "end": (prev + pd.Timedelta(seconds=60)).isoformat()})
            start = t
        prev = t
    windows.append({"start": start.isoformat(), "end": (prev + pd.Timedelta(seconds=60)).isoformat()})
    return windows


def _build_forecast(historical: pd.Series, horizon_minutes: int = 30) -> dict:
    """
    Rolling-mean extrapolation with a ±1.5-sigma confidence band.
    Returns {times, values, lower, upper}.
    """
    window = min(60, len(historical))
    last_val = float(historical.iloc[-window:].mean())
    std_val = float(historical.iloc[-window:].std()) if window > 1 else last_val * 0.05
    if np.isnan(std_val):
        std_val = abs(last_val) * 0.05 + 0.01

    last_ts = pd.to_datetime(historical.index[-1])
    step = timedelta(minutes=2)
    steps = horizon_minutes // 2

    times, values, lower, upper = [], [], [], []
    for i in range(1, steps + 1):
        t = last_ts + step * i
        drift = std_val * 0.03 * i          # slight natural drift
        mu = last_val + drift
        band = std_val * 0.5 * (1 + i / steps)  # widening confidence band
        times.append(t.isoformat())
        values.append(round(mu, 3))
        lower.append(round(max(0, mu - band), 3))
        upper.append(round(mu + band, 3))

    return {"times": times, "values": values, "lower": lower, "upper": upper}


# ── public API ─────────────────────────────────────────────────────────────

def get_metric_forecast(data_dir: str, component_id: str, metric: str, hours: int = 24) -> dict:
    """Return historical + anomaly windows + forecast for one component/metric."""
    _ensure_loaded(data_dir)

    comp_df = _metrics_df[_metrics_df["component_id"] == component_id].copy()
    if comp_df.empty:
        return {"error": f"No data for component '{component_id}'"}

    # Limit to the last N hours
    cutoff = comp_df["timestamp"].max() - pd.Timedelta(hours=hours)
    comp_df = comp_df[comp_df["timestamp"] >= cutoff].sort_values("timestamp")

    if metric not in comp_df.columns:
        return {"error": f"Unknown metric '{metric}'"}

    series = comp_df.set_index("timestamp")[metric].dropna()
    sampled = _downsample(series)

    # Anomaly detection on this slice
    feat_cols = [f for f in FEATURES if f in comp_df.columns]
    det_df = comp_df[["timestamp", "component_id"] + feat_cols].copy()
    if "log_error_rate_per_min" not in det_df.columns:
        det_df["log_error_rate_per_min"] = 0.0

    flagged = _detector.score_dataframe(det_df)
    comp_flagged = flagged[flagged["component_id"] == component_id] if not flagged.empty else pd.DataFrame()
    anomaly_windows = _anomaly_windows(comp_flagged)

    # Per-chart insight (rule-based, not AI so it's always fast)
    recent_mean = float(series.iloc[-30:].mean()) if len(series) >= 30 else float(series.mean())
    overall_mean = float(series.mean())
    overall_std  = float(series.std()) if len(series) > 1 else 0.0
    z = (recent_mean - overall_mean) / (overall_std + 1e-6)

    if abs(z) < 0.5:
        trend_label = "stable"
    elif z > 1.5:
        trend_label = "elevated — significantly above its historical baseline"
    elif z > 0.5:
        trend_label = "slightly elevated"
    elif z < -1.5:
        trend_label = "suppressed — well below its historical baseline"
    else:
        trend_label = "slightly below baseline"

    pct_anomalous = round(len(comp_flagged) / max(1, len(comp_df)) * 100, 1)
    chart_insight = (
        f"Over the last {hours}h, {DISPLAY_METRICS.get(metric, metric)} for **{component_id}** "
        f"is {trend_label} (mean: {recent_mean:.1f}). "
        f"{len(anomaly_windows)} anomaly window(s) detected "
        f"({pct_anomalous}% of samples flagged)."
    )

    forecast = _build_forecast(series)

    return {
        "component_id":   component_id,
        "metric":         metric,
        "metric_label":   DISPLAY_METRICS.get(metric, metric),
        "historical": {
            "times":  [t.isoformat() for t in sampled.index],
            "values": [round(float(v), 3) for v in sampled.values],
        },
        "baseline": {
            "mean": round(overall_mean, 3),
            "std":  round(overall_std,  3),
        },
        "anomaly_windows": anomaly_windows,
        "forecast":        forecast,
        "chart_insight":   chart_insight,
    }


def get_forecast_summary(data_dir: str, component_id: str) -> str:
    """Call Gemini to produce a short AI health summary for the component."""
    _ensure_loaded(data_dir)

    comp_df = _metrics_df[_metrics_df["component_id"] == component_id].copy()
    if comp_df.empty:
        return f"No historical data available for **{component_id}**."

    # Build stats for each metric
    feat_cols = [f for f in FEATURES if f in comp_df.columns]
    recent = comp_df.sort_values("timestamp").tail(60)

    stats = {}
    for feat in feat_cols:
        col = recent[feat].dropna()
        stats[feat] = {
            "current": round(float(col.iloc[-1]), 2) if len(col) else "N/A",
            "mean_1h": round(float(col.mean()), 2),
            "std_1h":  round(float(col.std()), 2) if len(col) > 1 else 0,
        }

    # Anomaly window count
    det_df = comp_df[["timestamp", "component_id"] + feat_cols].copy()
    if "log_error_rate_per_min" not in det_df.columns:
        det_df["log_error_rate_per_min"] = 0.0
    # Use last 24h only for summary anomaly count
    cutoff_24h = comp_df["timestamp"].max() - pd.Timedelta(hours=24)
    det_df_24h = det_df[det_df["timestamp"] >= cutoff_24h]
    flagged_24h = _detector.score_dataframe(det_df_24h)
    comp_flagged = flagged_24h[flagged_24h["component_id"] == component_id]
    anomaly_windows = _anomaly_windows(comp_flagged)

    # Call Gemini
    try:
        import google.generativeai as genai
        from google.genai import types

        client = genai.Client()
        prompt = f"""You are Foresight AI, an expert SRE assistant.
Analyse the following recent metrics snapshot for component **{component_id}** and produce a concise health summary (3-5 sentences).
Mention: current health status, any notable metric trends, number of anomaly windows in the last 24h, and a short forecast risk statement.
Do NOT use markdown headings. Use bullet points only if listing multiple distinct issues.

Metrics snapshot (last hour):
{json.dumps(stats, indent=2)}

Anomaly windows detected (last 24h): {len(anomaly_windows)}
Sample explanation from most recent anomaly: {comp_flagged['explanation'].iloc[-1] if not comp_flagged.empty else 'None detected'}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.4, max_output_tokens=300),
        )
        return response.text.strip()
    except Exception as e:
        # Graceful fallback
        n = len(anomaly_windows)
        return (
            f"**{component_id}** has experienced {n} anomaly window(s) in the past 24 hours. "
            f"Current CPU: {stats.get('cpu_pct', {}).get('current', 'N/A')}%, "
            f"Latency: {stats.get('latency_ms', {}).get('current', 'N/A')} ms. "
            f"{'Elevated risk detected — monitor closely.' if n > 2 else 'System appears stable based on recent telemetry.'}"
        )


def get_system_analysis(data_dir: str, hours: int = 24) -> dict:
    """
    Analyse ALL components and ask Gemini to predict which are at outage risk.

    Returns:
      {
        "summary":   <AI paragraph>,
        "risk_table": [{ component, anomaly_windows, risk_level, top_metric, trend }, ...]
        "generated_at": <iso timestamp>
      }
    """
    _ensure_loaded(data_dir)

    feat_cols = [f for f in FEATURES if f in _metrics_df.columns]
    cutoff    = _metrics_df["timestamp"].max() - pd.Timedelta(hours=hours)
    recent_df = _metrics_df[_metrics_df["timestamp"] >= cutoff].copy()

    all_components = sorted(_metrics_df["component_id"].unique().tolist())

    risk_table = []
    all_explanations = []

    for comp in all_components:
        comp_df = recent_df[recent_df["component_id"] == comp].copy()
        if comp_df.empty:
            continue

        det_df = comp_df[["timestamp", "component_id"] + feat_cols].copy()
        if "log_error_rate_per_min" not in det_df.columns:
            det_df["log_error_rate_per_min"] = 0.0

        flagged = _detector.score_dataframe(det_df)
        comp_flagged = flagged[flagged["component_id"] == comp] if not flagged.empty else pd.DataFrame()
        n_windows = len(_anomaly_windows(comp_flagged))

        # Latest metric values
        latest = comp_df.sort_values("timestamp").tail(10)
        current = {}
        for feat in feat_cols:
            col = latest[feat].dropna()
            current[feat] = round(float(col.mean()), 2) if not col.empty else 0.0

        # Compute risk score (anomaly density × key metric severity)
        risk_score = n_windows * 2
        if current.get("cpu_pct", 0) > 80:    risk_score += 3
        if current.get("error_rate", 0) > 2:   risk_score += 4
        if current.get("latency_ms", 0) > 300: risk_score += 3

        risk_level = "critical" if risk_score >= 8 else "warning" if risk_score >= 3 else "healthy"

        # Top offending metric
        top_metric = max(feat_cols, key=lambda f: abs(
            current.get(f, 0) - float(_metrics_df[_metrics_df["component_id"] == comp][f].mean())
        ) if f in _metrics_df.columns else 0)

        row = {
            "component":       comp,
            "anomaly_windows": n_windows,
            "risk_level":      risk_level,
            "risk_score":      risk_score,
            "top_metric":      top_metric,
            "current_metrics": current,
        }
        risk_table.append(row)

        if n_windows > 0 and not comp_flagged.empty:
            all_explanations.append(f"- {comp}: {n_windows} window(s), latest: {comp_flagged['explanation'].iloc[-1]}")

    risk_table.sort(key=lambda r: r["risk_score"], reverse=True)
    at_risk     = [r for r in risk_table if r["risk_level"] != "healthy"]
    critical    = [r for r in risk_table if r["risk_level"] == "critical"]
    warning     = [r for r in risk_table if r["risk_level"] == "warning"]

    # ── Gemini call ──────────────────────────────────────────────────────
    try:
        import google.generativeai as genai
        from google.genai import types

        client = genai.Client()

        top_risk_str = "\n".join([
            f"  {r['component']}: risk={r['risk_level']}, anomaly_windows={r['anomaly_windows']}, "
            f"cpu={r['current_metrics'].get('cpu_pct','?')}%, "
            f"error_rate={r['current_metrics'].get('error_rate','?')}%, "
            f"latency={r['current_metrics'].get('latency_ms','?')}ms"
            for r in risk_table[:8]
        ])

        anomaly_str = "\n".join(all_explanations[:10]) if all_explanations else "No anomalies detected."

        prompt = f"""You are Foresight AI, a proactive SRE assistant.
Below is a real-time health snapshot of a microservices platform covering the last {hours} hours.
Produce a concise SYSTEM-WIDE analysis (4-6 sentences):
  1. Start with the overall system health verdict (healthy / degraded / at risk).
  2. Name the 2-3 highest-risk components and explain WHY they are risky (cite metric names and values).
  3. Predict which component is MOST LIKELY to experience an outage next, and in what approximate timeframe.
  4. Give one short mitigation recommendation.

Rules: Do NOT use markdown headings. Bold component names with **name**. Be specific with numbers.

Top components by risk score:
{top_risk_str}

Recent anomaly explanations:
{anomaly_str}

Summary: {len(critical)} critical, {len(warning)} warning, {len(all_components) - len(at_risk)} healthy out of {len(all_components)} components.
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.45, max_output_tokens=380),
        )
        summary = response.text.strip()
    except Exception:
        names = ", ".join(f"**{r['component']}**" for r in critical[:3]) or "none"
        summary = (
            f"System-wide analysis covering {len(all_components)} components over the last {hours}h. "
            f"{len(critical)} component(s) are in a critical state: {names}. "
            f"{len(warning)} component(s) show warning-level anomalies. "
            f"{'Immediate investigation recommended for critical components.' if critical else 'No critical outage risk detected at this time.'}"
        )

    import datetime
    return {
        "summary":      summary,
        "risk_table":   risk_table,
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "stats": {
            "total_components": len(all_components),
            "critical": len(critical),
            "warning":  len(warning),
            "healthy":  len(all_components) - len(at_risk),
        }
    }

