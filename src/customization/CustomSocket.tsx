/*Rete 노드의 소켓(입·출력 포트) 출력해주는 tsx*/
import { type ClassicPreset } from "rete";
import styled from "styled-components";
import { $socketsize } from "./vars";

const Styles = styled.div`
  display: inline-block;
  cursor: pointer;
  width: ${$socketsize}px;
  height: ${$socketsize}px;
  vertical-align: middle;
  z-index: 2;
  box-sizing: border-box;
  border-radius: 9999px;
  background: radial-gradient(50% 50% at 50% 50%, var(--socket-grad-1) 0%, var(--socket-grad-2) 100%);
  border: 2px solid var(--socket-border);
  box-shadow: 0 0 0 1px rgba(15,23,42,0.35), inset 0 0 8px var(--accent-weak);
  transition: box-shadow .15s ease, border-color .15s ease, transform .15s ease;
  &:hover {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-weak), inset 0 0 10px var(--accent-weak);
    transform: scale(1.02);
  }
`;

export function CustomSocket<T extends ClassicPreset.Socket>(props: {
  data: T;
}) {
  return <Styles title={props.data.name} />;
}
