import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CurrentGameService } from '../../ongoing-game/current-game.service';
import { Subscription } from 'rxjs';

interface CancelToken { cancelled: boolean; fadeTimer?: ReturnType<typeof setTimeout>; }
interface EmojiThrownEvent { targetPlayerId: string; emoji: string; }

function bezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function quad(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

@Component({
  selector: 'shpp-emoji-animation',
  templateUrl: './emoji-animation.component.html',
  styleUrls: ['./emoji-animation.component.scss'],
  standalone: true,
  imports: []
})
export class EmojiAnimationComponent implements OnInit, OnDestroy {
  @ViewChild('overlay', { static: true }) overlayRef!: ElementRef<HTMLDivElement>;

  private subscription?: Subscription;
  private activeTokens = new Set<CancelToken>();

  constructor(private currentGameService: CurrentGameService, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.subscription = this.currentGameService.onEmojiThrown()
      .subscribe((data: EmojiThrownEvent) => {
        this.ngZone.runOutsideAngular(() => this.throwEmoji(data.targetPlayerId, data.emoji));
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.activeTokens.forEach(token => {
      token.cancelled = true;
      if (token.fadeTimer !== undefined) clearTimeout(token.fadeTimer);
    });
    this.activeTokens.clear();
    this.overlayRef.nativeElement.innerHTML = '';
  }

  throwEmoji(targetPlayerId: string, emoji: string): void {
    const targetCard = document.querySelector(`[data-player-id="${CSS.escape(targetPlayerId)}"]`) as HTMLElement | null;
    if (!targetCard) return;

    const rect = targetCard.getBoundingClientRect();
    const fromLeft = Math.random() > 0.5;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const hitX = fromLeft ? rect.left : rect.right;
    const hitY = rect.top + rect.height * (0.2 + Math.random() * 0.5);
    const floorY = rect.bottom + 6;

    const startX = fromLeft ? -20 : W + 20;
    const startY = H * (0.05 + Math.random() * 0.2);

    const cp1x = fromLeft ? W * 0.15 : W * 0.85;
    const cp1y = startY - H * 0.15;
    const cp2x = fromLeft ? hitX - 60 : hitX + 60;
    const cp2y = hitY - 35;

    const miniPeakX = fromLeft ? hitX - 38 : hitX + 38;
    const miniPeakY = hitY - 38;
    const floor1X = fromLeft ? hitX - 18 : hitX + 18;

    const b1h = 26 + Math.random() * 10;
    const floor2X = floor1X + (fromLeft ? -32 : 32);
    const b2h = b1h * 0.45;
    const floor3X = floor2X + (fromLeft ? -18 : 18);

    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.position = 'absolute';
    el.style.fontSize = '24px';
    el.style.pointerEvents = 'none';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))';
    el.style.userSelect = 'none';
    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    this.overlayRef.nativeElement.appendChild(el);

    const token: CancelToken = { cancelled: false };
    this.activeTokens.add(token);

    const DURATIONS = { arc: 700, mini: 220, b1: 280, b2: 200 };
    type Phase = 'arc' | 'mini' | 'b1' | 'b2' | 'fade';
    let phase: Phase = 'arc';
    let phaseStart = performance.now();

    const step = (): void => {
      if (token.cancelled) return;

      const elapsed = performance.now() - phaseStart;

      if (phase === 'arc') {
        const t = Math.min(elapsed / DURATIONS.arc, 1);
        el.style.left = bezier(startX, cp1x, cp2x, hitX, t) + 'px';
        el.style.top  = bezier(startY, cp1y, cp2y, hitY, t) + 'px';
        if (t < 1) { requestAnimationFrame(step); return; }
        phase = 'mini'; phaseStart = performance.now();
        requestAnimationFrame(step);

      } else if (phase === 'mini') {
        const t = Math.min(elapsed / DURATIONS.mini, 1);
        el.style.left = quad(hitX, miniPeakX, floor1X, t) + 'px';
        el.style.top  = quad(hitY, miniPeakY, floorY, t) + 'px';
        if (t < 1) { requestAnimationFrame(step); return; }
        phase = 'b1'; phaseStart = performance.now();
        requestAnimationFrame(step);

      } else if (phase === 'b1') {
        const t = Math.min(elapsed / DURATIONS.b1, 1);
        el.style.left = (floor1X + (floor2X - floor1X) * t) + 'px';
        el.style.top  = (floorY - 4 * b1h * t * (1 - t)) + 'px';
        if (t < 1) { requestAnimationFrame(step); return; }
        phase = 'b2'; phaseStart = performance.now();
        requestAnimationFrame(step);

      } else if (phase === 'b2') {
        const t = Math.min(elapsed / DURATIONS.b2, 1);
        el.style.left = (floor2X + (floor3X - floor2X) * t) + 'px';
        el.style.top  = (floorY - 4 * b2h * t * (1 - t)) + 'px';
        if (t < 1) { requestAnimationFrame(step); return; }
        phase = 'fade';
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '0';
        token.fadeTimer = setTimeout(() => {
          if (!token.cancelled) el.remove();
          this.activeTokens.delete(token);
        }, 400);
      }
    };

    requestAnimationFrame(step);
  }
}
