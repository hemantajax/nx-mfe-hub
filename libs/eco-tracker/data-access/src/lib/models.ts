export interface GeoCoords {
  readonly lat: number;
  readonly lng: number;
}

export interface Tree {
  readonly id: string;
  readonly speciesId: string;
  readonly datePlanted: string;
  readonly ageAtPlantingMonths?: number;
  readonly location: string;
  readonly coords?: GeoCoords;
  readonly notes?: string;
  readonly photoId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type TreeEventType = 'planted' | 'watered' | 'measured' | 'pruned' | 'health-check' | 'note';
export type HealthStatus = 'healthy' | 'fair' | 'poor';

export interface TreeEvent {
  readonly id: string;
  readonly treeId: string;
  readonly type: TreeEventType;
  readonly date: string;
  readonly notes?: string;
  readonly heightCm?: number;
  readonly healthStatus?: HealthStatus;
  readonly createdAt: string;
}

export type GrowthRate = 'slow' | 'medium' | 'fast';
export type TreeCategory = 'deciduous' | 'evergreen' | 'fruit' | 'palm' | 'flowering';

export interface TreeSpecies {
  readonly id: string;
  readonly commonName: string;
  readonly scientificName: string;
  readonly co2PerYear: number;
  readonly co2YoungMultiplier: number;
  readonly growthRate: GrowthRate;
  readonly maxHeightM: number;
  readonly lifespanYears: number;
  readonly nativeRegion: string;
  readonly careTips: string;
  readonly category: TreeCategory;
  readonly icon: string;
}

export type ActivityCategory = 'transport' | 'food' | 'energy' | 'shopping';

export interface Activity {
  readonly id: string;
  readonly category: ActivityCategory;
  readonly type: string;
  readonly value: number;
  readonly unit: string;
  readonly co2e: number;
  readonly date: string;
  readonly notes?: string;
  readonly createdAt: string;
}

export interface EmissionFactor {
  readonly category: ActivityCategory;
  readonly type: string;
  readonly label: string;
  readonly unit: string;
  readonly co2ePerUnit: number;
  readonly icon: string;
}

export type GoalType = 'emission-limit' | 'trees-planted' | 'offset-target';

export interface Goal {
  readonly id: string;
  readonly month: string;
  readonly targetCo2e: number;
  readonly type: GoalType;
  readonly createdAt: string;
}

export interface Achievement {
  readonly id: string;
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly unlockedAt?: string;
  readonly threshold: number;
}

export interface MapMarker {
  readonly id: string;
  readonly coords: GeoCoords;
  readonly label?: string;
  readonly icon?: string;
}
