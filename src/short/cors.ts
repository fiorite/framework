import { featureCors, CorsFeature } from '../app';

export function cors(): CorsFeature {
  return featureCors();
}
