"use client";

import { useEffect, useState } from "react";

export function CampaignRestartButton({
  onRestart,
  className = "button button-ghost campaign-restart-button",
}: {
  onRestart: () => void;
  className?: string;
}) {
  const [confirmRestart, setConfirmRestart] = useState(false);

  useEffect(() => {
    if (!confirmRestart) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmRestart(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmRestart]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setConfirmRestart(true)}
      >
        캠페인 처음부터
      </button>
      {confirmRestart && (
        <div
          className="new-campaign-backdrop"
          onPointerDown={() => setConfirmRestart(false)}
        >
          <section
            className="new-campaign-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="캠페인 처음부터 시작 확인"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span>캠페인 초기화</span>
            <h2>캠페인을 처음부터 다시 시작할까요?</h2>
            <p>현재 경기와 누적 결과, 선수 상태가 모두 초기화됩니다.</p>
            <div>
              <button
                type="button"
                className="button button-ghost"
                autoFocus
                onClick={() => setConfirmRestart(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setConfirmRestart(false);
                  onRestart();
                }}
              >
                처음부터 시작
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
