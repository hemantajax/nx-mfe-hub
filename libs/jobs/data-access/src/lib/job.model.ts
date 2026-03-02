export type JobPlatform = 'naukri' | 'linkedin' | 'indeed';
export type JobType = 'full-time' | 'part-time' | 'contract' | 'remote' | 'internship';
export type ExperienceLevel = 'fresher' | 'junior' | 'mid' | 'senior' | 'lead';

export interface Job {
  readonly id: string;
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly salary: string;
  readonly platform: JobPlatform;
  readonly url: string;
  readonly postedAt: Date;
  readonly type: JobType;
  readonly experience: ExperienceLevel;
  readonly skills: string[];
  readonly description: string;
}

export interface JobSearchQuery {
  keyword: string;
  location: string;
  platforms: JobPlatform[];
  types: JobType[];
  experienceLevels: ExperienceLevel[];
}

export const DEFAULT_QUERY: JobSearchQuery = {
  keyword: '',
  location: '',
  platforms: [],
  types: [],
  experienceLevels: [],
};
