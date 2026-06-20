import { useCallback, useState } from 'react';
import type { ConnectorConfig, ConnectorControlMode } from '../types';
import { createConnector, diagnoseConnector } from '../lib/connectorAgent';
import { loadConnectors, saveConnectors } from '../lib/storage';
import { clampText } from '../lib/security';

export interface ConnectorActions {
  add: (definitionId: string) => void;
  update: (id: string, patch: Partial<ConnectorConfig>) => void;
  remove: (id: string) => void;
  diagnose: (id: string) => void;
  approve: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  setControlMode: (id: string, mode: ConnectorControlMode) => void;
  steer: (id: string, notes: string) => void;
  takeOver: (id: string) => void;
}

export function useConnectors(): [ConnectorConfig[], ConnectorActions] {
  const [connectors, setConnectorsState] = useState<ConnectorConfig[]>(loadConnectors);

  const commit = useCallback((updater: (current: ConnectorConfig[]) => ConnectorConfig[]) => {
    setConnectorsState(current => {
      const next = updater(current);
      saveConnectors(next);
      return next;
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<ConnectorConfig>) => {
    commit(current => current.map(item => item.id === id ? {
      ...item,
      ...patch,
      name: patch.name === undefined ? item.name : clampText(patch.name, 100),
      endpoint: patch.endpoint === undefined ? item.endpoint : patch.endpoint.slice(0, 2048),
      steeringNotes: patch.steeringNotes === undefined ? item.steeringNotes : clampText(patch.steeringNotes, 1000),
      updatedAt: Date.now(),
    } : item));
  }, [commit]);

  const diagnose = useCallback((id: string) => {
    commit(current => current.map(item => item.id === id
      ? { ...item, status: 'checking', issues: [], diagnostics: [], updatedAt: Date.now() }
      : item));
    queueMicrotask(() => {
      commit(current => current.map(item => item.id === id
        ? { ...item, ...diagnoseConnector(item), updatedAt: Date.now() }
        : item));
    });
  }, [commit]);

  const actions: ConnectorActions = {
    add: definitionId => commit(current => current.length >= 100 ? current : [...current, createConnector(definitionId)]),
    update,
    remove: id => commit(current => current.filter(item => item.id !== id)),
    diagnose,
    approve: id => {
      commit(current => current.map(item => item.id === id ? { ...item, approved: true, updatedAt: Date.now() } : item));
      queueMicrotask(() => diagnose(id));
    },
    pause: id => update(id, { enabled: false, status: 'paused' }),
    resume: id => {
      update(id, { enabled: true, status: 'draft' });
      queueMicrotask(() => diagnose(id));
    },
    setControlMode: (id, controlMode) => update(id, { controlMode }),
    steer: (id, steeringNotes) => update(id, { steeringNotes }),
    takeOver: id => update(id, { controlMode: 'manual', enabled: false, status: 'paused' }),
  };

  return [connectors, actions];
}
