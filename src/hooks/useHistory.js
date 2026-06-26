import { useCallback, useRef, useState } from "react";

export function useHistory(initialState) {
  const [state, setState] = useState(initialState);
  const history = useRef([initialState]);
  const index = useRef(0);
  const initLogged = useRef(false);

  // #region agent log
  if (!initLogged.current) {
    initLogged.current = true;
    fetch('http://127.0.0.1:7902/ingest/c385147e-d6b8-4063-8961-f6887a43465a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'17f64e'},body:JSON.stringify({sessionId:'17f64e',location:'useHistory.js:init',message:'History init',data:{initialStateType:typeof initialState,history0Type:typeof history.current[0],stateType:typeof state,stateKeys:state&&typeof state==='object'?Object.keys(state).slice(0,8):null},hypothesisId:'B',timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion

  const push = useCallback((newState) => {
    const prev = history.current[index.current];
    const next = typeof newState === "function" ? newState(prev) : newState;
    // #region agent log
    fetch('http://127.0.0.1:7902/ingest/c385147e-d6b8-4063-8961-f6887a43465a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'17f64e'},body:JSON.stringify({sessionId:'17f64e',location:'useHistory.js:push',message:'Settings push',data:{prevType:typeof prev,index:index.current,nextKeys:next&&typeof next==='object'?Object.keys(next).length:0,historyLen:history.current.length},hypothesisId:'B',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    history.current = history.current.slice(0, index.current + 1);
    history.current.push(next);
    if (history.current.length > 50) history.current.shift();
    else index.current += 1;
    setState(next);
  }, []);

  const undo = useCallback(() => {
    if (index.current > 0) {
      index.current -= 1;
      setState(history.current[index.current]);
      return true;
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (index.current < history.current.length - 1) {
      index.current += 1;
      setState(history.current[index.current]);
      return true;
    }
    return false;
  }, []);

  const canUndo = index.current > 0;
  const canRedo = index.current < history.current.length - 1;

  return { state, push, undo, redo, canUndo, canRedo, setState: push };
}
