// app-editor.js의 타입을 declare(선언)해 타입스크립트에서 인식하게 함.
// app-editor.js는 Rete.js 에디터 인스턴스 생성·설정·파괴, 노드 생성, 그래프 직렬화·역직렬화, 노드 삭제 등의 함수들을 정의함.
export function createAppEditor(container: HTMLElement): Promise<{
  editor: any;
  area: any;
  destroy: () => void;
}>;

export function createNodeByKind(
  kind: 'stock' | 'roi' | 'currentPrice' | 'highestPrice' | 'rsi' | 'sma' | 'compare' | 'buy' | 'sell' | 'branch'
): any;

export function clientToWorld(
  area: any,
  container: HTMLElement,
  clientX: number,
  clientY: number,
  evt?: MouseEvent
): { x: number; y: number };

export type SerializedGraph = {
  nodes: Array<{
    id: string;
    label: string;
    kind?: 'stock' | 'roi' | 'currentPrice' | 'highestPrice' | 'rsi' | 'sma' | 'compare' | 'buy' | 'sell' | 'branch';
    position: { x: number; y: number };
    controls?: Record<string, any>;
  }>;
  connections: Array<{
    id: string;
    source: string;
    target: string;
    sourceOutput: string;
    targetInput: string;
  }>;
};

export function exportGraph(editor: any, area: any): SerializedGraph;
export function importGraph(editor: any, area: any, graph: SerializedGraph | undefined | null): Promise<void>;
export function removeNodeWithConnections(editor: any, nodeId: string): Promise<void>;
