const POD_ID = /^[a-z][a-z0-9_]{0,63}$/;
const VC_ID = /^VC-\d{1,4}$/;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new Error(`${label} must contain between ${min} and ${max} items.`);
  }
  return value;
}

function safeString(value: unknown, label: string, max = 20_000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${label} must be a non-empty string under ${max} characters.`);
  }
  return value;
}

export function validateManagerPlan(raw: unknown): void {
  const root = record(raw, 'Manager response');
  const spec = record(root.spec, 'Manager spec');
  array(spec.outcomes, 'Spec outcomes', 1, 20).forEach((item, index) => safeString(item, `Outcome ${index + 1}`));

  const criteria = array(spec.verificationCriteria, 'Verification criteria', 1, 50).map((item, index) => {
    const criterion = record(item, `Verification criterion ${index + 1}`);
    const id = safeString(criterion.id, `Verification criterion ${index + 1} id`, 16);
    if (!VC_ID.test(id)) throw new Error(`Invalid verification criterion id: ${id}.`);
    safeString(criterion.description, `${id} description`);
    return id;
  });
  if (new Set(criteria).size !== criteria.length) throw new Error('Verification criterion ids must be unique.');
  const criterionIds = new Set(criteria);

  const pods = array(root.pods, 'Execution pods', 1, 24).map((item, index) => {
    const pod = record(item, `Pod ${index + 1}`);
    const id = safeString(pod.id, `Pod ${index + 1} id`, 64);
    if (!POD_ID.test(id)) throw new Error(`Invalid pod id: ${id}.`);
    safeString(pod.name, `${id} name`, 200);
    safeString(pod.deliverable, `${id} deliverable`);
    const dependencies = array(pod.dependencies, `${id} dependencies`, 0, 24).map((dep, depIndex) => safeString(dep, `${id} dependency ${depIndex + 1}`, 64));
    const vcIds = array(pod.vcIds, `${id} verification criteria`, 0, 50).map((vc, vcIndex) => safeString(vc, `${id} VC ${vcIndex + 1}`, 16));
    return { id, dependencies, vcIds };
  });

  const podIds = new Set(pods.map(pod => pod.id));
  if (podIds.size !== pods.length) throw new Error('Pod ids must be unique.');
  for (const pod of pods) {
    if (new Set(pod.dependencies).size !== pod.dependencies.length) throw new Error(`${pod.id} contains duplicate dependencies.`);
    for (const dependency of pod.dependencies) {
      if (!podIds.has(dependency)) throw new Error(`${pod.id} references unknown dependency ${dependency}.`);
      if (dependency === pod.id) throw new Error(`${pod.id} cannot depend on itself.`);
    }
    for (const vcId of pod.vcIds) if (!criterionIds.has(vcId)) throw new Error(`${pod.id} references unknown criterion ${vcId}.`);
  }

  const assigned = new Set(pods.flatMap(pod => pod.vcIds));
  const unassigned = criteria.filter(id => !assigned.has(id));
  if (unassigned.length > 0) throw new Error(`Verification criteria must be assigned to a pod: ${unassigned.join(', ')}.`);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const dependencies = new Map(pods.map(pod => [pod.id, pod.dependencies]));
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Circular pod dependency detected at ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  pods.forEach(pod => visit(pod.id));
}
