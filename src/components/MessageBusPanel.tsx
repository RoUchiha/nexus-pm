import { useEffect, useRef } from 'react';
import type { BusMessage } from '../types';
import { BUS_TYPE_META } from '../lib/constants';

interface Props { messages: BusMessage[]; }

export function MessageBusPanel({ messages }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="bus-section">
        <div className="bus-header">
          <span className="section-title">Message Bus</span>
          <span style={{ fontSize: 11, color: 'var(--dim)' }}>0 messages</span>
        </div>
        <div className="empty-state">No inter-agent messages yet</div>
      </div>
    );
  }

  return (
    <div className="bus-section">
      <div className="bus-header">
        <span className="section-title">Message Bus</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="bus-list" ref={listRef}>
        {messages.map(msg => {
          const meta = BUS_TYPE_META[msg.type];
          return (
            <div
              key={msg.id}
              className="bus-message"
              style={{ borderColor: `${meta.color}22` }}
            >
              <span className="bus-icon">{meta.icon}</span>
              <span className="bus-from">{msg.from}</span>
              {msg.to !== 'ALL' && (
                <>
                  <span className="bus-arrow">→</span>
                  <span className="bus-to">{msg.to}</span>
                </>
              )}
              {msg.to === 'ALL' && (
                <span className="bus-to" style={{ color: 'var(--dim)' }}>→ ALL</span>
              )}
              <span className="bus-content" style={{ color: meta.color }}>
                {msg.content}
              </span>
              <span className="bus-time">{formatTime(msg.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
}
