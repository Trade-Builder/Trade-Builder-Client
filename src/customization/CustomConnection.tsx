// Rete js 간선 모양 렌더링 && 스타일 정의
import styled, { type FlattenSimpleInterpolation } from "styled-components";
import { type ClassicScheme, Presets } from "rete-react-plugin";

const { useConnection } = Presets.classic;

const Svg = styled.svg`
  overflow: visible !important;
  position: absolute;
  pointer-events: none;
  width: 9999px;
  height: 9999px;
`;

type PathStyleFn = (props: object) => FlattenSimpleInterpolation | string | undefined;
const Path = styled.path<{ styles?: PathStyleFn }>`
  fill: none;
  stroke-width: 3px;
  stroke: var(--conn-stroke);
  opacity: 0.85;
  stroke-linecap: round;
  filter: drop-shadow(0 0 6px var(--accent-weak));
  pointer-events: auto;
  ${(props) => props.styles && props.styles(props)}
`;

export function CustomConnection(props: {
  data: ClassicScheme["Connection"] & { isLoop?: boolean };
  styles?: () => FlattenSimpleInterpolation | string | undefined;
}) {
  const { path } = useConnection();

  if (!path) return null;

  return (
    <Svg data-testid="connection">
      <Path styles={props.styles} d={path} />
    </Svg>
  );
}