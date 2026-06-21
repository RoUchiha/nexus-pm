import { describe, expect, it } from 'vitest';
import {
  connectorPromptSummary,
  createConnector,
  diagnoseConnector,
  redactConnector,
  routeConnectorCapabilities,
} from '../src/lib/connectorAgent';

function readyGitHub() {
  return {
    ...createConnector('github', 'Engineering GitHub'),
    endpoint: 'https://api.github.com',
    authType: 'bearer' as const,
    credentials: { token: 'dummy-secret-that-must-not-leak' },
    scopes: ['repo:read'],
    approved: true,
  };
}

describe('connector specialist', () => {
  it('diagnoses a complete connector without exposing its secret', () => {
    const connector = readyGitHub();
    const result = diagnoseConnector(connector);
    expect(result.status).toBe('ready');
    expect(JSON.stringify(result)).not.toContain(connector.credentials.token);
  });

  it('blocks missing credentials and operator approval', () => {
    const connector = { ...readyGitHub(), credentials: {}, approved: false };
    const result = diagnoseConnector(connector);
    expect(result.status).toBe('blocked');
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['CREDENTIAL_MISSING', 'APPROVAL_REQUIRED']),
    );
  });

  it('strips credentials before persistence', () => {
    expect(redactConnector(readyGitHub()).credentials).toEqual({});
  });

  it('routes only approved, healthy capabilities', () => {
    const connector = { ...readyGitHub(), status: 'ready' as const };
    const plan = routeConnectorCapabilities([connector], ['repo-read', 'api-write']);
    expect(plan.routes).toHaveLength(1);
    expect(plan.routes[0]).toMatchObject({
      connectorName: 'Engineering GitHub',
      requiresApproval: true,
    });
    expect(plan.unresolvedCapabilities).toEqual(['api-write']);
  });

  it('passes metadata to prompts without credentials or endpoints', () => {
    const connector = { ...readyGitHub(), status: 'ready' as const };
    const summary = connectorPromptSummary([connector]);
    expect(summary).toContain('repo-read');
    expect(summary).not.toContain('dummy-secret');
    expect(summary).not.toContain('api.github.com');
  });
});
