import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { UserComponent } from './user.component';

@NgModule({
  declarations: [UserComponent],
  imports: [BrowserModule],
  bootstrap: [UserComponent],
})
export class AppModule {}
