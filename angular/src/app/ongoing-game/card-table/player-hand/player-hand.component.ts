import { Component, Input } from '@angular/core';
import { PlayerState } from '../../../model/events';
import { Deck, displayCardValue } from '../../../model/deck';
import { NgIf } from '@angular/common';
import { TranslocoDirective } from '@ngneat/transloco';
import { EmojiPickerComponent } from '../../../shared/emoji-picker/emoji-picker.component';
import { CurrentGameService } from '../../current-game.service';

@Component({
    selector: 'shpp-player-hand',
    templateUrl: './player-hand.component.html',
    styleUrls: ['./player-hand.component.scss'],
    standalone: true,
    imports: [TranslocoDirective, NgIf, EmojiPickerComponent]
})
export class PlayerHandComponent {
  @Input() playerState?: PlayerState;
  @Input() playerId?: string;
  @Input() deck?: Deck;

  displayCardValue = displayCardValue;
  showEmojiPicker = false;

  constructor(private currentGameService: CurrentGameService) {}

  onMouseEnter(): void {
    if (this.playerState) {
      this.showEmojiPicker = true;
    }
  }

  onMouseLeave(): void {
    // Don't close picker on card mouse leave
    // Picker will close when mouse leaves the picker itself
  }

  onEmojiSelected(emoji: string): void {
    // Don't close picker after selection
    if (!this.playerId) return;

    // Send emoji throw event to backend
    this.currentGameService.throwEmoji(this.playerId, emoji);
  }

  onPickerRequestClose(): void {
    this.showEmojiPicker = false;
  }
}
