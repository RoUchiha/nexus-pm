import type {
  ConnectorAuthType,
  ConnectorConfig,
  ConnectorDefinition,
  ConnectorIssue,
  ConnectorRoutingPlan,
} from '../types';
import { clampText, generateSessionId, normalizeExternalEndpoint } from './security';

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    id: 'openai-compatible', name: 'OpenAI-compatible LLM', kind: 'llm',
    description: 'Route model inference through an enterprise AI gateway or compatible API.',
    authTypes: ['api_key', 'bearer', 'oauth2'], capabilities: ['inference', 'embeddings', 'reranking'],
    serverSideOnly: true, endpointPlaceholder: 'https://ai-gateway.company.com/v1',
  },
  {
    id: 'postgresql', name: 'PostgreSQL', kind: 'database',
    description: 'Read and write approved relational data through a server-side broker.',
    authTypes: ['connection_string', 'oauth2'], capabilities: ['sql-read', 'sql-write', 'schema-discovery'],
    serverSideOnly: true, endpointPlaceholder: 'https://data-broker.company.com/postgres',
  },
  {
    id: 'mongodb', name: 'MongoDB', kind: 'database',
    description: 'Access approved document collections through a server-side broker.',
    authTypes: ['connection_string', 'oauth2'], capabilities: ['document-read', 'document-write', 'schema-discovery'],
    serverSideOnly: true, endpointPlaceholder: 'https://data-broker.company.com/mongodb',
  },
  {
    id: 'github', name: 'GitHub', kind: 'repository',
    description: 'Inspect repositories, issues, pull requests, checks, and approved write operations.',
    authTypes: ['bearer', 'oauth2'], capabilities: ['repo-read', 'repo-write', 'pull-requests', 'issues', 'ci-status'],
    serverSideOnly: true, endpointPlaceholder: 'https://api.github.com', requiredScopes: ['repo:read'],
  },
  {
    id: 'gitlab', name: 'GitLab', kind: 'repository',
    description: 'Inspect projects, merge requests, issues, and pipelines.',
    authTypes: ['bearer', 'oauth2'], capabilities: ['repo-read', 'repo-write', 'pull-requests', 'issues', 'ci-status'],
    serverSideOnly: true, endpointPlaceholder: 'https://gitlab.com/api/v4', requiredScopes: ['read_api'],
  },
  {
    id: 'mcp-agent', name: 'MCP / Agent Endpoint', kind: 'agent',
    description: 'Connect a remote tool or agent through a governed MCP-compatible gateway.',
    authTypes: ['bearer', 'oauth2'], capabilities: ['agent-delegation', 'tool-discovery', 'tool-execution'],
    serverSideOnly: true, endpointPlaceholder: 'https://agent-gateway.company.com/mcp',
  },
  {
    id: 'rest-api', name: 'REST API', kind: 'api',
    description: 'Call an approved HTTPS API through the enterprise connector broker.',
    authTypes: ['none', 'api_key', 'bearer', 'oauth2', 'basic'], capabilities: ['api-read', 'api-write'],
    serverSideOnly: true, endpointPlaceholder: 'https://api.company.com/v1',
  },
];

export const CONNECTOR_DEFINITION_MAP = new Map(CONNECTOR_DEFINITIONS.map(item => [item.id, item]));

function hasCredential(config: ConnectorConfig): boolean {
  switch (config.authType) {
    case 'none': return true;
    case 'api_key': return Boolean(config.credentials.apiKey?.trim());
    case 'bearer': return Boolean(config.credentials.token?.trim());
    case 'oauth2': return Boolean(config.credentials.token?.trim());
    case 'basic': return Boolean(config.credentials.username?.trim() && config.credentials.password?.trim());
    case 'connection_string': return Boolean(config.credentials.connectionString?.trim());
  }
}

