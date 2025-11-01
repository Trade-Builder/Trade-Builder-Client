/*Rete.js 렌더 플러그인용 커스텀 노드 컴포넌트로, styled-components로 노드 스타일을 정의하고 
Presets.classic의 RefSocket/RefControl로 입력·출력 소켓과 컨트롤을 정렬·렌더링함.*/

import { type ClassicScheme, type RenderEmit, Presets } from "rete-react-plugin";
import { type JSX, useEffect, useState } from "react";
import styled, { css, type FlattenSimpleInterpolation } from "styled-components";
import { $nodewidth, $socketmargin, $socketsize } from "./vars";

const { RefSocket, RefControl } = Presets.classic;

type NodeExtraData = { width?: number; height?: number };
type ControlHints = Record<string, { label?: string; title?: string }>;
type NodeMeta = { _controlHints?: ControlHints };
type NodeStyleProps = NodeExtraData & { selected: boolean };
type NodeStyleFn = (props: NodeStyleProps) => FlattenSimpleInterpolation | string | undefined;

export const NodeStyles = styled.div<
  NodeStyleProps & { styles?: NodeStyleFn }
>`
  /* Themed card */
  background: linear-gradient(180deg, var(--node-bg-start) 0%, var(--node-bg-end) 100%);
  border: 1px solid var(--node-border);
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
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
  &:hover { border-color: var(--control-border); box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
  ${(props) =>
    props.selected &&
    css`
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-weak), 0 12px 32px rgba(0,0,0,.35);
    `}
  .title {
    color: var(--title-color);
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
    color: var(--io-title-color);
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
    color: var(--muted);
    font-size: 12px;
    line-height: 1;
    margin: 6px ${$socketsize / 2 + $socketmargin}px 4px ${$socketsize / 2 + $socketmargin}px;
    user-select: none;
  }
  /* Controls (inputs) - make them dark-friendly */
  .control input, .input-control input, .control select, .input-control select {
    width: 100%;
    box-sizing: border-box;
    background: var(--control-bg);
    color: var(--control-fg);
    border: 1px solid var(--control-border);
    outline: none;
    border-radius: 10px;
    padding: 6px 8px;
  }
  .control input:focus, .input-control input:focus, .control select:focus, .input-control select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-weak);
  }
  ${(props) => props.styles && props.styles(props)}
`;

// 간단한 React 기반 커스텀 드롭다운(기존 enhancer의 스타일을 최대한 유지)
function Dropdown(props: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { options } = props;
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(props.value ?? options[0]);

  useEffect(() => {
    setVal(props.value ?? options[0]);
  }, [props.value, options]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      // close if click outside container
      if (!target) return setOpen(false);
      // allow because we attach handler on capture via element containment check below
    };
    window.addEventListener("mousedown", onDoc, { once: true });
    return () => window.removeEventListener("mousedown", onDoc as any);
  }, [open]);

  const select = (v: string) => {
    setVal(v);
    setOpen(false);
    props.onChange(v);
  };

  return (
    <div className="relative" style={{ width: '100%', display: 'block' }}>
      <button
        type="button"
        className={[
          "w-full",
          "px-3",
          "py-2",
          "text-sm",
          "rounded-md",
          "border",
          "outline-none",
          open ? "ring-2 ring-cyan-400/40" : "",
          "flex",
          "items-center",
          "justify-between",
        ].join(" ")}
        style={{
          background: "var(--control-bg)",
          borderColor: "var(--control-border)",
          color: "var(--control-fg)",
          width: "100%",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="truncate text-left">{val}</span>
        <span className="ml-2 text-gray-400 select-none">▾</span>
      </button>
      <ul
        className={[
          "absolute",
          "left-0",
          "right-0",
          "mt-1",
          "rounded-md",
          "border",
          "shadow-xl",
          "z-[1100]",
          open ? "" : "hidden",
        ].join(" ")}
        style={{
          background: "var(--control-bg)",
          borderColor: "var(--control-border)",
          maxHeight: 'none',
          overflow: 'visible',
        }}
      >
        {options.map((opt) => (
          <li
            key={opt}
            className="px-3 py-2 text-sm cursor-pointer"
            style={{ color: "var(--control-fg)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLLIElement).style.background = "rgba(51,65,85,0.2)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLLIElement).style.background = "transparent")
            }
            onClick={() => select(opt)}
          >
            {opt}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  data: S["Node"] & NodeExtraData & NodeMeta;
  styles?: NodeStyleFn;
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
  const controlHints: ControlHints = props.data._controlHints || {};
  const resolveLabel = (key: string): string | undefined => {
    // Default from hint
    let lbl = controlHints[key]?.label || controlHints[key]?.title;
    // Overrides for Buy/Sell in Korean UX
    if (label === 'Buy') {
      if (key === 'orderType') lbl = '구매방식';
      if (key === 'limitPrice') lbl = '구매가격';
      if (key === 'sellPercent') lbl = '구매총액';
    }
    if (label === 'Sell') {
      if (key === 'orderType') lbl = '판매방식';
      if (key === 'limitPrice') lbl = '판매가격';
      if (key === 'sellPercent') lbl = '판매총액';
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

        // 직접 렌더 select: 특정 노드/키 조합에 대해 드롭다운 렌더링
        const nodeLabel = String(label);
        const getSelectOptions = (nodeLabel: string, key: string): string[] | undefined => {
          switch (nodeLabel) {
            case 'Buy':
              if (key === 'orderType') return ['market', 'limit'];
              break;
            case 'Sell':
              if (key === 'orderType') return ['market', 'limit'];
              break;
            case 'HighestPrice':
              if (key === 'periodUnit') return ['day', 'week','month', 'year'];
              break;
            // case 'SMA':
            //   if (key === 'periodUnit') return ['day', 'month', 'year'];
            //   break;
            // case 'AI 노드':
            //   if (key === 'periodUnit') return ['day', 'month', 'year'];
            //   break;
            case 'Compare':
              if (key === 'operator') return ['>', '≥', '=', '<', '≤', '≠'];
              break;
            case 'LogicOp':
              if (key === 'operator') return ['and', 'or'];
              break;
          }
          return undefined;
        };

        const opts = getSelectOptions(nodeLabel, key);
        if (opts) {
          const ctrl: any = control as any;
          const value: string = (typeof ctrl.getValue === 'function' ? ctrl.getValue() : ctrl.value) ?? opts[0];
          const onChange = (v: string) => {
            try {
              if (typeof ctrl.setValue === 'function') ctrl.setValue(v);
              else ctrl.value = v;
            } catch {}
          };
          return (
            <div key={key} className="control-row">
              {lbl && <div className="control-label">{lbl}</div>}
              <div className="control">
                <Dropdown options={opts} value={value} onChange={onChange} />
              </div>
            </div>
          );
        }

        // 기본 컨트롤은 기존처럼 RefControl 렌더
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
