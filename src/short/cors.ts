import { addCors, CorsFeature } from '../app';

export function cors(): CorsFeature {
  return addCors();
}
