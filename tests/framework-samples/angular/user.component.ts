import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

@Component({
  selector: 'app-user',
  template: '<div>{{ userName }}</div>',
})
export class UserComponent implements OnInit {
  @Input() userName: string = '';
  @Output() userSelected = new EventEmitter<string>();

  ngOnInit(): void {
    console.log('UserComponent initialized');
  }

  selectUser(): void {
    this.userSelected.emit(this.userName);
  }
}
