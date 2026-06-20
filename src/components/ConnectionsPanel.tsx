import { useMemo, useState } from 'react';
import type { ConnectorAuthType, ConnectorConfig, ConnectorControlMode } from '../types';
import {
  CONNECTOR_DEFINITIONS,
  CONNECTOR_DEFINITION_MAP,
  credentialFieldFor,
  routeConnectorCapabilities,
} from '../lib/connectorAgent';
import type { ConnectorActions } from '../hooks/useConnectors';

interface Props {
  connectors: ConnectorConfig[];
  actions: ConnectorActions;
  locked: boolean;
}

const STATUS_LABEL: Record<ConnectorConfig['status'], string> = {
  draft: 'Needs setup', checking: 'Checking', ready: 'Config ready', degraded: 'Needs approval', blocked: 'Blocked', paused: 'Paused',
};

function credentialValue(connector: ConnectorConfig): string {
  const field = credentialFieldFor(connector.authType);
  return field ? connector.credentials[field] ?? '' : '';
}

export function ConnectionsPanel({ connectors, actions, locked }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [definitionId, setDefinitionId] = useState(CONNECTOR_DEFINITIONS[0].id);
  const [routeInput, setRouteInput] = useState('repo-read, api-read, inference');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const routePlan = useMemo(() => routeConnectorCapabilities(
    connectors,
    routeInput.split(',').map(item => item.trim()),
  ), [connectors, routeInput]);
  const readyCount = connectors.filter(item => item.enabled && item.approved && item.status === 'ready').length;

  const updateAuth = (connector: ConnectorConfig, authType: ConnectorAuthType) => {
    actions.update(connector.id, { authType, credentials: {}, approved: false, status: 'draft' });
  };

  return (
    <section className="connections-panel">
      <button className="connections-header" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
        <span>
          <span className="section-title">Connector Agent</span>
          <span className="connections-sub">{readyCount}/{connectors.length} approved and routable · secrets memory-only</span>
        </span>
        <span className="btn btn-ghost">{expanded ? 'Hide' : 'Manage'}</span>
      </button>

      {expanded && (
        <div className="connections-body">
          <div className="connector-agent-banner">
            <strong>Governed connection control plane</strong>
            <span>Validates endpoints, scopes, credentials, approvals, and routes. Production execution goes through a server-side broker—never directly from this browser.</span>
          </div>

          {!locked && (
            <div className="connector-add-row">
              <select className="input" value={definitionId} onChange={event => setDefinitionId(event.target.value)}>
                {CONNECTOR_DEFINITIONS.map(definition => (
                  <option key={definition.id} value={definition.id}>{definition.name} · {definition.kind}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={() => actions.add(definitionId)}>Add connection</button>
            </div>
          )}

          <div className="connector-list">
            {connectors.length === 0 && <div className="worker-empty">No external connections configured.</div>}
            {connectors.map(connector => {
              const definition = CONNECTOR_DEFINITION_MAP.get(connector.definitionId);
              const secretField = credentialFieldFor(connector.authType);
              return (
                <article className={`connector-card ${connector.status}`} key={connector.id}>
                  <div className="connector-card-header">
                    <div>
                      <input
                        className="connector-name-input"
                        value={connector.name}
                        disabled={locked}
                        onChange={event => actions.update(connector.id, { name: event.target.value, approved: false, status: 'draft' })}
                        aria-label="Connection name"
                      />
                      <div className="connector-meta">{definition?.kind ?? 'unknown'} · {definition?.description}</div>
                    </div>
                    <span className={`connector-status ${connector.status}`}>{STATUS_LABEL[connector.status]}</span>
                  </div>

                  <div className="connector-grid">
                    <label>
                      <span>Broker / API endpoint</span>
                      <input
                        className="input"
                        placeholder={definition?.endpointPlaceholder}
                        value={connector.endpoint}
                        disabled={locked}
                        onChange={event => actions.update(connector.id, { endpoint: event.target.value, approved: false, status: 'draft' })}
                      />
                    </label>
                    <label>
                      <span>Authentication</span>
                      <select className="input" value={connector.authType} disabled={locked} onChange={event => updateAuth(connector, event.target.value as ConnectorAuthType)}>
                        {(definition?.authTypes ?? ['none']).map(auth => <option value={auth} key={auth}>{auth.replace('_', ' ')}</option>)}
                      </select>
                    </label>
                    {secretField && (
                      <label>
                        <span>Session credential</span>
                        <div className="connector-secret-row">
                          <input
                            className="input"
                            type={showSecrets[connector.id] ? 'text' : 'password'}
                            value={credentialValue(connector)}
                            disabled={locked}
                            autoComplete="off"
                            onChange={event => actions.update(connector.id, {
                              credentials: { ...connector.credentials, [secretField]: event.target.value.slice(0, 4096) },
                              approved: false,
                              status: 'draft',
                            })}
                          />
                          <button className="btn btn-ghost" onClick={() => setShowSecrets(value => ({ ...value, [connector.id]: !value[connector.id] }))}>
                            {showSecrets[connector.id] ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </label>
                    )}
                    {connector.authType === 'basic' && (
                      <>
                        <label><span>Username</span><input className="input" value={connector.credentials.username ?? ''} onChange={event => actions.update(connector.id, { credentials: { ...connector.credentials, username: event.target.value.slice(0, 256) }, approved: false, status: 'draft' })} /></label>
                        <label><span>Password</span><input className="input" type="password" autoComplete="off" value={connector.credentials.password ?? ''} onChange={event => actions.update(connector.id, { credentials: { ...connector.credentials, password: event.target.value.slice(0, 4096) }, approved: false, status: 'draft' })} /></label>
                      </>
                    )}
                    <label>
                      <span>Least-privilege scopes (comma separated)</span>
                      <input className="input" value={connector.scopes.join(', ')} disabled={locked} onChange={event => actions.update(connector.id, { scopes: event.target.value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 50), approved: false, status: 'draft' })} />
                    </label>
                    <label>
                      <span>Operator control</span>
                      <select className="input" value={connector.controlMode} onChange={event => actions.setControlMode(connector.id, event.target.value as ConnectorControlMode)}>
                        <option value="supervised">Supervised · approve actions</option>
                        <option value="autonomous">Autonomous · approved policy</option>
                        <option value="manual">Manual · operator executes</option>
                      </select>
                    </label>
                  </div>

                  <label className="connector-steering">
                    <span>Steering notes</span>
                    <textarea className="input" placeholder="Constraints, routing preference, or debugging context" value={connector.steeringNotes} onChange={event => actions.steer(connector.id, event.target.value)} />
                  </label>

                  {connector.diagnostics.length > 0 && (
                    <div className="connector-diagnostics">
                      {connector.diagnostics.map((item, index) => <div key={index}>✓ {item}</div>)}
                    </div>
                  )}
                  {connector.issues.map(issue => (
                    <details className={`connector-issue ${issue.severity}`} open={issue.severity === 'error'} key={issue.code}>
                      <summary>{issue.title}</summary>
                      <p>{issue.detail}</p>
                      <ol>{issue.remediation.map((step, index) => <li key={index}>{step}</li>)}</ol>
                    </details>
                  ))}

                  <div className="connector-actions">
                    <button className="btn btn-primary" disabled={locked || connector.status === 'checking'} onClick={() => actions.diagnose(connector.id)}>Diagnose</button>
                    <button className="btn btn-ghost" disabled={locked || connector.approved || connector.issues.some(issue => issue.severity === 'error')} onClick={() => actions.approve(connector.id)}>Approve</button>
                    {connector.status === 'paused'
                      ? <button className="btn btn-ghost" onClick={() => actions.resume(connector.id)}>Resume</button>
                      : <button className="btn btn-ghost" onClick={() => actions.pause(connector.id)}>Pause</button>}
                    <button className="btn btn-danger" onClick={() => actions.takeOver(connector.id)}>Take over</button>
                    {!locked && <button className="btn btn-ghost connector-remove" onClick={() => actions.remove(connector.id)}>Remove</button>}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="connector-router">
            <div className="label">Routing preview</div>
            <input className="input" value={routeInput} onChange={event => setRouteInput(event.target.value)} aria-label="Requested capabilities" />
            <div className="routing-results">
              {routePlan.routes.map(route => <span key={route.capability}>{route.capability} → {route.connectorName}{route.requiresApproval ? ' · approval' : ''}</span>)}
              {routePlan.unresolvedCapabilities.map(capability => <span className="unresolved" key={capability}>{capability} → unresolved</span>)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
