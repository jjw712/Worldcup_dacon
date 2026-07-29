"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { MatchState } from "../types";

interface TacticalBoardProps {
  match: MatchState;
  selectedPlayerId?: string;
  editable?: boolean;
  compact?: boolean;
  onSelectPlayer?: (playerId: string) => void;
  onMovePlayer?: (playerId: string, x: number, y: number) => void;
}

interface DisplayPoint {
  x: number;
  y: number;
}

export function TacticalBoard({
  match,
  selectedPlayerId,
  editable = false,
  compact = false,
  onSelectPlayer,
  onMovePlayer,
}: TacticalBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayPoints = useRef<Record<string, DisplayPoint>>({});
  const draggingPlayerId = useRef<string | null>(null);
  const latestMatch = useRef(match);
  const latestSelected = useRef(selectedPlayerId);

  useEffect(() => {
    latestMatch.current = match;
    latestSelected.current = selectedPlayerId;
  }, [match, selectedPlayerId]);

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

      for (const player of current.players) {
        if (!player.onField) continue;
        const existing = displayPoints.current[player.id] ?? {
          x: player.x,
          y: player.y,
        };
        existing.x += (player.x - existing.x) * 0.12;
        existing.y += (player.y - existing.y) * 0.12;
        displayPoints.current[player.id] = existing;

        const x = fieldX + existing.x * fieldW;
        const y = fieldY + existing.y * fieldH;
        const radius = compact ? 7 : Math.max(8, Math.min(12, fieldW / 55));
        const selected = latestSelected.current === player.id;

        if (selected) {
          context.beginPath();
          context.arc(x, y, radius + 5, 0, Math.PI * 2);
          context.fillStyle = "rgba(201, 244, 89, 0.26)";
          context.fill();
        }

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle =
          player.side === "home"
            ? player.injured
              ? "#9f5f5f"
              : "#f3f0e8"
            : current.awayTeam.color;
        context.fill();
        context.strokeStyle =
          player.side === "home" ? "#d93445" : current.awayTeam.accent;
        context.lineWidth = selected ? 3 : 2;
        context.stroke();

        context.fillStyle =
          player.side === "home" ? "#12231d" : "#071b15";
        context.font = `700 ${compact ? 8 : 10}px ui-sans-serif, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(player.number), x, y + 0.5);

        if (!compact && player.card !== "NONE") {
          context.fillStyle =
            player.card === "YELLOW" ? "#f4cd3c" : "#ed5252";
          context.fillRect(x + radius - 1, y - radius - 2, 5, 8);
        }
      }

      const ballX = fieldX + current.ball.x * fieldW;
      const ballY = fieldY + current.ball.y * fieldH;
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
  }, [compact]);

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
      (player) => player.side === "home" && player.onField,
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
