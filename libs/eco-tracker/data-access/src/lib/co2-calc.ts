import type { Tree, TreeSpecies, Activity, EmissionFactor } from './models';

export function calcTreeAgeYears(datePlanted: string, ageAtPlantingMonths = 0): number {
  const planted = new Date(datePlanted).getTime();
  const timeSincePlanted = Math.max(0, (Date.now() - planted) / (1000 * 60 * 60 * 24 * 365.25));
  return timeSincePlanted + ageAtPlantingMonths / 12;
}

function cumulativeCo2(ageYears: number, species: TreeSpecies): number {
  const youngPhase = Math.min(ageYears, 5);
  const maturePhase = Math.max(0, ageYears - 5);
  return youngPhase * species.co2PerYear * species.co2YoungMultiplier
       + maturePhase * species.co2PerYear;
}

export function calcTreeCo2Offset(tree: Tree, species: TreeSpecies): number {
  const timeSincePlanted = Math.max(
    0,
    (Date.now() - new Date(tree.datePlanted).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
  if (timeSincePlanted <= 0) return 0;

  const priorAge = (tree.ageAtPlantingMonths ?? 0) / 12;
  const totalAge = timeSincePlanted + priorAge;

  const offset = cumulativeCo2(totalAge, species) - cumulativeCo2(priorAge, species);
  return Math.round(offset * 10) / 10;
}

export function calcActivityCo2e(value: number, factor: EmissionFactor): number {
  return Math.round(value * factor.co2ePerUnit * 100) / 100;
}

export function calcNetImpact(totalOffset: number, totalEmissions: number): number {
  return Math.round((totalOffset - totalEmissions) * 10) / 10;
}

export function formatCo2(kg: number): string {
  if (Math.abs(kg) >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${Math.abs(kg).toFixed(1)} kg`;
}

export function getMonthKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthKey(d));
  }
  return months;
}

export function getMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

export function calcLoggingStreak(activities: Array<{ date: string }>): number {
  if (!activities.length) return 0;
  const dates = [...new Set(activities.map((a) => a.date.slice(0, 10)))].sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let expected = today;
  for (const date of dates) {
    if (date === expected) {
      streak++;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().slice(0, 10);
    } else if (date < expected) {
      break;
    }
  }
  return streak;
}
