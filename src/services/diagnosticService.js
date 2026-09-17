// Centralizes data access: presentation layer never decides which implementation to call.
import { ATLAS_MODE_API, atlasConfig } from '../config/atlasConfig';
import * as atlasApi from './atlasApi';
import * as demoApi from './demoApi';

const impl = atlasConfig.mode === ATLAS_MODE_API ? atlasApi : demoApi;

export const createDiagnosticSession = impl.createDiagnosticSession;
export const generateAnalysis = impl.generateAnalysis;
export const getLatestAnalysis = impl.getLatestAnalysis;
