// Original offline match rules. Scores always belong to squads, not map sides.
export function normalizeRules(value={}) {
  const mode=value.matchMode==='quick'?'quick':'standard';
  const firstTo=mode==='quick'?2:[2,4,7,10].includes(Number(value.firstTo))?Number(value.firstTo):4;
  return {mode,firstTo,overtime:mode==='standard'&&value.overtime===true,buyTime:mode==='quick'?8:12,roundTime:mode==='quick'?60:90};
}
export function matchComplete(state) {
  const rules=state.rules||normalizeRules(),high=Math.max(state.wins,state.losses),lead=Math.abs(state.wins-state.losses);
  if(high<rules.firstTo)return false;
  if(!rules.overtime)return true;
  // Six overtime rounds, then one deciding round: never an unbounded match.
  return lead>=2||high>=rules.firstTo+3;
}
export function overtimeActive(state) {
  const rules=state.rules||normalizeRules();return rules.overtime&&Math.min(state.wins,state.losses)>=rules.firstTo-1;
}
export function switchBeforeRound(state) {
  const rules=state.rules||normalizeRules(),played=state.roundResults.length;
  if(played===rules.firstTo-1&&!state.sidesSwitched)return true;
  const tiedAt=2*(rules.firstTo-1);
  return overtimeActive(state)&&played>=tiedAt&&(played-tiedAt)%2===0;
}
export function ruleLabel(state) {
  const r=state.rules||normalizeRules();
  if(overtimeActive(state))return Math.max(state.wins,state.losses)>=r.firstTo+2?'OVERTIME / DECIDING ROUND':'OVERTIME / WIN BY TWO';
  return (r.mode==='quick'?'QUICK / ':'')+'FIRST TO '+r.firstTo+(r.overtime?' / WIN BY TWO':'');
}
