import { describe, expect, it } from "vitest";
import { trackScrollDelta } from "./use-nav-track-scroll";

// Trilho de 390px com 16px de gutter, como no celular.
const track = { left: 0, right: 390, width: 390 };
const box = (left: number, width: number) => ({
  left,
  right: left + width,
  width,
});

describe("trackScrollDelta", () => {
  it("centraliza o item no trilho", () => {
    expect(trackScrollDelta(track, box(600, 170), "center")).toBe(490);
    expect(trackScrollDelta(track, box(20, 70), "center")).toBe(-140);
  });

  it("no foco, só traz o item para dentro com respiro na borda", () => {
    expect(trackScrollDelta(track, box(300, 136), "nearest")).toBe(66);
    expect(trackScrollDelta(track, box(-50, 120), "nearest")).toBe(-70);
  });

  it("no foco, não rola o item que já aparece inteiro", () => {
    expect(trackScrollDelta(track, box(100, 136), "nearest")).toBe(0);
  });
});
