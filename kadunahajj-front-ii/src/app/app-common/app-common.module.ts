import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../elements/loader/loader.component';
import { SortDirective } from '../common/directives/sort.directive';
import { FilterPipe } from '../common/pipes/filter.pipe';
import { DragAndDropDirective } from '../common/directives/drag-and-drop.directive';
import { NumbersOnlyDirective } from '../common/directives/numbers-only.directive';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  declarations: [
    LoaderComponent,
    SortDirective,
    FilterPipe,
    DragAndDropDirective,
    NumbersOnlyDirective
  ],
  imports: [
    CommonModule,
    NgSelectModule
  ],
  exports: [
    LoaderComponent,
    SortDirective,
    FilterPipe,
    DragAndDropDirective,
    NumbersOnlyDirective,
    NgSelectModule
  ]
})
export class AppCommonModule { }
