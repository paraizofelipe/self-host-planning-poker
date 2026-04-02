import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'shpp-emoji-picker',
  templateUrl: './emoji-picker.component.html',
  styleUrls: ['./emoji-picker.component.scss'],
  standalone: true,
  imports: [NgFor]
})
export class EmojiPickerComponent {
  @Output() emojiSelected = new EventEmitter<string>();
  @Output() requestClose = new EventEmitter<void>();

  emojis = ['👍', '👎', '💩', '💸', '🚀', '🎉', '🧻', '🌵', '✈️', '🧨', '🪓'];

  selectEmoji(emoji: string): void {
    this.emojiSelected.emit(emoji);
    // Don't close picker after selection
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.requestClose.emit();
  }
}
