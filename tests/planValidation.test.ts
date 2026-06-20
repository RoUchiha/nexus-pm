import { describe, expect, it } from 'vitest';
import { validateManagerPlan } from '../src/lib/planValidation';

function validPlan() {
  return {
    spec: {
      outcomes: ['Deliver a verified result'],
      verificationCriteria: [
        { id: 'VC-001', description: 'When work completes, the result shall be verified.' },
        { id: 'VC-002', description: 'The system shall preserve the approved scope.' },
      ],
    },
    pods: [
      { id: 'research', name: 'Research', deliverable: 'Evidence', dependencies: [] as string[], vcIds: ['VC-001'] },
      { id: 'review', name: 'Review', deliverable: 'Decision', dependencies: ['research'], vcIds: ['VC-002'] },
    ],
  };
}

describe('model-generated execution plan validation', () => {
  it('accepts a valid DAG with complete VC ownership', () => {
    expect(() => validateManagerPlan(validPlan())).not.toThrow();
  });

  it('rejects circular dependencies', () => {
    const plan = validPlan();
    plan.pods[0].dependencies = ['review'];
    expect(() => validateManagerPlan(plan)).toThrow(/Circular/);
  });

  it('rejects unknown dependencies', () => {
    const plan = validPlan();
    plan.pods[1].dependencies = ['attacker_controlled'];
    expect(() => validateManagerPlan(plan)).toThrow(/unknown dependency/);
  });

  it('rejects duplicate pod ids', () => {
    const plan = validPlan();
    plan.pods[1].id = 'research';
    expect(() => validateManagerPlan(plan)).toThrow(/unique/);
  });

  it('rejects unsafe identifiers and unassigned criteria', () => {
    const unsafe = validPlan();
    unsafe.pods[0].id = '../../admin';
    expect(() => validateManagerPlan(unsafe)).toThrow(/Invalid pod id/);

    const unassigned = validPlan();
    unassigned.pods[1].vcIds = [];
    expect(() => validateManagerPlan(unassigned)).toThrow(/assigned to a pod/);
  });
});
