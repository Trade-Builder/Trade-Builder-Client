/*Rete.js 렌더 플러그인용 커스텀 노드 컴포넌트로, styled-components로 노드 스타일을 정의하고 
Presets.classic의 RefSocket/RefControl로 입력·출력 소켓과 컨트롤을 정렬·렌더링함.*/

import { type ClassicScheme, type RenderEmit, Presets } from "rete-react-plugin";
import { type JSX } from "react";
import styled, { css } from "styled-components";
import { $nodewidth, $socketmargin, $socketsize } from "./vars";

const { RefSocket, RefControl } = Presets.classic;

type NodeExtraData = { width?: number; height?: number };

export const NodeStyles = styled.div<
  NodeExtraData & { selected: boolean; styles?: (props: any) => any }
>`
  /* Dark glass card */
  background: linear-gradient(180deg, #0b0f14 0%, #0a0e12 100%);
  border: 1px solid #1f2937; /* neutral-800 approx */
  border-radius: 14px;
  cursor: pointer;
  box-sizing: border-box;
  width: ${(props) =>
    Number.isFinite(props.width) ? `${props.width}px` : `${$nodewidth}px`};
  height: ${(props) =>
    Number.isFinite(props.height) ? `${props.height}px` : "auto"};
  padding-bottom: 6px;
  position: relative;
  user-select: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
  &:hover { border-color: #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
  ${(props) =>
    props.selected &&
    css`
      border-color: #22d3ee; /* cyan-400 */
      box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.35), 0 12px 32px rgba(0,0,0,.45);
    `}
  .title {
    color: #e5e7eb; /* gray-200 */
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, "Apple Color Emoji", "Segoe UI Emoji";
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
    padding: 10px 10px 6px 10px;
  }
  .output {
    text-align: right;
  }
  .input {
    text-align: left;
  }
  .output-socket {
    text-align: right;
    margin-right: -1px;
    display: inline-block;
  }
  .input-socket {
    text-align: left;
    margin-left: -1px;
    display: inline-block;
  }
  .input-title,
  .output-title {
    vertical-align: middle;
    color: #e5e7eb;
    display: inline-block;
    font-family: ui-sans-serif, system-ui, -apple-system;
    font-size: 13px;
    margin: ${$socketmargin}px;
    line-height: ${$socketsize}px;
  }
  .input-control {
    z-index: 1;
    width: calc(100% - ${$socketsize + 2 * $socketmargin}px);
    vertical-align: middle;
    display: inline-block;
  }
  .control {
    display: block;
    padding: ${$socketmargin}px ${$socketsize / 2 + $socketmargin}px;
  }
  .control-row { display: block; }
  .control-label {
    color: #94a3b8; /* slate-400 */
    font-size: 12px;
    line-height: 1;
    margin: 6px ${$socketsize / 2 + $socketmargin}px 4px ${$socketsize / 2 + $socketmargin}px;
    user-select: none;
  }
  /* Controls (inputs) - make them dark-friendly */
  .control input, .input-control input, .control select, .input-control select {
    width: 100%;
    box-sizing: border-box;
    background: #0f172a; /* slate-900 */
    color: #e5e7eb;
    border: 1px solid #334155; /* slate-700 */
    outline: none;
    border-radius: 10px;
    padding: 6px 8px;
  }
  .control input:focus, .input-control input:focus, .control select:focus, .input-control select:focus {
    border-color: #22d3ee;
    box-shadow: 0 0 0 2px rgba(34,211,238,0.25);
  }
  ${(props) => props.styles && props.styles(props)}
`;

function sortByIndex<T extends [string, undefined | { index?: number }][]>(
  entries: T
) {
  entries.sort((a, b) => {
    const ai = a[1]?.index || 0;
    const bi = b[1]?.index || 0;

    return ai - bi;
  });
}

type Props<S extends ClassicScheme> = {
  data: S["Node"] & NodeExtraData;
  styles?: () => any;
  emit: RenderEmit<S>;
};
export type NodeComponent<Scheme extends ClassicScheme> = (
  props: Props<Scheme>
) => JSX.Element;

export function CustomNode<Scheme extends ClassicScheme>(props: Props<Scheme>) {
  const inputs = Object.entries(props.data.inputs);
  const outputs = Object.entries(props.data.outputs);
  const controls = Object.entries(props.data.controls);
  const selected = props.data.selected || false;
  const { id, label, width, height } = props.data;
  const controlHints: Record<string, { label?: string; title?: string }> = (props as any).data._controlHints || {};
  const resolveLabel = (key: string): string | undefined => {
    // Default from hint
    let lbl = controlHints[key]?.label || controlHints[key]?.title;
    // Overrides for Buy/Sell in Korean UX
    if (label === 'Buy') {
      if (key === 'orderType') lbl = '구매방식';
      if (key === 'limitPrice') lbl = '구매가격';
      if (key === 'sellPercent') lbl = '구매비율';
    }
    if (label === 'Sell') {
      if (key === 'orderType') lbl = '판매방식';
      if (key === 'limitPrice') lbl = '판매가격';
      if (key === 'sellPercent') lbl = '판매비율';
    }
    if (label === 'HighestPrice') {
      if (key === 'periodLength' && !lbl) lbl = '기간';
      if (key === 'periodUnit' && !lbl) lbl = '단위';
    }
    return lbl;
  };

  sortByIndex(inputs);
  sortByIndex(outputs);
  sortByIndex(controls);

  return (
    <NodeStyles
      selected={selected}
      width={width}
      height={height}
      styles={props.styles}
      data-testid="node"
    >
      <div className="title" data-testid="title">
        {label}
      </div>
      {/* Outputs */}
      {outputs.map(
        ([key, output]) =>
          output && (
            <div className="output" key={key} data-testid={`output-${key}`}>
              <div className="output-title" data-testid="output-title">
                {output?.label}
              </div>
              <RefSocket
                name="output-socket"
                side="output"
                emit={props.emit}
                socketKey={key}
                nodeId={id}
                payload={output.socket}
                data-testid="output-socket"
              />
            </div>
          )
      )}
      {/* Controls */}
      {controls.map(([key, control]) => {
        if (!control) return null;
        const lbl = resolveLabel(key);
        return (
          <div key={key} className="control-row">
            {lbl && <div className="control-label">{lbl}</div>}
            <RefControl
              name="control"
              emit={props.emit}
              payload={control}
              data-testid={`control-${key}`}
            />
          </div>
        );
      })}
      {/* Inputs */}
      {inputs.map(
        ([key, input]) =>
          input && (
            <div className="input" key={key} data-testid={`input-${key}`}>
              <RefSocket
                name="input-socket"
                emit={props.emit}
                side="input"
                socketKey={key}
                nodeId={id}
                payload={input.socket}
                data-testid="input-socket"
              />
              {input && (!input.control || !input.showControl) && (
                <div className="input-title" data-testid="input-title">
                  {input?.label}
                </div>
              )}
              {input?.control && input?.showControl && (
                <span className="input-control">
                  <RefControl
                    key={key}
                    name="input-control"
                    emit={props.emit}
                    payload={input.control}
                    data-testid="input-control"
                  />
                </span>
              )}
            </div>
          )
      )}
    </NodeStyles>
  );
}