export function createConnector(definitionId: string, name?: string): ConnectorConfig {
  const definition = CONNECTOR_DEFINITION_MAP.get(definitionId);
  if (!definition) throw new Error('Unknown connector definition.');
  const now = Date.now();
  return {
    id: `connector_${generateSessionId()}`,
    definitionId,
    name: clampText(name || definition.name, 100),
    endpoint: '',
    authType: definition.authTypes[0] ?? 'none',
    credentials: {},
    scopes: [...(definition.requiredScopes ?? [])],
    enabled: true,
    approved: false,
    controlMode: 'supervised',
    status: 'draft',
    issues: [],
    diagnostics: [],
    steeringNotes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function diagnoseConnector(config: ConnectorConfig): Pick<ConnectorConfig, 'status' | 'issues' | 'diagnostics' | 'lastCheckAt'> {
  const definition = CONNECTOR_DEFINITION_MAP.get(config.definitionId);
  const issues: ConnectorIssue[] = [];
  const diagnostics: string[] = [];

  if (!definition) {
    issues.push({
      code: 'UNKNOWN_DEFINITION', severity: 'error', title: 'Connector type is unavailable',
      detail: 'The saved connector references a definition that is not installed.',
      remediation: ['Choose an installed connector type.', 'Ask an administrator to install the required connector package.'],
      retriable: false,
    });
  } else {
    diagnostics.push(`Definition loaded: ${definition.name}`);
    try {
      normalizeExternalEndpoint(config.endpoint);
      diagnostics.push('Endpoint policy passed: HTTPS, public host, no embedded credentials.');
    } catch (error) {
      issues.push({
        code: 'ENDPOINT_POLICY', severity: 'error', title: 'Endpoint rejected by security policy',
        detail: (error as Error).message,
        remediation: ['Use a public HTTPS broker endpoint.', 'Remove URL credentials, fragments, and private or loopback hosts.'],
        retriable: true,
      });
    }

    if (!definition.authTypes.includes(config.authType)) {
      issues.push({
        code: 'AUTH_UNSUPPORTED', severity: 'error', title: 'Authentication method is not supported',
        detail: `${definition.name} does not accept ${config.authType}.`,
        remediation: [`Choose one of: ${definition.authTypes.join(', ')}.`], retriable: true,
      });
    } else if (!hasCredential(config)) {
      issues.push({
        code: 'CREDENTIAL_MISSING', severity: 'error', title: 'Credential is missing',
        detail: 'The selected authentication method requires a memory-only credential for this browser session.',
        remediation: ['Enter the credential again.', 'For production, configure the secret in the server-side vault and issue a short-lived session grant.'],
        retriable: true,
      });
    } else {
      diagnostics.push('Credential shape present; secret value was not logged or persisted.');
    }

    const missingScopes = (definition.requiredScopes ?? []).filter(scope => !config.scopes.includes(scope));
    if (missingScopes.length > 0) {
      issues.push({
        code: 'SCOPE_MISSING', severity: 'warning', title: 'Required scopes are missing',
        detail: `Missing scopes: ${missingScopes.join(', ')}.`,
        remediation: ['Grant only the listed minimum scopes.', 'Re-run diagnostics after updating authorization.'],
        retriable: true,
      });
    }

    if (!config.approved) {
      issues.push({
        code: 'APPROVAL_REQUIRED', severity: 'warning', title: 'Operator approval required',
        detail: 'NEXUS will not route work to this connector until a human approves it.',
        remediation: ['Review the endpoint, scopes, and control mode.', 'Approve the connector when the configuration is correct.'],
        retriable: true,
      });
    }

    if (definition.serverSideOnly) {
      diagnostics.push('Production execution requires the server-side connector broker; direct browser data access is intentionally disabled.');
    }
  }

  const hasError = issues.some(issue => issue.severity === 'error');
  const hasWarning = issues.some(issue => issue.severity === 'warning');
  return {
    status: hasError ? 'blocked' : hasWarning ? 'degraded' : 'ready',
    issues,
    diagnostics,
    lastCheckAt: Date.now(),
  };
}

export function redactConnector(config: ConnectorConfig): ConnectorConfig {
  return { ...config, credentials: {} };
}

export function connectorPromptSummary(connectors: ConnectorConfig[]): string {
  return connectors
    .filter(item => item.enabled && item.approved && item.status === 'ready')
    .map(item => {
      const definition = CONNECTOR_DEFINITION_MAP.get(item.definitionId);
      return `- ${item.name} [${definition?.kind ?? 'unknown'}]: ${(definition?.capabilities ?? []).join(', ')}; mode=${item.controlMode}`;
    })
    .join('\n');
}

export function routeConnectorCapabilities(connectors: ConnectorConfig[], requested: string[]): ConnectorRoutingPlan {
  const routes = [];
  const unresolvedCapabilities: string[] = [];
  for (const capability of [...new Set(requested.map(item => item.trim()).filter(Boolean))]) {
    const connector = connectors.find(item => {
      const definition = CONNECTOR_DEFINITION_MAP.get(item.definitionId);
      return item.enabled && item.approved && item.status === 'ready' && definition?.capabilities.includes(capability);
    });
    if (!connector) {
      unresolvedCapabilities.push(capability);
      continue;
    }
    routes.push({
      capability,
      connectorId: connector.id,
      connectorName: connector.name,
      reason: `Approved ${CONNECTOR_DEFINITION_MAP.get(connector.definitionId)?.kind ?? 'connector'} advertises ${capability}.`,
      requiresApproval: connector.controlMode !== 'autonomous',
    });
  }
  return { routes, unresolvedCapabilities, generatedAt: Date.now() };
}

export function credentialFieldFor(authType: ConnectorAuthType): keyof ConnectorConfig['credentials'] | null {
  if (authType === 'api_key') return 'apiKey';
  if (authType === 'bearer' || authType === 'oauth2') return 'token';
  if (authType === 'connection_string') return 'connectionString';
  return null;
}
