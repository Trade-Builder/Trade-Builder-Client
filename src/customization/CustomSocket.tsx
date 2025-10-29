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
  background: radial-gradient(50% 50% at 50% 50%, #164e63 0%, #0b1320 100%); /* cyan-800 to dark */
  border: 2px solid #334155; /* slate-700 */
  box-shadow: 0 0 0 1px rgba(15,23,42,0.7), inset 0 0 8px rgba(34,211,238,0.15);
  transition: box-shadow .15s ease, border-color .15s ease, transform .15s ease;
  &:hover {
    border-color: #22d3ee; /* cyan-400 */
    box-shadow: 0 0 0 2px rgba(34,211,238,0.25), inset 0 0 10px rgba(34,211,238,0.25);
    transform: scale(1.02);
  }
`;

export function CustomSocket<T extends ClassicPreset.Socket>(props: {
  data: T;
}) {
  return <Styles title={props.data.name} />;
}
