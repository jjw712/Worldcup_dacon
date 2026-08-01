"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { MatchState, Side } from "../types";

interface TacticalBoardProps {
  match: MatchState;
  selectedPlayerId?: string;
  editable?: boolean;
  compact?: boolean;
  selectableSide?: Side;
  focusSide?: Side;
  highlightedPlayerIds?: string[];
  onSelectPlayer?: (playerId: string) => void;
  onMovePlayer?: (playerId: string, x: number, y: number) => void;
}

interface DisplayPoint {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

const hexWithAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return hex;
  const value = Number.parseInt(expanded, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

const contrastText = (hex: string): string => {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return "#ffffff";
  const value = Number.parseInt(expanded, 16);
  const luminance =
    0.299 * ((value >> 16) & 255) +
    0.587 * ((value >> 8) & 255) +
    0.114 * (value & 255);
  return luminance > 155 ? "#102019" : "#ffffff";
};

export function TacticalBoard({
  match,
  selectedPlayerId,
  editable = false,
  compact = false,
  selectableSide = "home",
  focusSide,
  highlightedPlayerIds,
  onSelectPlayer,
  onMovePlayer,
}: TacticalBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayPoints = useRef<Record<string, DisplayPoint>>({});
  const displayBall = useRef<DisplayPoint>({
    x: match.ball.x,
    y: match.ball.y,
  });
  const draggingPlayerId = useRef<string | null>(null);
  const latestMatch = useRef(match);
  const latestSelected = useRef(selectedPlayerId);
  const latestHighlighted = useRef(highlightedPlayerIds);

  useEffect(() => {
    latestMatch.current = match;
    latestSelected.current = selectedPlayerId;
    latestHighlighted.current = highlightedPlayerIds;
  }, [highlightedPlayerIds, match, selectedPlayerId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    const draw = () => {
      const current = latestMatch.current;
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const w = rect.width;
      const h = rect.height;
      const padding = compact ? 12 : 18;

      // During screen transitions the flex layout can briefly collapse the
      // canvas below its drawing padding. CanvasRenderingContext2D.arc throws
      // when that produces a negative radius, so wait for a valid layout.
      if (w <= padding * 2 || h <= padding * 2) {
        context.clearRect(0, 0, Math.max(1, w), Math.max(1, h));
        animationFrame = window.requestAnimationFrame(draw);
        return;
      }

      const fieldX = padding;
      const fieldY = padding;
      const fieldW = w - padding * 2;
      const fieldH = h - padding * 2;

      context.clearRect(0, 0, w, h);
      context.fillStyle = "#071b15";
      context.fillRect(0, 0, w, h);

      const stripeWidth = fieldW / 10;
      for (let index = 0; index < 10; index += 1) {
        context.fillStyle = index % 2 === 0 ? "#0c563d" : "#0a4b36";
        context.fillRect(
          fieldX + stripeWidth * index,
          fieldY,
          stripeWidth + 1,
          fieldH,
        );
      }

      if (current.ball.zone >= 2) {
        const dangerX =
          current.possession === "home"
            ? fieldX + fieldW * 0.72
            : fieldX + fieldW * 0.04;
        context.fillStyle =
          current.possession === "home"
            ? "rgba(201, 244, 89, 0.10)"
            : "rgba(255, 95, 90, 0.12)";
        context.fillRect(dangerX, fieldY, fieldW * 0.24, fieldH);
      }

      context.strokeStyle = "rgba(236, 245, 223, 0.72)";
      context.lineWidth = compact ? 1 : 1.4;
      context.strokeRect(fieldX, fieldY, fieldW, fieldH);
      context.beginPath();
      context.moveTo(fieldX + fieldW / 2, fieldY);
      context.lineTo(fieldX + fieldW / 2, fieldY + fieldH);
      context.stroke();
      context.beginPath();
      context.arc(
        fieldX + fieldW / 2,
        fieldY + fieldH / 2,
        fieldH * 0.14,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.beginPath();
      context.arc(
        fieldX + fieldW / 2,
        fieldY + fieldH / 2,
        2.2,
        0,
        Math.PI * 2,
      );
      context.fillStyle = "rgba(236, 245, 223, 0.82)";
      context.fill();

      const boxWidth = fieldW * 0.15;
      const boxHeight = fieldH * 0.52;
      context.strokeRect(
        fieldX,
        fieldY + (fieldH - boxHeight) / 2,
        boxWidth,
        boxHeight,
      );
      context.strokeRect(
        fieldX + fieldW - boxWidth,
        fieldY + (fieldH - boxHeight) / 2,
        boxWidth,
        boxHeight,
      );

      const goalWidth = fieldH * 0.24;
      context.strokeRect(
        fieldX - 5,
        fieldY + (fieldH - goalWidth) / 2,
        5,
        goalWidth,
      );
      context.strokeRect(
        fieldX + fieldW,
        fieldY + (fieldH - goalWidth) / 2,
        5,
        goalWidth,
      );

      const activeKinds = new Set(
        current.commands.map((command) => command.kind),
      );
      if (activeKinds.has("PRESS_HIGHER")) {
        context.fillStyle = "rgba(211, 164, 79, 0.12)";
        context.fillRect(
          fieldX + fieldW * 0.62,
          fieldY,
          fieldW * 0.34,
          fieldH,
        );
        context.fillStyle = "rgba(238, 197, 121, 0.78)";
        context.font = `800 ${compact ? 12 : 14}px ui-sans-serif, sans-serif`;
        context.textAlign = "right";
        context.fillText(
          "전방 압박 구역",
          fieldX + fieldW * 0.94,
          fieldY + 14,
        );
      }

      if (
        activeKinds.has("ATTACK_WIDE") ||
        activeKinds.has("PREPARED_PLAN")
      ) {
        const targetTop = current.homeTactic.attackSide === "left";
        const bandY = targetTop ? fieldY : fieldY + fieldH * 0.76;
        context.fillStyle = "rgba(106, 164, 191, 0.14)";
        context.fillRect(fieldX, bandY, fieldW, fieldH * 0.24);
        context.strokeStyle = "rgba(128, 192, 220, 0.7)";
        context.lineWidth = compact ? 1 : 2;
        context.setLineDash([8, 6]);
        context.beginPath();
        context.moveTo(fieldX + fieldW * 0.35, bandY + fieldH * 0.12);
        context.lineTo(fieldX + fieldW * 0.82, bandY + fieldH * 0.12);
        context.stroke();
        context.setLineDash([]);
      }

      if (activeKinds.has("LOWER_LINE")) {
        const defenders = current.players.filter(
          (player) =>
            player.side === "home" &&
            player.onField &&
            player.position === "DF",
        );
        const lineX = defenders.length
          ? defenders.reduce((total, player) => total + player.x, 0) /
            defenders.length
          : 0.2;
        const displayLineX = fieldX + lineX * fieldW;
        context.strokeStyle = "rgba(238, 197, 121, 0.88)";
        context.lineWidth = compact ? 1 : 2;
        context.setLineDash([6, 5]);
        context.beginPath();
        context.moveTo(displayLineX, fieldY);
        context.lineTo(displayLineX, fieldY + fieldH);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = "rgba(238, 197, 121, 0.9)";
        context.font = `800 ${compact ? 12 : 14}px ui-sans-serif, sans-serif`;
        context.textAlign = "left";
        context.fillText("수비 기준선", displayLineX + 5, fieldY + 14);
      }

      for (const player of current.players) {
        if (!player.onField) continue;
        const highlighted = latestHighlighted.current;
        context.globalAlpha =
          focusSide && player.side !== focusSide
            ? 0.22
            : highlighted &&
                player.side === selectableSide &&
                !highlighted.includes(player.id)
              ? 0.28
              : 1;
        const existing = displayPoints.current[player.id] ?? {
          x: player.x,
          y: player.y,
        };
        const previousX = existing.x;
        const previousY = existing.y;
        existing.x += (player.x - existing.x) * 0.09;
        existing.y += (player.y - existing.y) * 0.09;
        existing.vx = existing.x - previousX;
        existing.vy = existing.y - previousY;
        displayPoints.current[player.id] = existing;

        const x = fieldX + existing.x * fieldW;
        const y = fieldY + existing.y * fieldH;
        const radius = compact ? 7 : Math.max(8, Math.min(12, fieldW / 55));
        const selected = latestSelected.current === player.id;
        const personalCommand = current.commands
          .slice()
          .reverse()
          .find((command) => command.targetPlayerId === player.id);
        const speed = Math.hypot(existing.vx ?? 0, existing.vy ?? 0);
        const team =
          player.side === "home" ? current.homeTeam : current.awayTeam;

        if (speed > 0.00025) {
          context.beginPath();
          context.moveTo(
            x - (existing.vx ?? 0) * fieldW * 8,
            y - (existing.vy ?? 0) * fieldH * 8,
          );
          context.lineTo(x, y);
          context.strokeStyle = hexWithAlpha(team.color, 0.34);
          context.lineWidth = compact ? 1.2 : 2;
          context.stroke();
        }

        if (selected) {
          context.beginPath();
          context.arc(x, y, radius + 5, 0, Math.PI * 2);
          context.fillStyle = "rgba(201, 244, 89, 0.26)";
          context.fill();
        }

        if (highlighted?.includes(player.id) && !selected) {
          context.beginPath();
          context.arc(x, y, radius + 5, 0, Math.PI * 2);
          context.strokeStyle = "rgba(201, 244, 89, 0.9)";
          context.lineWidth = 2;
          context.stroke();
        }

        if (personalCommand) {
          context.beginPath();
          context.arc(x, y, radius + 7, 0, Math.PI * 2);
          context.strokeStyle =
            personalCommand.kind === "CONSERVE_ENERGY"
              ? "rgba(244, 197, 74, 0.92)"
              : personalCommand.kind === "CENTRAL_RUN"
                ? "rgba(224, 119, 91, 0.92)"
                : "rgba(109, 190, 220, 0.92)";
          context.lineWidth = compact ? 1.5 : 2.5;
          context.setLineDash([4, 3]);
          context.stroke();
          context.setLineDash([]);

          if (
            !compact &&
            (personalCommand.kind === "CENTRAL_RUN" ||
              personalCommand.kind === "WINGER_TRACK")
          ) {
            const destinationX =
              personalCommand.kind === "CENTRAL_RUN"
                ? fieldX + fieldW * 0.88
                : fieldX + player.baseX * fieldW;
            const destinationY =
              personalCommand.kind === "CENTRAL_RUN"
                ? fieldY + fieldH * 0.5
                : fieldY + player.baseY * fieldH;
            context.strokeStyle =
              personalCommand.kind === "CENTRAL_RUN"
                ? "rgba(224, 119, 91, 0.68)"
                : "rgba(109, 190, 220, 0.68)";
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(destinationX, destinationY);
            context.stroke();
          }
        }

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = player.injured ? "#76575a" : team.color;
        context.fill();
        context.strokeStyle = team.accent;
        context.lineWidth = selected ? 3 : 2;
        context.stroke();

        context.fillStyle = contrastText(
          player.injured ? "#76575a" : team.color,
        );
        context.font = `700 ${compact ? 13 : 15}px ui-sans-serif, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(player.number), x, y + 0.5);

        if (!compact && player.card !== "NONE") {
          context.fillStyle =
            player.card === "YELLOW" ? "#f4cd3c" : "#ed5252";
          context.fillRect(x + radius - 1, y - radius - 2, 5, 8);
        }
        context.globalAlpha = 1;
      }

      displayBall.current.x +=
        (current.ball.x - displayBall.current.x) * 0.075;
      displayBall.current.y +=
        (current.ball.y - displayBall.current.y) * 0.075;
      const ballX = fieldX + displayBall.current.x * fieldW;
      const ballY = fieldY + displayBall.current.y * fieldH;
      const ownerPoint = current.ball.ownerPlayerId
        ? displayPoints.current[current.ball.ownerPlayerId]
        : undefined;
      if (ownerPoint) {
        context.beginPath();
        context.moveTo(
          fieldX + ownerPoint.x * fieldW,
          fieldY + ownerPoint.y * fieldH,
        );
        context.lineTo(ballX, ballY);
        context.strokeStyle = "rgba(255, 255, 255, 0.24)";
        context.lineWidth = 1;
        context.setLineDash([4, 5]);
        context.stroke();
        context.setLineDash([]);
      }
      context.beginPath();
      context.arc(ballX, ballY, compact ? 3.5 : 5, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.fill();
      context.strokeStyle = "#17241f";
      context.lineWidth = 1.5;
      context.stroke();

      animationFrame = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [compact, focusSide, selectableSide]);

  const pointerPosition = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): DisplayPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    const padding = compact ? 12 : 18;
    return {
      x: Math.max(
        0,
        Math.min(1, (event.clientX - rect.left - padding) / (rect.width - padding * 2)),
      ),
      y: Math.max(
        0,
        Math.min(1, (event.clientY - rect.top - padding) / (rect.height - padding * 2)),
      ),
    };
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const point = pointerPosition(event);
    const selectablePlayers = match.players.filter(
      (player) =>
        player.side === selectableSide &&
        player.onField &&
        (!highlightedPlayerIds || highlightedPlayerIds.includes(player.id)),
    );
    const nearest = selectablePlayers
      .map((player) => ({
        player,
        distance: Math.hypot(player.x - point.x, player.y - point.y),
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearest && nearest.distance < 0.055) {
      draggingPlayerId.current = editable ? nearest.player.id : null;
      onSelectPlayer?.(nearest.player.id);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (!editable || !draggingPlayerId.current) return;
    const point = pointerPosition(event);
    onMovePlayer?.(draggingPlayerId.current, point.x, point.y);
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    draggingPlayerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={`tactical-board ${editable ? "is-editable" : ""}`}
      aria-label={
        editable
          ? "드래그하여 대한민국 선수 위치를 조정하는 전술판"
          : "실시간 경기 전술판"
      }
      role="img"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
