import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CurrentGameService } from '../../ongoing-game/current-game.service';
import { Subscription } from 'rxjs';

interface CancelToken { cancelled: boolean; }

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

  constructor(private currentGameService: CurrentGameService) {}

  ngOnInit(): void {
    this.subscription = this.currentGameService.onEmojiThrown()
      .subscribe((data: any) => {
        this.throwEmoji(data.targetPlayerId, data.emoji);
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.activeTokens.forEach(token => { token.cancelled = true; });
    this.activeTokens.clear();
    this.overlayRef.nativeElement.innerHTML = '';
  }

  throwEmoji(targetPlayerId: string, emoji: string): void {
    const targetCard = document.querySelector(`[data-player-id="${targetPlayerId}"]`) as HTMLElement | null;
    if (!targetCard) return;

    const rect = targetCard.getBoundingClientRect();
    const fromLeft = Math.random() > 0.5;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Hit point on lateral edge of card (20%–70% of height, random — never dead center)
    const hitX = fromLeft ? rect.left : rect.right;
    const hitY = rect.top + rect.height * (0.2 + Math.random() * 0.5);

    // Floor = bottom of card + small gap
    const floorY = rect.bottom + 6;

    // Start position (off-screen)
    const startX = fromLeft ? -20 : W + 20;
    const startY = H * (0.05 + Math.random() * 0.2);

    // Cubic bezier arc control points
    const cp1x = fromLeft ? W * 0.15 : W * 0.85;
    const cp1y = startY - H * 0.15;
    const cp2x = fromLeft ? hitX - 60 : hitX + 60;
    const cp2y = hitY - 35;

    // Mini inverse parabola after impact
    const miniPeakX = fromLeft ? hitX - 38 : hitX + 38;
    const miniPeakY = hitY - 38;
    const floor1X = fromLeft ? hitX - 18 : hitX + 18;

    // Floor bounces (decreasing height)
    const b1h = 26 + Math.random() * 10;
    const floor2X = floor1X + (fromLeft ? -32 : 32);
    const b2h = b1h * 0.45;
    const floor3X = floor2X + (fromLeft ? -18 : 18);

    // Create emoji element and append to overlay
    const el = document.createElement('div');
    el.className = 'flying-emoji';
    el.textContent = emoji;
    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    this.overlayRef.nativeElement.appendChild(el);

    const token: CancelToken = { cancelled: false };
    this.activeTokens.add(token);

    let t = 0;
    let bt = 0;
    type Phase = 'arc' | 'mini' | 'b1' | 'b2' | 'fade';
    let phase: Phase = 'arc';

    const step = (): void => {
      if (token.cancelled) return;

      if (phase === 'arc') {
        t += 0.016;
        if (t >= 1) { t = 1; phase = 'mini'; bt = 0; }
        el.style.left = bezier(startX, cp1x, cp2x, hitX, t) + 'px';
        el.style.top  = bezier(startY, cp1y, cp2y, hitY, t) + 'px';
        requestAnimationFrame(step);

      } else if (phase === 'mini') {
        bt += 0.038;
        if (bt >= 1) { bt = 1; phase = 'b1'; bt = 0; }
        el.style.left = quad(hitX, miniPeakX, floor1X, bt) + 'px';
        el.style.top  = quad(hitY, miniPeakY, floorY, bt) + 'px';
        requestAnimationFrame(step);

      } else if (phase === 'b1') {
        bt += 0.046;
        if (bt >= 1) { bt = 1; phase = 'b2'; bt = 0; }
        el.style.left = (floor1X + (floor2X - floor1X) * bt) + 'px';
        el.style.top  = (floorY - 4 * b1h * bt * (1 - bt)) + 'px';
        requestAnimationFrame(step);

      } else if (phase === 'b2') {
        bt += 0.058;
        if (bt >= 1) { bt = 1; phase = 'fade'; }
        el.style.left = (floor2X + (floor3X - floor2X) * bt) + 'px';
        el.style.top  = (floorY - 4 * b2h * bt * (1 - bt)) + 'px';
        requestAnimationFrame(step);

      } else {
        // fade
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '0';
        setTimeout(() => {
          if (!token.cancelled) el.remove();
          this.activeTokens.delete(token);
        }, 400);
      }
    };

    requestAnimationFrame(step);
  }
}
