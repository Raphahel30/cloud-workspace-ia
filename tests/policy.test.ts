import {describe,it,expect} from 'vitest';
import {authorize,canCleanup} from '../src/lib/policy';
import {bossIsWorking,visibleAgentState} from '../src/lib/telemetry';
import {initialSnapshot} from '../src/data/demo';

describe('segurança inicial',()=>{
  const ctx={projectAuthorized:true,connectedToProduction:false,explicitApproval:false,branch:'agent/codex/tarefa-1'};
  it('recusa publicação, merge e exclusão sem aprovação',()=>{
    for(const action of ['publish','merge','delete'] as const)expect(authorize(action,ctx).allowed).toBe(false);
  });
  it('não deixa push em branch de produção ou branch não autorizada',()=>{
    expect(authorize('push_agent_branch',{...ctx,branch:'main'}).allowed).toBe(false);
    expect(authorize('push_agent_branch',{...ctx,connectedToProduction:true}).allowed).toBe(false);
    expect(authorize('push_agent_branch',ctx).allowed).toBe(true);
  });
  it('não executa teste novo sem autorização',()=>{
    expect(authorize('run_approved_test',ctx).allowed).toBe(false);
  });
  it('não apaga cópia com upload pendente ou conflito',()=>{
    const safe={approved:true,uploadsVerified:true,filesOpen:false,conflicts:false,pendingChanges:false};
    expect(canCleanup(safe)).toBe(true);
    expect(canCleanup({...safe,conflicts:true})).toBe(false);
    expect(canCleanup({...safe,pendingChanges:true})).toBe(false);
    expect(canCleanup({...safe,approved:false})).toBe(false);
  });
  it('não marca IA como trabalhando sem evidência validada',()=>{
    expect(visibleAgentState({id:'x',label:'x',state:'working',verified:false,source:'process',observedAt:null})).toBe('unknown');
  });
  it('chefe não trabalha em dados de demonstração',()=>{
    expect(bossIsWorking(initialSnapshot)).toBe(false);
  });
});