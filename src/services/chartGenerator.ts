import { getConfig } from "../config.js";

interface RadarChartData {
  labels: string[];
  values: number[];
}

export function generateRadarChartUrl(data: RadarChartData): string {
  const chartConfig = {
    type: "radar",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Score",
          data: data.values,
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgb(54, 162, 235)",
          pointBackgroundColor: "rgb(54, 162, 235)",
        },
      ],
    },
    options: {
      scales: {
        r: {
          beginAtZero: true,
          max: 5,
          ticks: { stepSize: 1 },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `${getConfig().quickchartBaseUrl}/chart?c=${encoded}&w=400&h=400`;
}

export function buildMeetingChartUrl(scores: {
  goal_clarity: number;
  agenda_structure: number;
  time_efficiency: number;
  participation_balance: number;
  decision_quality: number;
  action_item_clarity: number;
}): string {
  return generateRadarChartUrl({
    labels: [
      "Goal Clarity",
      "Agenda Structure",
      "Time Efficiency",
      "Participation Balance",
      "Decision Quality",
      "Action Item Clarity",
    ],
    values: [
      scores.goal_clarity,
      scores.agenda_structure,
      scores.time_efficiency,
      scores.participation_balance,
      scores.decision_quality,
      scores.action_item_clarity,
    ],
  });
}

export function buildIndividualChartUrl(scores: {
  issue_comprehension: number;
  value_density: number;
  structured_thinking: number;
  collaborative_influence: number;
  decision_drive: number;
  execution_linkage: number;
}): string {
  return generateRadarChartUrl({
    labels: [
      "Issue Comprehension",
      "Value Density",
      "Structured Thinking",
      "Collaborative Influence",
      "Decision Drive",
      "Execution Linkage",
    ],
    values: [
      scores.issue_comprehension,
      scores.value_density,
      scores.structured_thinking,
      scores.collaborative_influence,
      scores.decision_drive,
      scores.execution_linkage,
    ],
  });
}
