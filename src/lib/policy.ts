/** Uma segunda etapa fará a checagem no serviço privilegiado; este guard não substitui segurança no SO. */
export type Operation =
  | 'inspect' | 'read' | 'edit_sandbox' | 'run_approved_test' | 'commit_agent_branch'
  | 'push_agent_branch' | 'merge' | 'publish' | 'delete' | 'restore' | 'unlock_vault';

export interface PermissionContext {
  projectAuthorized: boolean;
  branch?: string;
  connectedToProduction: boolean;
  explicitApproval: boolean;
  commandAllowlisted?: boolean;
}
export interface Decision { allowed: boolean; reason: string }

export function isAgentBranch(branch: string | undefined): boolean {
  return Boolean(branch && /^agent\/[a-z0-9-]+\/[a-zA-Z0-9._-]+$/.test(branch));
}

export function authorize(operation: Operation, context: PermissionContext): Decision {
  if (!context.projectAuthorized) return { allowed: false, reason: 'Projeto não autorizado.' };
  if (['merge', 'publish', 'delete', 'restore', 'unlock_vault'].includes(operation)) {
    return context.explicitApproval
      ? { allowed: true, reason: 'Requer confirmação adicional na execução real.' }
      : { allowed: false, reason: 'Operação sensível exige aprovação explícita.' };
  }
  if (operation === 'run_approved_test' && !context.commandAllowlisted) {
    return { allowed: false, reason: 'Comando ainda não aprovado para este projeto.' };
  }
  if (operation === 'commit_agent_branch' || operation === 'push_agent_branch') {
    if (!isAgentBranch(context.branch)) return { allowed: false, reason: 'Branch do agente inválida.' };
    if (context.connectedToProduction) return { allowed: false, reason: 'Branch vinculada à produção.' };
  }
  return { allowed: true, reason: 'Permitido pelo contrato preliminar.' };
}

export function canCleanup(params: {
  approved: boolean; uploadsVerified: boolean; filesOpen: boolean;
  conflicts: boolean; pendingChanges: boolean;
}): boolean {
  return params.approved && params.uploadsVerified && !params.filesOpen &&
    !params.conflicts && !params.pendingChanges;
}